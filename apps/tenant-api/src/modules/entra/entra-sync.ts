import { TenantAuditAction } from '@prisma/tenant-client'
import type { getTenantPrisma } from '@dpdp/database'
import { HttpError } from '../../utils/http-error'
import { logTenantAction } from '../../utils/audit-logger'
import { invalidateUserAccess } from '../../utils/user-access'
import { deactivateWithinTransaction } from '../users/deactivation'
import { releaseWorkingTasks } from '../users/task-handover'
import {
  PROTECTED_ROLES, SYNC_LEASE_MS, assessRemovals, decideForMember, isMappableRole,
} from './entra-sync-rules'

type TenantDb = ReturnType<typeof getTenantPrisma>

export interface DirectoryMember { id: string; email: string; displayName?: string | null }
export interface SyncMapping { id: string; entraGroupId: string; entraGroupName: string; role: string; departmentId: string | null }

export interface SyncDeps {
  db: TenantDb
  /** Members of one directory group (all pages). A failure here aborts the sync before anything is written. */
  fetchMembers(mapping: SyncMapping): Promise<DirectoryMember[]>
  now?: () => Date
}

export interface SyncReport {
  synced: number
  created: number
  updated: number
  reactivated: number
  deactivated: number
  /** CEO / Compliance Officer accounts left untouched */
  skippedProtected: number
  /** accounts an administrator deactivated, left deactivated */
  skippedDeactivatedByAdmin: number
  /** mappings ignored because their role cannot be granted by a directory group */
  skippedMappings: string[]
  /** members whose changes failed (the rest of the sync still ran) */
  failed: Array<{ email: string; error: string }>
}

const shortError = (e: any): string => String(e?.message ?? e).split('\n')[0].slice(0, 200)

/**
 * Pull group members from the directory and bring the portal's users in line - under the rules in entra-sync-rules.ts.
 * Order matters: everything is READ first (directory, existing users), the removals are judged, and only then is
 * anything written - so a directory failure or a refused removal leaves the portal exactly as it was.
 */
export async function runDirectorySync(
  deps: SyncDeps,
  params: { tenantId: string; userId: string; confirmRemovals?: boolean },
): Promise<SyncReport> {
  const { db } = deps
  const { tenantId, userId } = params
  const now = (deps.now ?? (() => new Date()))()

  // One sync at a time per organisation (two clicks, two replicas). The lease is a column, so it works on any database.
  const lease = await db.entraConfig.updateMany({
    where: { tenantId, OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: new Date(now.getTime() - SYNC_LEASE_MS) } }] },
    data: { syncStartedAt: now },
  })
  if (lease.count !== 1) throw HttpError.conflict('A directory sync is already running. Wait a few minutes and try again.')

  try {
    return await sync(deps, params, now)
  } finally {
    await db.entraConfig.updateMany({ where: { tenantId }, data: { syncStartedAt: null } }).catch(e => console.error('could not release the sync lease', e))
  }
}

