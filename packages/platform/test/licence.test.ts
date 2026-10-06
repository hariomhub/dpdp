import { describe, expect, it } from 'vitest'
import {
  CLOCK_TOLERANCE_MS, LicenceError, LicencePayload, evaluateLicence, generateSigningKeyPair, isFullyFunctional,
  loadTrustKeys, signLicence, verifyLicence,
} from '../src'

const DAY = 86_400_000
const now = new Date('2026-10-06T12:00:00Z')
const sec = (d: Date) => Math.floor(d.getTime() / 1000)

const payload = (o: Partial<LicencePayload> = {}): LicencePayload => ({
  v: 1, lid: 'lic-1', iss: 'test', iat: sec(now),
  org: {
    id: 'org-1', code: 'ACME-1', name: 'Acme', industry: 'Fintech', orgSize: '51-200', address: 'Pune', country: 'India', contactEmail: 'a@acme.test',
    dpoName: 'Dee', dpoEmail: 'dpo@acme.test', classification: 'Data Fiduciary', classUncertain: false, ceoName: 'Cee', ceoEmail: 'ceo@acme.test',
  },
  plan: 'PROFESSIONAL', limits: { maxUsers: 25, maxAssessments: 10, storageGb: 50 },
  entitlements: { regulations: '*', features: [] },
  validFrom: sec(new Date(now.getTime() - DAY)), validUntil: sec(new Date(now.getTime() + 365 * DAY)), updatesUntil: sec(new Date(now.getTime() + 365 * DAY)),
  graceDays: 30, airGapped: false, ...o,
})

describe('signed licence', () => {
  const keys = generateSigningKeyPair()
  const trust = [{ kid: 'k1', publicKey: keys.publicKeyPem }]

  it('a licence signed by a trusted key verifies and returns exactly what was issued', () => {
    const token = signLicence(payload(), keys.privateKeyPem, 'k1')
    expect(verifyLicence(token, trust)).toEqual(payload())
  })

  it('any change to the licence invalidates it (a customer cannot extend their own term)', () => {
    const [h, p, s] = signLicence(payload(), keys.privateKeyPem, 'k1').split('.')
    const forged = Buffer.from(JSON.stringify(payload({ validUntil: sec(new Date(now.getTime() + 3650 * DAY)) }))).toString('base64url')
    expect(() => verifyLicence(`${h}.${forged}.${s}`, trust)).toThrowError(expect.objectContaining({ code: 'BAD_SIGNATURE' }))
    expect(() => verifyLicence(`${h}.${p}.${s.slice(0, -4)}AAAA`, trust)).toThrowError(expect.objectContaining({ code: 'BAD_SIGNATURE' }))
  })

  it('a licence signed by a key we do not trust is refused, even if it is well-formed', () => {
    const other = generateSigningKeyPair()
    const token = signLicence(payload(), other.privateKeyPem, 'k1')                 // claims to be k1, signed by someone else
    expect(() => verifyLicence(token, trust)).toThrowError(expect.objectContaining({ code: 'BAD_SIGNATURE' }))
    const unknownKid = signLicence(payload(), other.privateKeyPem, 'k-unknown')
    expect(() => verifyLicence(unknownKid, trust)).toThrowError(expect.objectContaining({ code: 'UNKNOWN_KEY' }))
    expect(() => verifyLicence(signLicence(payload(), keys.privateKeyPem, 'k1'), [])).toThrowError(expect.objectContaining({ code: 'UNKNOWN_KEY' }))
  })

  it('garbage and incomplete licences are refused with a plain error', () => {
    for (const bad of ['', 'abc', 'a.b', 'a.b.c', 'a.b.c.d']) {
      expect(() => verifyLicence(bad, trust)).toThrow(LicenceError)
    }
    const incomplete = signLicence({ ...payload(), lid: '' } as LicencePayload, keys.privateKeyPem, 'k1')
    expect(() => verifyLicence(incomplete, trust)).toThrowError(expect.objectContaining({ code: 'MALFORMED' }))
    const future = signLicence({ ...payload(), v: 2 as any }, keys.privateKeyPem, 'k1')
    expect(() => verifyLicence(future, trust)).toThrowError(expect.objectContaining({ code: 'UNSUPPORTED' }))
  })

  it('tolerates whitespace around a pasted licence', () => {
    expect(verifyLicence(`\n  ${signLicence(payload(), keys.privateKeyPem, 'k1')}  \r\n`, trust).lid).toBe('lic-1')
  })
})

