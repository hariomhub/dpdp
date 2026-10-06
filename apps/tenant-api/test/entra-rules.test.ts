import { describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  PROTECTED_ROLES, REMOVAL_MIN_COUNT, assessRemovals, decideForMember, isMappableRole, isProtectedRole,
} from '../src/modules/entra/entra-sync-rules'
import { createLoginSession, openLoginSession } from '../src/modules/entra/entra-state'
import { createHash } from 'crypto'

const user = (o: Partial<{ role: string; status: string; deactivatedReason: string | null; syncedGroupId: string | null }> = {}) =>
  ({ role: 'IT_ADMIN', status: 'ACTIVE', deactivatedReason: null, syncedGroupId: null, ...o })

describe('which roles a directory group may grant', () => {
  it('CEO and Compliance Officer are protected and cannot be mapped', () => {
    expect(PROTECTED_ROLES).toEqual(['CEO', 'CO'])
    expect(isProtectedRole('CEO')).toBe(true)
    expect(isProtectedRole('CO')).toBe(true)
    expect(isMappableRole('CEO')).toBe(false)
    expect(isMappableRole('CO')).toBe(false)
    for (const r of ['IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR']) expect(isMappableRole(r)).toBe(true)
  })
})

describe('decideForMember', () => {
  it('creates someone who has no portal account', () => {
    expect(decideForMember(undefined, 'm1')).toEqual({ kind: 'create' })
  })

  it('never touches a CEO or Compliance Officer, whatever their status', () => {
    expect(decideForMember(user({ role: 'CEO' }), 'm1')).toEqual({ kind: 'skip', reason: 'protected-role' })
    expect(decideForMember(user({ role: 'CO', status: 'INACTIVE' }), 'm1')).toEqual({ kind: 'skip', reason: 'protected-role' })
  })

  it('does not re-enable a user an administrator switched off, or one whose reason is unknown', () => {
    expect(decideForMember(user({ status: 'INACTIVE', deactivatedReason: 'ADMIN' }), 'm1')).toEqual({ kind: 'skip', reason: 'deactivated-by-admin' })
    expect(decideForMember(user({ status: 'INACTIVE', deactivatedReason: null }), 'm1')).toEqual({ kind: 'skip', reason: 'deactivated-by-admin' })
  })

  it('re-enables a user that sync itself switched off (they rejoined the group)', () => {
    expect(decideForMember(user({ status: 'INACTIVE', deactivatedReason: 'ENTRA_SYNC', syncedGroupId: 'm1' }), 'm1'))
      .toEqual({ kind: 'update', reactivate: true, applyRole: true })
  })

  it('applies the group role to an unclaimed or own-group user, but not to one managed by another group', () => {
    expect(decideForMember(user({ syncedGroupId: null }), 'm1')).toEqual({ kind: 'update', reactivate: false, applyRole: true })
    expect(decideForMember(user({ syncedGroupId: 'm1' }), 'm1')).toEqual({ kind: 'update', reactivate: false, applyRole: true })
    expect(decideForMember(user({ syncedGroupId: 'other' }), 'm1')).toEqual({ kind: 'update', reactivate: false, applyRole: false })
  })

  it('an invited-but-not-yet-active user is activated', () => {
    expect(decideForMember(user({ status: 'PENDING_INVITE' }), 'm1')).toEqual({ kind: 'update', reactivate: true, applyRole: true })
  })
})

describe('assessRemovals: stop a sync that would remove too many people', () => {
  const base = { confirmed: false, membersSeen: 20 }

  it('nothing to remove, or already confirmed: allowed', () => {
    expect(assessRemovals({ ...base, toDeactivate: 0, activeManaged: 20 }).allowed).toBe(true)
    expect(assessRemovals({ ...base, toDeactivate: 15, activeManaged: 20, confirmed: true }).allowed).toBe(true)
  })

  it('a few removals out of many: allowed', () => {
    expect(assessRemovals({ ...base, toDeactivate: 2, activeManaged: 20 }).allowed).toBe(true)
    expect(assessRemovals({ ...base, toDeactivate: 6, activeManaged: 20 }).allowed).toBe(true)  // exactly 30%
  })

  it('more than 30% and at least 3 people: needs confirmation', () => {
    const v = assessRemovals({ ...base, toDeactivate: 7, activeManaged: 20 })
    expect(v.allowed).toBe(false)
    expect((v as any).message).toMatch(/7 of 20/)
  })

  it('a small team is not blocked for removing one or two people', () => {
    expect(REMOVAL_MIN_COUNT).toBe(3)
    expect(assessRemovals({ ...base, membersSeen: 1, toDeactivate: 1, activeManaged: 2 }).allowed).toBe(true)
    expect(assessRemovals({ ...base, membersSeen: 1, toDeactivate: 2, activeManaged: 3 }).allowed).toBe(true)
  })

  it('an empty directory answer is always suspicious, even for a small team', () => {
    const v = assessRemovals({ confirmed: false, membersSeen: 0, toDeactivate: 1, activeManaged: 1 })
    expect(v.allowed).toBe(false)
    expect((v as any).message).toMatch(/returned no members/)
  })
})

describe('Microsoft sign-in state (login CSRF + PKCE)', () => {
  it('a session round-trips: same nonce, same tenant, and a verifier that matches the challenge', () => {
    const s = createLoginSession('tenant-1')
    const opened = openLoginSession(s.state, s.nonce)
    expect(opened.tenantId).toBe('tenant-1')
    const challenge = createHash('sha256').update(opened.codeVerifier).digest('base64url')
    expect(challenge).toBe(s.codeChallenge)
  })

  it('refuses a different nonce (a sign-in started in another browser)', () => {
    const a = createLoginSession('t'); const b = createLoginSession('t')
    expect(() => openLoginSession(a.state, b.nonce)).toThrow(/expired or is not valid/)
    expect(() => openLoginSession(a.state, '')).toThrow(/expired or is not valid/)
  })

  it('refuses a forged or tampered state, and an expired one', () => {
    const s = createLoginSession('t')
    expect(() => openLoginSession(s.state + 'x', s.nonce)).toThrow()
    expect(() => openLoginSession('not-a-jwt', s.nonce)).toThrow()
    const forged = jwt.sign({ type: 'entra-state', tid: 't', v: 'x', nh: 'y' }, 'some-other-secret')
    expect(() => openLoginSession(forged, s.nonce)).toThrow()
    const expired = jwt.sign({ type: 'entra-state', tid: 't', v: 'x', nh: 'y' }, process.env.JWT_SECRET!, { expiresIn: -10 })
    expect(() => openLoginSession(expired, s.nonce)).toThrow()
  })

  it('does not accept a different kind of signed token as sign-in state', () => {
    const s = createLoginSession('t')
    const refresh = jwt.sign({ userId: 'u', tenantId: 't', role: 'CEO', type: 'refresh' }, process.env.JWT_SECRET!)
    expect(() => openLoginSession(refresh, s.nonce)).toThrow()
  })

  it('the verifier is not readable from the state token', () => {
    const s = createLoginSession('t')
    const payload = JSON.parse(Buffer.from(s.state.split('.')[1], 'base64url').toString())
    const verifier = openLoginSession(s.state, s.nonce).codeVerifier
    expect(JSON.stringify(payload)).not.toContain(verifier)
  })
})
