import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import { getTenantPrisma } from '@dpdp/database'
import { config } from '../../config'

/**
 * Signing out. A refresh token is a signed token that stays valid for days, so "log out" used to be only the browser
 * forgetting it: anyone who had copied the token could keep minting access tokens. Now a signed-out refresh token is
 * recorded (as a hash - the token itself is never stored) and refused from then on. Rows are removed once the token
 * would have expired anyway, so the table stays small.
 *
 * Other ways a session ends need no record: deactivation and role changes are read live (utils/user-access.ts) and a
 * password reset invalidates everything issued before it (passwordChangedAt).
 */

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function isRefreshTokenRevoked(token: string): Promise<boolean> {
  const row = await getTenantPrisma().revokedRefreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    select: { tokenHash: true },
  })
  return !!row
}

/**
 * Revoke the refresh token the caller presents. Only the owner's own token is accepted; a token that is already
 * expired or does not verify is ignored (there is nothing left to revoke) - signing out never fails for that reason.
 */
export async function revokeRefreshToken(userId: string, token: string | undefined): Promise<boolean> {
  if (!token) return false
  let decoded: { userId?: string; type?: string; exp?: number }
  try {
    decoded = jwt.verify(token, config.jwt.secret) as typeof decoded
  } catch {
    return false
  }
  if (decoded.type !== 'refresh' || decoded.userId !== userId || !decoded.exp) return false

  const db = getTenantPrisma()
  await db.revokedRefreshToken.upsert({
    where: { tokenHash: hashRefreshToken(token) },
    update: {},
    create: { tokenHash: hashRefreshToken(token), userId, expiresAt: new Date(decoded.exp * 1000) },
  })

  // Housekeeping: entries for tokens that have expired by now can never be presented successfully again.
  await db.revokedRefreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })
  return true
}
