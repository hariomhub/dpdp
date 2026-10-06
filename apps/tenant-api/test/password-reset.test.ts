import { describe, expect, it } from 'vitest'
import { passwordSchema } from '../src/modules/auth/password-policy'
import {
  generateResetToken, hashResetToken, issuedBeforePasswordChange, RESET_MIN_INTERVAL_MS, RESET_TOKEN_TTL_MS,
} from '../src/modules/auth/reset-token'

describe('reset tokens', () => {
  it('are long, URL-safe and unique', () => {
    const a = generateResetToken()
    const b = generateResetToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(43) // 32 random bytes, base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('are stored only as a SHA-256 hash that does not reveal the token', () => {
    const t = generateResetToken()
    const h = hashResetToken(t)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(h).not.toContain(t)
    expect(hashResetToken(t)).toBe(h) // deterministic, so the link can be looked up
    expect(hashResetToken(t + 'x')).not.toBe(h)
  })

  it('live for an hour; at most one link a minute per person', () => {
    expect(RESET_TOKEN_TTL_MS).toBe(3_600_000)
    expect(RESET_MIN_INTERVAL_MS).toBe(60_000)
  })
})

describe('issuedBeforePasswordChange (sessions ended by a reset)', () => {
  const changedAt = new Date('2026-10-05T10:00:00.500Z')
  const sec = (d: string) => Math.floor(new Date(d).getTime() / 1000)

  it('never ends a session when the password was never changed', () => {
    expect(issuedBeforePasswordChange(sec('2020-01-01T00:00:00Z'), null)).toBe(false)
  })

  it('ends a session issued before the change', () => {
    expect(issuedBeforePasswordChange(sec('2026-10-05T09:59:59Z'), changedAt)).toBe(true)
  })

  it('keeps a session issued after the change', () => {
    expect(issuedBeforePasswordChange(sec('2026-10-05T10:00:01Z'), changedAt)).toBe(false)
  })

  it('does not reject a session minted in the same second as the change (signing in right after resetting)', () => {
    expect(issuedBeforePasswordChange(sec('2026-10-05T10:00:00Z'), changedAt)).toBe(false)
  })

  it('treats a token with no issue time as older', () => {
    expect(issuedBeforePasswordChange(undefined, changedAt)).toBe(true)
  })
})

describe('password policy', () => {
  it.each(['Abcdef1!', 'Str0ng#Pass', 'N1yam$aathi'])('accepts %s', (p) => {
    expect(passwordSchema.safeParse(p).success).toBe(true)
  })
  it.each([
    ['short', 'Ab1!'],
    ['no uppercase', 'abcdefg1!'],
    ['no number', 'Abcdefgh!'],
    ['no special character', 'Abcdefg12'],
  ])('rejects %s', (_label, p) => {
    expect(passwordSchema.safeParse(p).success).toBe(false)
  })
})
