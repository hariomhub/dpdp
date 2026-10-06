/**
 * What a licence permits right now.
 *
 *   UNLICENSED  no usable licence has ever been installed (or it is not valid yet): nothing works except installing one
 *               (a customer who was never licensed has nothing at stake, so this is a hard gate)
 *   ACTIVE      within the licence term
 *   GRACE       term over, still fully working for `graceDays` (a warning is shown) - time to renew
 *   RESTRICTED  read-only: nobody can create or change anything, but every user can still sign in, look at everything
 *               and export. Renewal works. Data is never locked away.
 *
 * Pure function of the stored facts and the clock, so it is identical on every deployment variant and easy to test.
 */
export type LicenceState = 'UNLICENSED' | 'ACTIVE' | 'GRACE' | 'RESTRICTED'

export type RestrictionReason = 'expired' | 'revoked' | 'clock' | 'invalid'

export interface LicenceFacts {
  validFrom: Date
  validUntil: Date
  graceDays: number
  revokedAt?: Date | null
  /** the latest time this instance has ever observed (monotonic): used to notice a clock wound back to dodge expiry */
  lastSeenAt?: Date | null
}

export interface LicenceStatus {
  state: LicenceState
  reason?: RestrictionReason | 'not-yet-valid' | 'none'
  validUntil?: Date
  /** end of the grace period (state GRACE ends here) */
  graceUntil?: Date
  /** whole days left in the term (ACTIVE) or in the grace period (GRACE); undefined otherwise */
  daysLeft?: number
}

const DAY = 24 * 60 * 60 * 1000

/** A clock that is further behind the latest observed time than this is treated as tampered with. */
export const CLOCK_TOLERANCE_MS = 24 * 60 * 60 * 1000

export function evaluateLicence(facts: LicenceFacts | null | undefined, now: Date): LicenceStatus {
  if (!facts) return { state: 'UNLICENSED', reason: 'none' }

  const graceUntil = new Date(facts.validUntil.getTime() + facts.graceDays * DAY)
  const base = { validUntil: facts.validUntil, graceUntil }

  if (facts.revokedAt && facts.revokedAt <= now) return { state: 'RESTRICTED', reason: 'revoked', ...base }
  if (facts.lastSeenAt && now.getTime() < facts.lastSeenAt.getTime() - CLOCK_TOLERANCE_MS) return { state: 'RESTRICTED', reason: 'clock', ...base }
  if (now < facts.validFrom) return { state: 'UNLICENSED', reason: 'not-yet-valid', ...base }

  if (now <= facts.validUntil) return { state: 'ACTIVE', ...base, daysLeft: Math.ceil((facts.validUntil.getTime() - now.getTime()) / DAY) }
  if (now <= graceUntil) return { state: 'GRACE', reason: 'expired', ...base, daysLeft: Math.ceil((graceUntil.getTime() - now.getTime()) / DAY) }
  return { state: 'RESTRICTED', reason: 'expired', ...base }
}

/** ACTIVE and GRACE are fully functional; everything else is read-only (or, UNLICENSED, activation only). */
export const isFullyFunctional = (s: LicenceState): boolean => s === 'ACTIVE' || s === 'GRACE'
