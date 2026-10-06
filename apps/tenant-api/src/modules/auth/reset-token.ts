import { createHash, randomBytes } from 'crypto'

/** A reset link is valid for one hour. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

/** Do not issue another reset link to the same person more often than this (stops mailbox flooding). */
export const RESET_MIN_INTERVAL_MS = 60 * 1000

/** 256 bits of randomness, URL-safe. This value exists only in the emailed link. */
export function generateResetToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Only this hash is stored, so a database leak does not yield usable reset links. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Was this session (a JWT with an `iat` in seconds) issued before the password was last changed?
 * Compared at second precision: a token minted in the same second as the reset - i.e. by signing in right after it -
 * must not be rejected for a few hundred milliseconds of rounding.
 */
export function issuedBeforePasswordChange(iatSeconds: number | undefined, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false
  if (iatSeconds === undefined) return true // a token with no issue time cannot be proven newer than the change
  return iatSeconds < Math.floor(passwordChangedAt.getTime() / 1000)
}