async function sync(deps: SyncDeps, params: { tenantId: string; userId: string; confirmRemovals?: boolean }, now: Date): Promise<SyncReport> {
  const { db } = deps
  const { tenantId, userId } = params

  const report: SyncReport = {
    synced: 0, created: 0, updated: 0, reactivated: 0, deactivated: 0,
    skippedProtected: 0, skippedDeactivatedByAdmin: 0, skippedMappings: [], failed: [],
  }

  const allMappings = await db.entraGroupMapping.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
  if (allMappings.length === 0) throw new Error('No group mappings configured. Set up group mappings first.')

  // A mapping to a role a directory group may not grant (e.g. one saved before this rule existed) is ignored, loudly.
  const mappings: SyncMapping[] = []
  for (const m of allMappings) {
    if (isMappableRole(m.role)) mappings.push({ id: m.id, entraGroupId: m.entraGroupId, entraGroupName: m.entraGroupName, role: m.role, departmentId: m.departmentId })
    else report.skippedMappings.push(`${m.entraGroupName} (${m.role})`)
  }

  // ── 1. READ the directory. First mapping wins when a person is in several groups. ───────────────────────────────
  const planned: Array<{ member: DirectoryMember; email: string; mapping: SyncMapping }> = []
  const seenEmails = new Set<string>()
  for (const mapping of mappings) {
    for (const member of await deps.fetchMembers(mapping)) {
      const email = (member.email || '').trim().toLowerCase()
      if (!email || !member.id || seenEmails.has(email)) continue
      seenEmails.add(email)
      planned.push({ member, email, mapping })
    }
  }

  // ── 2. READ the portal's matching users (by directory id first, so an e-mail change cannot create a duplicate). ──
  const existing = planned.length === 0 ? [] : await db.user.findMany({
    where: { tenantId, OR: [{ email: { in: planned.map(p => p.email), mode: 'insensitive' } }, { entraObjectId: { in: planned.map(p => p.member.id) } }] },
  })
  const byOid = new Map(existing.filter(u => u.entraObjectId).map(u => [u.entraObjectId as string, u]))
  const byEmail = new Map(existing.map(u => [u.email.toLowerCase(), u]))
  const matched = (p: { member: DirectoryMember; email: string }) => byOid.get(p.member.id) ?? byEmail.get(p.email)

  // ── 3. JUDGE the removals before writing anything. ──────────────────────────────────────────────────────────────
  const seenUserIds = new Set(planned.map(p => matched(p)?.id).filter((id): id is string => !!id))
  const managed = await db.user.findMany({
    where: { tenantId, source: 'ENTRA_ID', status: 'ACTIVE', role: { notIn: [...PROTECTED_ROLES] as any } },
    select: { id: true, email: true },
  })
  const toDeactivate = managed.filter(u => !seenUserIds.has(u.id))

  const verdict = assessRemovals({
    toDeactivate: toDeactivate.length, activeManaged: managed.length, membersSeen: planned.length, confirmed: !!params.confirmRemovals,
  })
  if (!verdict.allowed) {
    await logTenantAction({
      tenantId, userId, action: TenantAuditAction.ENTRA_SYNC_REFUSED, targetType: 'entra_sync',
      details: { wouldDeactivate: toDeactivate.length, activeManaged: managed.length, membersSeen: planned.length },
    })
    throw HttpError.conflict(verdict.message, {
      requiresConfirmation: true, wouldDeactivate: toDeactivate.length, activeManaged: managed.length,
    })
  }

  // ── 4. WRITE: create / update members. One transaction per person: a person is either fully applied or not at all. ─
  for (const p of planned) {
    const user = matched(p)
    const decision = decideForMember(user && { role: user.role, status: user.status, deactivatedReason: user.deactivatedReason, syncedGroupId: user.syncedGroupId }, p.mapping.id)
    report.synced++

    if (decision.kind === 'skip') {
      if (decision.reason === 'protected-role') report.skippedProtected++
      else report.skippedDeactivatedByAdmin++
      continue
    }

    try {
      if (decision.kind === 'create') {
        await db.$transaction(async tx => {
          const created = await tx.user.create({
            data: {
              tenantId, name: p.member.displayName || p.email.split('@')[0], email: p.email,
              entraObjectId: p.member.id, role: p.mapping.role as any, status: 'ACTIVE', source: 'ENTRA_ID',
              syncedGroupId: p.mapping.id, joinedAt: now,
            },
          })
          await placeInDepartment(tx, tenantId, created.id, p.mapping)
        })
        report.created++
      } else if (user) {
        await db.$transaction(async tx => {
          await tx.user.update({
            where: { id: user.id },
            data: {
              entraObjectId: p.member.id, source: 'ENTRA_ID', status: 'ACTIVE', deactivatedReason: null,
              syncedGroupId: user.syncedGroupId ?? p.mapping.id,
              ...(decision.applyRole ? { role: p.mapping.role as any } : {}),
            },
          })
          if (decision.applyRole) {
            // The group owns this person's role and department placement: reset the old ones, apply the mapping's.
            if (user.role === 'IT_ADMIN') await tx.department.updateMany({ where: { tenantId, assignedItAdminId: user.id }, data: { assignedItAdminId: null } })
            if (user.role === 'INTERNAL_AUDITOR') await tx.department.updateMany({ where: { tenantId, assignedAuditorId: user.id }, data: { assignedAuditorId: null } })
            if (user.role === 'IT_ADMIN' && p.mapping.role !== 'IT_ADMIN') {
              await releaseWorkingTasks(tx as any, tenantId, user.id, 'role changed by directory group', userId)
            }
            await tx.departmentUser.deleteMany({ where: { userId: user.id } })
            await placeInDepartment(tx, tenantId, user.id, p.mapping)
          }
        })
        report.updated++
        if (decision.reactivate) report.reactivated++
        invalidateUserAccess(user.id)
      }
    } catch (err) {
      report.failed.push({ email: p.email, error: shortError(err) })
    }
  }

  // ── 5. WRITE: switch off people who left every mapped group (never CEO / CO; never anyone an admin manages). ──────
  for (const u of toDeactivate) {
    try {
      await db.$transaction(tx => deactivateWithinTransaction(tx as any, tenantId, u.id, 'ENTRA_SYNC', userId))
      invalidateUserAccess(u.id)
      report.deactivated++
    } catch (err) {
      report.failed.push({ email: u.email, error: shortError(err) })
    }
  }

  await db.entraConfig.update({ where: { tenantId }, data: { lastSyncAt: now } })
  await logTenantAction({
    tenantId, userId, action: TenantAuditAction.ENTRA_SYNC_COMPLETED, targetType: 'entra_sync',
    details: { ...report, failed: report.failed.length } as any,
  })

  return report
}

/** Put a person in the mapping's department and, for the first IT Admin / Auditor there, make them its primary. */
async function placeInDepartment(
  tx: Parameters<Parameters<TenantDb['$transaction']>[0]>[0],
  tenantId: string,
  userId: string,
  mapping: SyncMapping,
): Promise<void> {
  if (!mapping.departmentId) return
  await tx.departmentUser.create({ data: { userId, departmentId: mapping.departmentId } })
  if (mapping.role === 'IT_ADMIN') {
    await tx.department.updateMany({ where: { id: mapping.departmentId, tenantId, assignedItAdminId: null }, data: { assignedItAdminId: userId } })
  }
  if (mapping.role === 'INTERNAL_AUDITOR') {
    await tx.department.updateMany({ where: { id: mapping.departmentId, tenantId, assignedAuditorId: null }, data: { assignedAuditorId: userId } })
  }
}
