import { getTenantPrisma } from '@dpdp/database'
import { TtlCache } from './ttl-cache'
import { issuedBeforePasswordChange } from '../modules/auth/reset-token'

/**
 * Is this signed-in person still allowed in, and with which role?
 *
 * An access token is valid for 15 minutes and carries the role it was issued with. Without a check, a person who was
 * deactivated - or demoted from CO to a lower role - kept their old access until the token expired. The check below
 * reads the person's CURRENT status, role and password-change time (cached for a short time, so it is not a database
 * hit on every request) and the database is treated as the truth: a role change or deactivation takes effect within
 * USER_ACCESS_TTL_MS everywhere, and immediately on the instance that made the change.
 */
export const USER_ACCESS_TTL_MS = 30_000

export interface UserAccess {
  tenantId: string
  status: string
  role: string
  passwordChangedAt: Date | null
}

const cache = new TtlCache<UserAccess | null>(async (userId) => {
  const u = await getTenantPrisma().user.findUnique({
    where: { id: userId },
    select: { tenantId: true, status: true, role: true, passwordChangedAt: true },
  })
  return u ? { tenantId: u.tenantId, status: u.status, role: u.role, passwordChangedAt: u.passwordChangedAt } : null
}, USER_ACCESS_TTL_MS)

export type SessionVerdict =
  | { ok: true; role: string }
  | { ok: false; status: 401; message: string }

/** Pure decision, so the rules are unit-tested without a database. */
export function evaluateSession(
  token: { userId: string; tenantId: string; role: string; iat?: number },
  access: UserAccess | null,
): SessionVerdict {
  // 401 (not 403) on purpose: the portal's client answers a 401 by trying to refresh and then signing the person out.
  if (!access || access.tenantId !== token.tenantId) return { ok: false, status: 401, message: 'Your session is no longer valid. Please sign in again.' }
  if (access.status !== 'ACTIVE') return { ok: false, status: 401, message: 'Your account is not active.' }
  if (issuedBeforePasswordChange(token.iat, access.passwordChangedAt)) {
    return { ok: false, status: 401, message: 'Your password was changed. Please sign in again.' }
  }
  return { ok: true, role: access.role }
}

/**
 * Look the person up (cached). Returns `undefined` when the lookup itself failed: the caller then falls back to the
 * token - a brief database hiccup must not sign everybody out - and the failure is logged.
 */
export async function getUserAccess(userId: string): Promise<UserAccess | null | undefined> {
  try {
    return await cache.get(userId)
  } catch (err) {
    console.error('user access lookup failed; falling back to the token', err)
    return undefined
  }
}

/** Forget what is cached about one person (or everyone) - call right after changing their role or status. */
export function invalidateUserAccess(userId?: string): void {
  cache.invalidate(userId)
}