describe('licence state', () => {
  const facts = (o: object = {}) => ({
    validFrom: new Date(now.getTime() - DAY), validUntil: new Date(now.getTime() + 10 * DAY), graceDays: 30, ...o,
  })

  it('no licence: unlicensed', () => {
    expect(evaluateLicence(null, now).state).toBe('UNLICENSED')
  })

  it('within the term: active, counting the days left', () => {
    expect(evaluateLicence(facts(), now)).toMatchObject({ state: 'ACTIVE', daysLeft: 10 })
  })

  it('after the term: grace (fully working, with a countdown), then read-only', () => {
    const expired = facts({ validUntil: new Date(now.getTime() - 5 * DAY) })
    expect(evaluateLicence(expired, now)).toMatchObject({ state: 'GRACE', reason: 'expired', daysLeft: 25 })
    const longGone = facts({ validUntil: new Date(now.getTime() - 31 * DAY) })
    expect(evaluateLicence(longGone, now)).toMatchObject({ state: 'RESTRICTED', reason: 'expired' })
  })

  it('air-gapped sites get their longer grace period as issued', () => {
    const f = facts({ validUntil: new Date(now.getTime() - 45 * DAY), graceDays: 60 })
    expect(evaluateLicence(f, now).state).toBe('GRACE')
  })

  it('not valid yet: unlicensed; revoked: read-only', () => {
    expect(evaluateLicence(facts({ validFrom: new Date(now.getTime() + DAY) }), now)).toMatchObject({ state: 'UNLICENSED', reason: 'not-yet-valid' })
    expect(evaluateLicence(facts({ revokedAt: new Date(now.getTime() - 1000) }), now)).toMatchObject({ state: 'RESTRICTED', reason: 'revoked' })
  })

  it('a clock wound back to dodge expiry is noticed (read-only until a fresh licence is installed)', () => {
    const lastSeen = new Date(now.getTime() + 20 * DAY)         // this instance has already seen a later date
    expect(evaluateLicence(facts({ lastSeenAt: lastSeen }), now)).toMatchObject({ state: 'RESTRICTED', reason: 'clock' })
    // an ordinary small skew is fine
    expect(evaluateLicence(facts({ lastSeenAt: new Date(now.getTime() + CLOCK_TOLERANCE_MS - 1000) }), now).state).toBe('ACTIVE')
  })

  it('only active and grace are fully functional', () => {
    expect(['ACTIVE', 'GRACE', 'RESTRICTED', 'UNLICENSED'].map(s => isFullyFunctional(s as any))).toEqual([true, true, false, false])
  })
})

describe('which keys an instance trusts', () => {
  const key = (kid: string) => ({ kid, publicKey: 'KEY' })

  it('outside production, extra keys from the environment are added', () => {
    const keys = loadTrustKeys({ NODE_ENV: 'development', PLATFORM_TRUST_KEYS: JSON.stringify([key('dev')]) } as any)
    expect(keys.map(k => k.kid)).toContain('dev')
  })

  it('in production, an operator cannot add a trusted key by changing a setting', () => {
    const env = { NODE_ENV: 'production', PLATFORM_TRUST_KEYS: JSON.stringify([key('mine')]) } as any
    expect(loadTrustKeys(env).map(k => k.kid)).not.toContain('mine')
    expect(loadTrustKeys({ ...env, ALLOW_CUSTOM_TRUST_KEYS: 'true' }).map(k => k.kid)).toContain('mine')   // explicit and logged by config validation
  })

  it('a malformed list adds nothing and does not throw', () => {
    expect(() => loadTrustKeys({ NODE_ENV: 'development', PLATFORM_TRUST_KEYS: '{not json' } as any)).not.toThrow()
  })
})
