import bcrypt from 'bcryptjs'
import { getTenantPrisma } from '@dpdp/database'
import { getOrgSummary } from '../../platform/tenant-profile'
import { TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { sendPasswordResetEmail } from '../../utils/email'
import { HttpError } from '../../utils/http-error'
import { generateResetToken, hashResetToken, RESET_MIN_INTERVAL_MS, RESET_TOKEN_TTL_MS } from './reset-token'

const db = getTenantPrisma()

const INVALID_LINK = 'This reset link is invalid or has expired. Request a new one.'

export const passwordResetService = {
  /**
   * Email a reset link to every active, password-based account with this address.
   *
   * Deliberately says nothing about whether the address is known: callers always show the same message and run this in the
   * background, so neither the response nor its timing reveals which emails have accounts.
   */
  async request(email: string, ipAddress?: string): Promise<void> {
    const users = await db.user.findMany({
      where: { email: { equals: email.trim(), mode: 'insensitive' }, status: 'ACTIVE', passwordHash: { not: null } },
    })

    for (const user of users) {
      // Not more than one link a minute per person, so this cannot be used to flood someone's inbox.
      const recent = await db.passwordResetToken.findFirst({
        where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_MIN_INTERVAL_MS) } },
      })
      if (recent) continue

      const token = generateResetToken()
      await db.$transaction([
        // an older, unused link stops working as soon as a newer one is issued
        db.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
        db.passwordResetToken.create({
          data: {
            userId: user.id, tenantId: user.tenantId, tokenHash: hashResetToken(token),
            expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS), requestedIp: ipAddress ?? null,
          },
        }),
      ])

      await logTenantAction({
        tenantId: user.tenantId, userId: user.id, role: user.role,
        action: TenantAuditAction.PASSWORD_RESET_REQUESTED, targetType: 'user', targetId: user.id, targetName: user.name,
        ipAddress,
      })

      const org = await getOrgSummary(user.tenantId)
      try {
        await sendPasswordResetEmail({ toEmail: user.email, toName: user.name, orgName: org?.name ?? '', resetToken: token })
      } catch (err) {
        // The link exists but could not be mailed (SMTP down / not configured). Log it; the user can simply request another.
        console.error(`[password-reset] email failed for user ${user.id}:`, err)
      }
    }
  },

  /** Set a new password from a reset link. The link is single-use and ends every older session for the account. */
  async reset(params: { token: string; password: string; ipAddress?: string }): Promise<void> {
    const row = await db.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(params.token) },
      include: { user: true },
    })
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now() || row.user.status !== 'ACTIVE') {
      throw HttpError.badRequest(INVALID_LINK)
    }

    const passwordHash = await bcrypt.hash(params.password, 12)
    const now = new Date()

    await db.$transaction(async (tx) => {
      // Claim the link atomically: if two requests race, only one gets to change the password.
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } })
      if (claimed.count !== 1) throw HttpError.badRequest(INVALID_LINK)

      await tx.user.update({ where: { id: row.userId }, data: { passwordHash, passwordChangedAt: now } })
      // any other outstanding links for this account are void too
      await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } })
    })

    await logTenantAction({
      tenantId: row.tenantId, userId: row.userId, role: row.user.role,
      action: TenantAuditAction.PASSWORD_RESET_COMPLETED, targetType: 'user', targetId: row.userId, targetName: row.user.name,
      ipAddress: params.ipAddress,
    })
  },
}
