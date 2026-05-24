import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { config } from '../../config'
import { logTenantAction } from '../../utils/audit-logger'
import { TenantAuditAction, TenantRole } from '@prisma/tenant-client'

const tenantDb = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

function generateTokens(userId: string, tenantId: string, role: string) {
  const accessToken = jwt.sign(
    { userId, tenantId, role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  )
  const refreshToken = jwt.sign(
    { userId, tenantId, role, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  )
  return { accessToken, refreshToken }
}

export const authService = {
  async verifyInvite(token: string) {
    // CEO invite lives in super-admin DB
    const tenant = await superAdminDb.tenant.findFirst({
      where: { inviteToken: token, inviteAcceptedAt: null },
    })

    if (!tenant) {
      // Team member invite lives in tenant DB
      const invite = await tenantDb.userInvitation.findUnique({ where: { token } })
      if (!invite) throw new Error('Invalid or expired invitation link')
      if (invite.acceptedAt) throw new Error('This invitation has already been accepted')
      if (new Date() > invite.expiresAt) throw new Error('Invitation link has expired')

      return {
        type:          'team_member' as const,
        email:         invite.email,
        role:          invite.role,
        tenantId:      invite.tenantId,
        inviteId:      invite.id,
        departmentIds: invite.departmentIds ?? [],
      }
    }

    if (tenant.inviteExpiresAt && new Date() > tenant.inviteExpiresAt) {
      throw new Error('Invitation link has expired')
    }

    return {
      type:       'ceo' as const,
      email:      tenant.ceoEmail,
      name:       tenant.ceoName,
      orgName:    tenant.name,
      tenantId:   tenant.id,
      tenantCode: tenant.tenantCode,
    }
  },

  async setPassword(params: {
    token: string; password: string; name?: string; ipAddress?: string
  }) {
    const inviteInfo    = await authService.verifyInvite(params.token)
    const passwordHash  = await bcrypt.hash(params.password, 12)

    if (inviteInfo.type === 'ceo') {
      const existingUser = await tenantDb.user.findFirst({
        where: { tenantId: inviteInfo.tenantId, email: inviteInfo.email },
      })
      if (existingUser) throw new Error('Account already exists for this email')

      const user = await tenantDb.user.create({
        data: {
          tenantId:     inviteInfo.tenantId,
          name:         inviteInfo.name || params.name || 'CEO',
          email:        inviteInfo.email,
          passwordHash,
          role:         TenantRole.CEO,
          status:       'ACTIVE',
          source:       'MANUAL',
          joinedAt:     new Date(),
        },
      })

      await superAdminDb.tenant.update({
        where: { id: inviteInfo.tenantId },
        data:  { inviteAcceptedAt: new Date(), inviteToken: null },
      })

      await logTenantAction({
        tenantId:   inviteInfo.tenantId,
        userId:     user.id,
        role:       user.role,
        action:     TenantAuditAction.USER_ACTIVATED,
        targetType: 'user',
        targetId:   user.id,
        targetName: user.name,
        ipAddress:  params.ipAddress,
      })

      return {
        ...generateTokens(user.id, inviteInfo.tenantId, user.role),
        user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: inviteInfo.tenantId },
        isFirstLogin: true,
      }

    } else {
      // ── Team member ─────────────────────────────────────────────────────
      const existingUser = await tenantDb.user.findFirst({
        where: { tenantId: inviteInfo.tenantId, email: inviteInfo.email },
      })
      if (existingUser) throw new Error('Account already exists for this email')

      const user = await tenantDb.user.create({
        data: {
          tenantId:     inviteInfo.tenantId,
          name:         params.name || inviteInfo.email.split('@')[0],
          email:        inviteInfo.email,
          passwordHash,
          role:         inviteInfo.role,
          status:       'ACTIVE',
          source:       'MANUAL',
          joinedAt:     new Date(),
        },
      })

      // ── Apply department assignments from the invitation ─────────────────
      const deptIds = inviteInfo.departmentIds ?? []
      if (deptIds.length > 0) {
        // Validate depts belong to this tenant
        const validDepts = await tenantDb.department.findMany({
          where: { tenantId: inviteInfo.tenantId, id: { in: deptIds } },
          select: { id: true },
        })
        const validIds = validDepts.map(d => d.id)

        if (validIds.length > 0) {
          await tenantDb.departmentUser.createMany({
            data: validIds.map(departmentId => ({ userId: user.id, departmentId })),
            skipDuplicates: true,
          })

          // Auto-set as primary if no primary exists yet
          if (user.role === TenantRole.IT_ADMIN) {
            await tenantDb.department.updateMany({
              where: { tenantId: inviteInfo.tenantId, id: { in: validIds }, assignedItAdminId: null },
              data:  { assignedItAdminId: user.id },
            })
          }
          if (user.role === TenantRole.INTERNAL_AUDITOR) {
            await tenantDb.department.updateMany({
              where: { tenantId: inviteInfo.tenantId, id: { in: validIds }, assignedAuditorId: null },
              data:  { assignedAuditorId: user.id },
            })
          }
        }
      }

      await tenantDb.userInvitation.update({
        where: { id: inviteInfo.inviteId },
        data:  { acceptedAt: new Date() },
      })

      // Apply default LMS designation for this portal role
      const roleDefault = await tenantDb.roleDesignationDefault.findUnique({
        where: { tenantId_portalRole: { tenantId: inviteInfo.tenantId, portalRole: user.role } },
      })
      if (roleDefault?.designation) {
        await tenantDb.user.update({
          where: { id: user.id },
          data:  { lmsDesignation: roleDefault.designation },
        })
      }

      await logTenantAction({
        tenantId:   inviteInfo.tenantId,
        userId:     user.id,
        role:       user.role,
        action:     TenantAuditAction.USER_ACTIVATED,
        targetType: 'user',
        targetId:   user.id,
        targetName: user.name,
        ipAddress:  params.ipAddress,
      })

      return {
        ...generateTokens(user.id, inviteInfo.tenantId, user.role),
        user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: inviteInfo.tenantId },
        isFirstLogin: false,
      }
    }
  },

  async login(params: { email: string; password: string; tenantId: string; ipAddress?: string }) {
    const user = await tenantDb.user.findFirst({
      where: { email: params.email, tenantId: params.tenantId, status: 'ACTIVE' },
    })
    if (!user || !user.passwordHash) throw new Error('Invalid credentials')

    const isValid = await bcrypt.compare(params.password, user.passwordHash)
    if (!isValid) throw new Error('Invalid credentials')

    await tenantDb.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    await logTenantAction({
      tenantId:   params.tenantId,
      userId:     user.id,
      role:       user.role,
      action:     TenantAuditAction.USER_LOGIN,
      targetType: 'user',
      targetId:   user.id,
      targetName: user.name,
      ipAddress:  params.ipAddress,
    })

    return {
      ...generateTokens(user.id, params.tenantId, user.role),
      user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: params.tenantId },
    }
  },

  async loginWithTenantCode(params: { email: string; password: string; tenantCode: string; ipAddress?: string }) {
    const tenant = await superAdminDb.tenant.findUnique({ where: { tenantCode: params.tenantCode } })
    if (!tenant) throw new Error('Organization not found')
    if (tenant.status === 'SUSPENDED') throw new Error('Your organization account has been suspended')
    return authService.login({ email: params.email, password: params.password, tenantId: tenant.id, ipAddress: params.ipAddress })
  },

  async loginByEmail(params: { email: string; password: string; ipAddress?: string }) {
    const user = await tenantDb.user.findFirst({ where: { email: params.email, status: 'ACTIVE' } })
    if (!user) throw new Error('Invalid credentials')
    const tenant = await superAdminDb.tenant.findUnique({ where: { id: user.tenantId } })
    if (!tenant || tenant.status === 'SUSPENDED') throw new Error('Organization not found or suspended')
    return authService.login({ email: params.email, password: params.password, tenantId: user.tenantId, ipAddress: params.ipAddress })
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any
      if (decoded.type !== 'refresh') throw new Error('Invalid token')
      const user = await tenantDb.user.findUnique({ where: { id: decoded.userId } })
      if (!user || user.status !== 'ACTIVE') throw new Error('User not found')
      const accessToken = jwt.sign(
        { userId: user.id, tenantId: decoded.tenantId, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      )
      return { accessToken }
    } catch {
      throw new Error('Invalid refresh token')
    }
  },

  async getMe(userId: string, tenantId: string) {
    const user = await tenantDb.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, joinedAt: true, source: true },
    })
    if (!user) throw new Error('User not found')

    const tenant = await superAdminDb.tenant.findUnique({
      where:  { id: tenantId },
      select: { id: true, name: true, tenantCode: true, plan: true, status: true, classification: true },
    })
    return { user, tenant }
  },
}