/**
 * The rules of directory (Entra) sync, kept as pure functions so they are exercised by unit tests and read in one place.
 *
 * Principles (agreed with the product owner, in line with common identity-governance practice):
 *  1. The people who run the organisation - the CEO and Compliance Officers - are never created, re-roled, deactivated
 *     or locked out by a directory sync. A group can therefore not be mapped to those roles; they are invited by hand.
 *  2. An administrator's decision beats the directory: a user an administrator deactivated stays deactivated.
 *     Sync only re-enables accounts that sync itself switched off.
 *  3. A sync that would remove an unusually large part of the team (a wrong or emptied group, a directory outage that
 *     returned nothing) is stopped and needs an explicit confirmation - removals are the hard-to-undo direction.
 */

/** Never touched by sync. */
export const PROTECTED_ROLES: readonly string[] = ['CEO', 'CO']

/** The roles a directory group may be mapped to. */
export const MAPPABLE_ROLES: readonly string[] = ['IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR']

export const isProtectedRole = (role: string): boolean => PROTECTED_ROLES.includes(role)
export const isMappableRole = (role: string): boolean => MAPPABLE_ROLES.includes(role)

export interface ExistingUser {
  role: string
  status: string
  deactivatedReason: string | null
  syncedGroupId: string | null
}

export type MemberDecision =
  | { kind: 'create' }
  | { kind: 'skip'; reason: 'protected-role' | 'deactivated-by-admin' }
  | { kind: 'update'; reactivate: boolean; applyRole: boolean }

/**
 * What to do with one directory group member.
 * `existing` is the portal user with the same email (undefined if there is none).
 */
export function decideForMember(existing: ExistingUser | undefined, mappingId: string): MemberDecision {
  if (!existing) return { kind: 'create' }
  if (isProtectedRole(existing.role)) return { kind: 'skip', reason: 'protected-role' }

  if (existing.status === 'INACTIVE' && existing.deactivatedReason !== 'ENTRA_SYNC') {
    // An administrator switched this account off (or we cannot tell who did): do not undo it.
    return { kind: 'skip', reason: 'deactivated-by-admin' }
  }

  // A person already managed by a different group keeps that group's role (first mapping wins); someone nobody has
  // claimed yet is claimed by this one.
  const applyRole = existing.syncedGroupId === null || existing.syncedGroupId === mappingId
  return { kind: 'update', reactivate: existing.status !== 'ACTIVE', applyRole }
}

export interface RemovalInput {
  /** accounts this sync would deactivate */
  toDeactivate: number
  /** accounts currently managed by sync and active */
  activeManaged: number
  /** directory members found across all mapped groups */
  membersSeen: number
  confirmed: boolean
}

export type RemovalVerdict = { allowed: true } | { allowed: false; message: string }

/** Largest share of directory-managed accounts one sync may switch off without confirmation (and the minimum count). */
export const REMOVAL_SHARE_LIMIT = 0.3
export const REMOVAL_MIN_COUNT = 3

export function assessRemovals(i: RemovalInput): RemovalVerdict {
  if (i.toDeactivate === 0 || i.confirmed) return { allowed: true }

  if (i.membersSeen === 0) {
    return {
      allowed: false,
      message: `The mapped directory groups returned no members, so this sync would deactivate all ${i.toDeactivate} directory-managed user(s). ` +
        'That usually means a wrong group or a directory problem. Confirm only if you really want everyone removed.',
    }
  }
  if (i.toDeactivate >= REMOVAL_MIN_COUNT && i.toDeactivate / Math.max(i.activeManaged, 1) > REMOVAL_SHARE_LIMIT) {
    return {
      allowed: false,
      message: `This sync would deactivate ${i.toDeactivate} of ${i.activeManaged} directory-managed user(s). ` +
        'Check the group mappings and confirm to continue.',
    }
  }
  return { allowed: true }
}

/** A sync lease older than this is treated as abandoned (the process that held it died). */
export const SYNC_LEASE_MS = 15 * 60 * 1000
