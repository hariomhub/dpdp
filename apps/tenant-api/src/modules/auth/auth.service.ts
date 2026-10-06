import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getTenantPrisma } from '@dpdp/database'
import { config } from '../../config'
import { logTenantAction } from '../../utils/audit-logger'
import { issuedBeforePasswordChange } from './reset-token'
import { isRefreshTokenRevoked, revokeRefreshToken } from './sessions'
import { generateTokens as signTokens, signAccessToken } from '../../utils/tokens'
import { lmsService } from '../lms/lms.service'
import { TenantAuditAction, TenantRole } from '@prisma/tenant-client'

const tenantDb = getTenantPrisma()

function generateTokens(userId: string, tenantId: string, role: string) {
  return signTokens({ userId, tenantId, role })
}

export const authService = {
  async verifyInvite(token: string) {
    // The first CEO's invitation is on the organisation record (created when the instance was activated)
    const tenant = await tenantDb.tenantProfile.findFirst({
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

      await tenantDb.tenantProfile.update({
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

      // Apply default LMS designation for this portal role and auto-enroll in
      // its mandatory courses — same helper the CO's manual designation-assign
      // flow uses, so new hires don't have to be separately re-enrolled.
      await lmsService.applyDefaultDesignation(inviteInfo.tenantId, user.id, user.role)
      // Independent axis: portal-role-targeted courses (e.g. "how to use this
      // portal as an Internal Auditor"), regardless of the designation above.
      await lmsService.applyPortalRoleEnrollment(inviteInfo.tenantId, user.id, user.role)

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
    const tenant = await tenantDb.tenantProfile.findUnique({ where: { tenantCode: params.tenantCode } })
    if (!tenant) throw new Error('Organization not found')
    return authService.login({ email: params.email, password: params.password, tenantId: tenant.id, ipAddress: params.ipAddress })
  },

  async loginByEmail(params: { email: string; password: string; ipAddress?: string }) {
    const user = await tenantDb.user.findFirst({ where: { email: params.email, status: 'ACTIVE' } })
    if (!user) throw new Error('Invalid credentials')
    const tenant = await tenantDb.tenantProfile.findUnique({ where: { id: user.tenantId }, select: { id: true } })
    if (!tenant) throw new Error('Organization not found')
    return authService.login({ email: params.email, password: params.password, tenantId: user.tenantId, ipAddress: params.ipAddress })
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any
      if (decoded.type !== 'refresh') throw new Error('Invalid token')
      // Signed out on purpose (this device): the token is no longer accepted even though it has not expired.
      if (await isRefreshTokenRevoked(refreshToken)) throw new Error('Session ended')
      const user = await tenantDb.user.findUnique({ where: { id: decoded.userId } })
      if (!user || user.status !== 'ACTIVE') throw new Error('User not found')
      if (user.tenantId !== decoded.tenantId) throw new Error('Invalid token')
      // A password reset ends every session that existed before it.
      if (issuedBeforePasswordChange(decoded.iat, user.passwordChangedAt)) throw new Error('Session ended by a password change')
      const accessToken = signAccessToken({ userId: user.id, tenantId: decoded.tenantId, role: user.role })
      return { accessToken }
    } catch {
      throw new Error('Invalid refresh token')
    }
  },

  /** Sign out this device: the refresh token it holds stops working. */
  async logout(params: { userId: string; tenantId: string; role?: string; refreshToken?: string; ipAddress?: string }) {
    const revoked = await revokeRefreshToken(params.userId, params.refreshToken)
    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId, role: params.role,
      action: TenantAuditAction.USER_LOGOUT,
      targetType: 'user', targetId: params.userId,
      ipAddress: params.ipAddress,
      details: { sessionRevoked: revoked },
    })
    return { revoked }
  },

  async getMe(userId: string, tenantId: string) {
    const user = await tenantDb.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, role: true, status: true, lastLoginAt: true, joinedAt: true, source: true },
    })
    if (!user) throw new Error('User not found')

    const tenant = await tenantDb.tenantProfile.findUnique({
      where:  { id: tenantId },
      select: { id: true, name: true, tenantCode: true, plan: true, status: true, classification: true },
    })
    return { user, tenant }
  },
}