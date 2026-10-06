import { Readable } from 'stream'
import { StorageNotFoundError, contentTypeForName } from '@dpdp/storage'
import { getTenantPrisma } from '@dpdp/database'
import { getMasterEvidence } from '../../library/controls'
import { TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { HttpError } from '../../utils/http-error'
import { evidenceStoreFor, masterEvidenceStoreFor, resolveStoredRef, StoredRef } from '../../storage/stores'
import { canViewTaskFile } from './files.authz'
import { FileKind, signFileToken, verifyFileToken } from './file-token'

const db      = getTenantPrisma()

interface Viewer {
  tenantId: string
  userId: string
  role: string
  ipAddress?: string
}

interface ResolvedFile {
  ref: StoredRef
  fileName: string
  contentType: string
  inline: boolean
  /** for the audit trail */
  audit?: { targetType: string; targetId: string; details: Record<string, unknown> }
}

function describeType(name: string, storedType?: string | null) {
  const derived = contentTypeForName(name)
  return { contentType: storedType || derived.contentType, inline: derived.inline }
}

/** Find the file a (kind, id[, version]) reference points at, enforcing tenant + role access. */
async function resolve(viewer: Viewer, kind: FileKind, id: string, versionId?: string): Promise<ResolvedFile> {
  if (kind === 'evidence') {
    const ev = await db.evidence.findFirst({
      where:   { id, tenantId: viewer.tenantId, deletedAt: null },
      include: { task: { select: { id: true, assignedToId: true } } },
    })
    if (!ev) throw HttpError.notFound('Evidence not found')
    if (!canViewTaskFile(viewer, { assignedToId: ev.task.assignedToId, submittedById: ev.submittedById })) {
      throw HttpError.forbidden('You do not have access to this evidence file.')
    }

    let src: { storageKey: string | null; storageProvider: string | null; fileUrl: string | null; fileName: string | null; contentType: string | null } = ev
    if (versionId) {
      const ver = await db.evidenceVersion.findFirst({ where: { id: versionId, evidenceId: ev.id } })
      if (!ver) throw HttpError.notFound('Evidence version not found')
      src = ver
    }
    const ref = resolveStoredRef(src)
    if (!ref) throw HttpError.notFound('This evidence has no file attached.')
    const name = src.fileName || 'evidence'
    return {
      ref, fileName: name, ...describeType(name, src.contentType),
      audit: { targetType: 'evidence', targetId: ev.id, details: { taskId: ev.taskId, versionId: versionId ?? null } },
    }
  }

  if (kind === 'gap') {
    const f = await db.gapFindingFile.findFirst({
      where:   { id, gapFinding: { tenantId: viewer.tenantId } },
      include: { gapFinding: { select: { taskId: true, task: { select: { assignedToId: true } } } } },
    })
    if (!f) throw HttpError.notFound('File not found')
    if (!canViewTaskFile(viewer, { assignedToId: f.gapFinding.task.assignedToId })) {
      throw HttpError.forbidden('You do not have access to this file.')
    }
    const ref = resolveStoredRef(f)
    if (!ref) throw HttpError.notFound('File unavailable')
    return {
      ref, fileName: f.fileName, ...describeType(f.fileName, f.contentType),
      audit: { targetType: 'gap_finding_file', targetId: f.id, details: { taskId: f.gapFinding.taskId } },
    }
  }

  // Vendor sample evidence: platform content shown to every signed-in user of the tenant.
  const me = await getMasterEvidence(id)
  if (!me || !me.fileUrl) throw HttpError.notFound('Sample file not found')
  const legacy = me.fileUrl.startsWith('/uploads/')
  const ref: StoredRef = {
    provider: me.storageProvider || 'local',
    key: legacy ? me.fileUrl.slice('/uploads/'.length) : me.fileUrl,
  }
  const name = me.fileName || 'sample'
  return { ref, fileName: name, ...describeType(name) }
}

async function openStream(kind: FileKind, ref: StoredRef) {
  const store = kind === 'master' ? masterEvidenceStoreFor(ref.provider) : evidenceStoreFor(ref.provider)
  try {
    return await store.get(ref.key)
  } catch (err) {
    if (err instanceof StorageNotFoundError) throw HttpError.notFound('This file is unavailable.')
    throw err
  }
}

export const filesService = {
  /**
   * Authorise, audit, and hand back a short-lived token for one file. The browser then calls
   * GET /files/dl/:token, so a plain link/new tab works even though the login token is not in a cookie.
   */
  async createLink(viewer: Viewer, kind: FileKind, id: string, opts: { versionId?: string; download?: boolean } = {}) {
    const file = await resolve(viewer, kind, id, opts.versionId)

    // Make sure the object really exists before issuing a link, so users get an immediate, clear error.
    const store = kind === 'master' ? masterEvidenceStoreFor(file.ref.provider) : evidenceStoreFor(file.ref.provider)
    if (!(await store.exists(file.ref.key))) throw HttpError.notFound('This file is unavailable.')

    if (file.audit) {
      await logTenantAction({
        tenantId: viewer.tenantId, userId: viewer.userId, role: viewer.role,
        action: TenantAuditAction.EVIDENCE_VIEWED,
        targetType: file.audit.targetType, targetId: file.audit.targetId, targetName: file.fileName,
        details: { ...file.audit.details, mode: opts.download ? 'download' : 'view' },
        ipAddress: viewer.ipAddress,
      })
    }

    const token = signFileToken({ k: kind, id, v: opts.versionId, uid: viewer.userId, tid: viewer.tenantId, dl: !!opts.download })
    return { token, fileName: file.fileName, inline: file.inline && !opts.download }
  },

  /** Redeem a token: re-resolve + re-authorise (never trust the token for the storage key), then stream the bytes. */
  async open(token: string, ipAddress?: string) {
    const c = verifyFileToken(token)
    // The role is re-read, so a user deactivated or demoted since the link was issued loses access.
    const user = await db.user.findFirst({ where: { id: c.uid, tenantId: c.tid, status: 'ACTIVE' }, select: { role: true } })
    if (!user) throw HttpError.unauthorized('This file link is no longer valid.')

    const file = await resolve({ tenantId: c.tid, userId: c.uid, role: user.role, ipAddress }, c.k, c.id, c.v)
    const got = await openStream(c.k, file.ref)
    const inline = file.inline && !c.dl
    return { stream: got.stream as Readable, size: got.size, fileName: file.fileName, contentType: file.contentType, inline }
  },
}
