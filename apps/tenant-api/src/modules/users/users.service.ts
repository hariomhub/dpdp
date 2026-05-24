import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TenantRole, TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { sendTeamInviteEmail } from '../../utils/email'

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function relativeTime(date: Date | null): string {
  if (!date) return 'Never'
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

const ROLE_LABEL: Record<string, string> = {
  CEO:               'Organization CEO',
  CO:                'Compliance Officer',
  IT_ADMIN:          'IT Admin',
  INTERNAL_AUDITOR:  'Internal Auditor',
  EXTERNAL_AUDITOR:  'External Auditor',
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const usersService = {

  // ── List all users ──────────────────────────────────────────────────────────
  async listUsers(tenantId: string) {
    const users = await db.user.findMany({
      where: { tenantId },
      orderBy: [{ status: 'asc' }, { role: 'asc' }, { name: 'asc' }],
      include: {
        departments: {
          include: { department: { select: { id: true, name: true } } },
        },
      },
    })

    return users.map(u => ({
      id:           u.id,
      name:         u.name,
      email:        u.email,
      initials:     getInitials(u.name),
      role:         u.role,
      roleLabel:    ROLE_LABEL[u.role] ?? u.role,
      status:       u.status,
      source:       u.source,
      entraObjectId: u.entraObjectId,
      lastLoginAt:  relativeTime(u.lastLoginAt),
      joinedAt:       u.joinedAt?.toISOString() ?? null,
      lmsDesignation: u.lmsDesignation ?? null,
      departments:    u.departments.map(d => ({
        id:   d.department.id,
        name: d.department.name,
      })),
    }))
  },

  // ── List pending invitations ────────────────────────────────────────────────
  async listInvitations(tenantId: string) {
    const now = new Date()
    const invitations = await db.userInvitation.findMany({
      where:   { tenantId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { invitedBy: { select: { name: true } } },
    })

    return invitations.map(inv => {
      const expiresInMs    = inv.expiresAt.getTime() - now.getTime()
      const expiresInHours = Math.round(expiresInMs / 3_600_000)
      return {
        id:           inv.id,
        email:        inv.email,
        role:         inv.role,
        roleLabel:    ROLE_LABEL[inv.role] ?? inv.role,
        note:         inv.note,
        createdAt:    inv.createdAt.toISOString(),
        expiresAt:    inv.expiresAt.toISOString(),
        expired:      expiresInMs <= 0,
        expiresInHours,
        invitedBy:    inv.invitedBy?.name ?? null,
      }
    })
  },

  // ── Invite a new user ───────────────────────────────────────────────────────
  async inviteUser(params: {
    tenantId:     string
    actorId:      string
    email:        string
    role:         TenantRole
    departmentIds?: string[]
    note?:        string
  }) {
    const email = params.email.trim().toLowerCase()

    // Guard: already an active user
    const existing = await db.user.findFirst({
      where: { tenantId: params.tenantId, email, status: { not: 'INACTIVE' } },
    })
    if (existing) throw new Error('A user with this email already exists')

    // Guard: active invite already exists
    const activeInvite = await db.userInvitation.findFirst({
      where: {
        tenantId:   params.tenantId,
        email,
        acceptedAt: null,
        expiresAt:  { gt: new Date() },
      },
    })
    if (activeInvite) throw new Error('An active invitation already exists for this email')

    // Fetch org name + inviter name for email
    const [tenant, inviter] = await Promise.all([
      superAdminDb.tenant.findUnique({
        where:  { id: params.tenantId },
        select: { name: true },
      }),
      db.user.findUnique({
        where:  { id: params.actorId },
        select: { name: true },
      }),
    ])
    if (!tenant) throw new Error('Organization not found')

    const INVITE_EXPIRY_HOURS = 48
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3_600_000)

    const invitation = await db.userInvitation.create({
      data: {
        tenantId:      params.tenantId,
        email,
        role:          params.role,
        note:          params.note?.trim() ?? null,
        departmentIds: params.departmentIds ?? [],
        expiresAt,
        invitedById:   params.actorId,
      },
    })

    // Send email (non-blocking)
    sendTeamInviteEmail({
      toEmail:     email,
      toName:      email.split('@')[0],
      orgName:     tenant.name,
      inviterName: inviter?.name ?? 'Your Admin',
      role:        ROLE_LABEL[params.role] ?? params.role,
      inviteToken: invitation.token,
    }).catch(err => console.error('[users/invite] Email error:', err))

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_INVITED,
      targetType: 'user_invitation',
      targetId:   invitation.id,
      targetName: email,
      details:    { role: params.role, departmentIds: params.departmentIds ?? [] },
    })

    return invitation
  },

  // ── Resend an invitation ────────────────────────────────────────────────────
  async resendInvitation(params: {
    tenantId:     string
    actorId:      string
    invitationId: string
  }) {
    const inv = await db.userInvitation.findFirst({
      where: { id: params.invitationId, tenantId: params.tenantId, acceptedAt: null },
    })
    if (!inv) throw new Error('Invitation not found')

    // Extend expiry by 48h from now
    const newExpiry = new Date(Date.now() + 48 * 3_600_000)
    const updated = await db.userInvitation.update({
      where: { id: params.invitationId },
      data:  { expiresAt: newExpiry },
    })

    const [tenant, inviter] = await Promise.all([
      superAdminDb.tenant.findUnique({
        where: { id: params.tenantId }, select: { name: true },
      }),
      db.user.findUnique({
        where: { id: params.actorId }, select: { name: true },
      }),
    ])

    sendTeamInviteEmail({
      toEmail:     inv.email,
      toName:      inv.email.split('@')[0],
      orgName:     tenant?.name ?? 'Your Organization',
      inviterName: inviter?.name ?? 'Your Admin',
      role:        ROLE_LABEL[inv.role] ?? inv.role,
      inviteToken: updated.token,
    }).catch(err => console.error('[users/resend] Email error:', err))

    return updated
  },

  // ── Cancel an invitation ────────────────────────────────────────────────────
  async cancelInvitation(params: {
    tenantId:     string
    actorId:      string
    invitationId: string
  }) {
    const inv = await db.userInvitation.findFirst({
      where: { id: params.invitationId, tenantId: params.tenantId, acceptedAt: null },
    })
    if (!inv) throw new Error('Invitation not found or already accepted')

    await db.userInvitation.delete({ where: { id: params.invitationId } })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_DEACTIVATED,
      targetType: 'user_invitation',
      targetId:   params.invitationId,
      targetName: inv.email,
      details:    { action: 'invitation_cancelled' },
    })

    return { success: true }
  },

  // ── Change a user's role ────────────────────────────────────────────────────
  async updateUserRole(params: {
    tenantId:     string
    actorId:      string
    targetUserId: string
    newRole:      TenantRole
  }) {
    if (params.actorId === params.targetUserId) {
      throw new Error('You cannot change your own role')
    }
    // CEO role cannot be reassigned via this endpoint (set at org creation only)
    if (params.newRole === TenantRole.CEO) {
      throw new Error('CEO role cannot be assigned via user management')
    }

    const [actor, target] = await Promise.all([
      db.user.findFirst({ where: { tenantId: params.tenantId, id: params.actorId } }),
      db.user.findFirst({ where: { tenantId: params.tenantId, id: params.targetUserId } }),
    ])
    if (!target) throw new Error('User not found')
    if (target.role === TenantRole.CEO) {
      throw new Error("The organization CEO's role cannot be changed")
    }

    // CO cannot promote/change to CO (only CEO can do that)
    if (actor?.role === TenantRole.CO && params.newRole === TenantRole.CO) {
      throw new Error('Compliance Officers cannot assign the CO role — only the CEO can')
    }

    const oldRole = target.role

    await db.$transaction(async tx => {
      await tx.user.update({
        where: { id: params.targetUserId },
        data:  { role: params.newRole },
      })

      // If role changed away from IT_ADMIN or INTERNAL_AUDITOR,
      // clean up their department assignments
      if (
        (oldRole === TenantRole.IT_ADMIN || oldRole === TenantRole.INTERNAL_AUDITOR) &&
        params.newRole !== oldRole
      ) {
        await tx.departmentUser.deleteMany({ where: { userId: params.targetUserId } })

        if (oldRole === TenantRole.IT_ADMIN) {
          await tx.department.updateMany({
            where: { tenantId: params.tenantId, assignedItAdminId: params.targetUserId },
            data:  { assignedItAdminId: null },
          })
        }
        if (oldRole === TenantRole.INTERNAL_AUDITOR) {
          await tx.department.updateMany({
            where: { tenantId: params.tenantId, assignedAuditorId: params.targetUserId },
            data:  { assignedAuditorId: null },
          })
        }
      }
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_ACTIVATED,
      targetType: 'user',
      targetId:   params.targetUserId,
      targetName: target.name,
      details:    { oldRole, newRole: params.newRole },
    })

    return { success: true, oldRole, newRole: params.newRole }
  },

  // ── Deactivate a user ───────────────────────────────────────────────────────
  async deactivateUser(params: {
    tenantId:     string
    actorId:      string
    targetUserId: string
  }) {
    if (params.actorId === params.targetUserId) {
      throw new Error('You cannot deactivate yourself')
    }

    const target = await db.user.findFirst({
      where: { tenantId: params.tenantId, id: params.targetUserId },
    })
    if (!target)                        throw new Error('User not found')
    if (target.role === TenantRole.CEO) throw new Error('The organization CEO cannot be deactivated')
    if (target.status === 'INACTIVE')   throw new Error('User is already inactive')

    await db.$transaction(async tx => {
      // Set user inactive
      await tx.user.update({
        where: { id: params.targetUserId },
        data:  { status: 'INACTIVE' },
      })

      // Unassign all open tasks → reset to PENDING
      await tx.complianceTask.updateMany({
        where: {
          tenantId:     params.tenantId,
          assignedToId: params.targetUserId,
          status:       { notIn: ['COMPLIANT', 'REJECTED'] },
        },
        data: { assignedToId: null, status: 'PENDING' },
      })

      // Clear as department primary IT Admin
      await tx.department.updateMany({
        where: { tenantId: params.tenantId, assignedItAdminId: params.targetUserId },
        data:  { assignedItAdminId: null },
      })

      // Clear as department primary IA
      await tx.department.updateMany({
        where: { tenantId: params.tenantId, assignedAuditorId: params.targetUserId },
        data:  { assignedAuditorId: null },
      })

      // Remove department memberships
      await tx.departmentUser.deleteMany({ where: { userId: params.targetUserId } })
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_DEACTIVATED,
      targetType: 'user',
      targetId:   params.targetUserId,
      targetName: target.name,
    })

    return { success: true }
  },

  // ── Reactivate a user ───────────────────────────────────────────────────────
  async reactivateUser(params: {
    tenantId:     string
    actorId:      string
    targetUserId: string
  }) {
    const target = await db.user.findFirst({
      where: { tenantId: params.tenantId, id: params.targetUserId },
    })
    if (!target)                      throw new Error('User not found')
    if (target.status !== 'INACTIVE') throw new Error('User is not inactive')

    await db.user.update({
      where: { id: params.targetUserId },
      data:  { status: 'ACTIVE' },
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_ACTIVATED,
      targetType: 'user',
      targetId:   params.targetUserId,
      targetName: target.name,
      details:    { reactivated: true },
    })

    return { success: true }
  },

  // ── Update user department assignments ──────────────────────────────────────
  async updateUserDepartments(params: {
    tenantId:      string
    actorId:       string
    targetUserId:  string
    departmentIds: string[]
  }) {
    const target = await db.user.findFirst({
      where: { tenantId: params.tenantId, id: params.targetUserId },
      include: {
        departments: { select: { departmentId: true } },
      },
    })
    if (!target) throw new Error('User not found')

    if (![TenantRole.IT_ADMIN, TenantRole.INTERNAL_AUDITOR].includes(target.role as any)) {
      throw new Error('Department assignment only applies to IT Admins and Internal Auditors')
    }

    // Validate dept IDs
    if (params.departmentIds.length > 0) {
      const found = await db.department.count({
        where: { tenantId: params.tenantId, id: { in: params.departmentIds } },
      })
      if (found !== params.departmentIds.length) {
        throw new Error('One or more departments not found')
      }
    }

    const currentDeptIds = target.departments.map(d => d.departmentId)
    const addedDeptIds   = params.departmentIds.filter(id => !currentDeptIds.includes(id))
    const removedDeptIds = currentDeptIds.filter(id => !params.departmentIds.includes(id))

    await db.$transaction(async tx => {
      // Remove old memberships
      await tx.departmentUser.deleteMany({ where: { userId: params.targetUserId } })

      // Add new memberships
      if (params.departmentIds.length > 0) {
        await tx.departmentUser.createMany({
          data: params.departmentIds.map(deptId => ({
            userId:       params.targetUserId,
            departmentId: deptId,
          })),
        })
      }

      // For removed depts: clear primary designation if this user held it
      for (const deptId of removedDeptIds) {
        if (target.role === TenantRole.IT_ADMIN) {
          await tx.department.updateMany({
            where: { id: deptId, assignedItAdminId: params.targetUserId },
            data:  { assignedItAdminId: null },
          })
        }
        if (target.role === TenantRole.INTERNAL_AUDITOR) {
          await tx.department.updateMany({
            where: { id: deptId, assignedAuditorId: params.targetUserId },
            data:  { assignedAuditorId: null },
          })
        }
      }

      // For newly added depts: auto-set as primary if no primary exists
      for (const deptId of addedDeptIds) {
        if (target.role === TenantRole.IT_ADMIN) {
          await tx.department.updateMany({
            where: { id: deptId, assignedItAdminId: null },
            data:  { assignedItAdminId: params.targetUserId },
          })
        }
        if (target.role === TenantRole.INTERNAL_AUDITOR) {
          await tx.department.updateMany({
            where: { id: deptId, assignedAuditorId: null },
            data:  { assignedAuditorId: params.targetUserId },
          })
        }
      }
    })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     params.actorId,
      action:     TenantAuditAction.USER_ACTIVATED,
      targetType: 'user',
      targetId:   params.targetUserId,
      targetName: target.name,
      details:    { departmentIds: params.departmentIds },
    })

    return { success: true, departmentIds: params.departmentIds }
  },
}