import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { randomUUID } from 'crypto'
import { LicencePayload, generateSigningKeyPair, signLicence } from '@dpdp/platform'
import { hasDb, makeUser, newOrgId, useTestDatabases } from './helpers'

/**
 * Activation, the signed licence as the single authority, and the read-only gate - over the real application and real
 * databases. A test vendor key pair signs the licences; the instance trusts its public half.
 */
const keys = generateSigningKeyPair()
const DAY = 86_400_000
const sec = (ms: number) => Math.floor(ms / 1000)

function licenceFor(org: string, o: { validDays?: number; startDays?: number; iatOffsetSec?: number; plan?: string; ceoEmail?: string; lid?: string; signWith?: string } = {}) {
  const now = Date.now()
  const payload: LicencePayload = {
    v: 1, lid: o.lid ?? randomUUID(), iss: 'test', iat: sec(now) + (o.iatOffsetSec ?? 0),
    org: {
      id: org, code: `ORG-${org.slice(0, 6)}`, name: 'Acme Ltd', industry: 'Fintech', orgSize: '51-200', address: 'Pune', country: 'India',
      contactEmail: 'ops@acme.test', dpoName: 'Dee', dpoEmail: 'dpo@acme.test', classification: 'Significant Data Fiduciary', classUncertain: false,
      ceoName: 'Cee Ceo', ceoEmail: o.ceoEmail ?? 'ceo@acme.test',
    },
    classifications: [{ regulationId: 'reg-1', applicabilityCategoryId: 'cat-1', isUncertain: false }],
    plan: o.plan ?? 'PROFESSIONAL', limits: { maxUsers: 25, maxAssessments: 10, storageGb: 50 }, entitlements: { regulations: '*', features: [] },
    validFrom: sec(now + (o.startDays ?? -1) * DAY), validUntil: sec(now + (o.validDays ?? 365) * DAY), updatesUntil: sec(now + (o.validDays ?? 365) * DAY),
    graceDays: 30, airGapped: false,
  }
  return signLicence(payload, o.signWith ?? keys.privateKeyPem, 'test-key')
}

describe.skipIf(!hasDb)('activation, licence and the read-only gate (real app, real databases)', () => {
  let db: any, server: Server, base: string
  let install: typeof import('../../src/platform/activation').installLicence
  let tokens: typeof import('../../src/utils/tokens'), view: typeof import('../../src/platform/licence-store'), auth: any

  beforeAll(async () => {
    useTestDatabases()
    process.env.LICENCE_MODE = 'enforce'
    process.env.PLATFORM_TRUST_KEYS = JSON.stringify([{ kid: 'test-key', publicKey: keys.publicKeyPem }])
    process.env.TENANT_APP_URL = 'https://portal.example.test'
    db = (await import('@dpdp/database')).getTenantPrisma()
    install = (await import('../../src/platform/activation')).installLicence
    tokens = await import('../../src/utils/tokens'); view = await import('../../src/platform/licence-store')
    auth = (await import('../../src/modules/auth/auth.service')).authService
    const { createApp } = await import('../../src/create-app')
    server = createApp({ readiness: async () => ({ ready: true, checks: {} }), isShuttingDown: () => false }).listen(0)
    await new Promise(r => server.once('listening', r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(async () => { server?.close(); await db?.$disconnect() })

  const call = (method: string, path: string, token?: string, body?: unknown) =>
    fetch(base + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })

  /**
   * An activated organisation with a CEO and a signed-in token for them.
   * A licence that is already past its grace period cannot be INSTALLED (it is refused), so for that case the state is
   * created the way time creates it: a licence that was valid when installed and has since run out.
   */
  async function activated(lic: Parameters<typeof licenceFor>[1] = {}) {
    const org = newOrgId()
    if ((lic.validDays ?? 365) < -30) {
      const token = licenceFor(org, lic), p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
      await db.tenantProfile.create({ data: { id: org, tenantCode: `X-${org.slice(0, 6)}`, name: 'Acme Ltd', contactEmail: 'a@b.test', ceoName: 'x', ceoEmail: 'a@b.test' } })
      await db.platformLicence.create({ data: {
        tenantId: org, licenceId: p.lid, token, keyId: 'test-key', plan: p.plan, issuedAt: new Date(p.iat * 1000), validFrom: new Date(p.validFrom * 1000),
        validUntil: new Date(p.validUntil * 1000), updatesUntil: new Date(p.updatesUntil * 1000), graceDays: p.graceDays, limits: p.limits, entitlements: p.entitlements,
      } })
    } else {
      await install(licenceFor(org, lic), { allowFirstActivation: true })
    }
    const ceo = await makeUser(db, org, 'CEO')
    view.resetLicenceCache(org)
    return { org, ceo, token: tokens.signAccessToken({ userId: ceo.id, tenantId: org, role: 'CEO' }) }
  }

  describe('activation', () => {
    it('a fresh deployment is activated from a signed licence: organisation record, licence, classifications, a CEO invitation, an audit entry', async () => {
      const org = newOrgId()
      const r = await install(licenceFor(org), { allowFirstActivation: true })

      expect(r).toMatchObject({ firstActivation: true, organization: { id: org, name: 'Acme Ltd' }, licence: { state: 'ACTIVE' } })
      expect(await db.tenantProfile.findUnique({ where: { id: org } })).toMatchObject({ name: 'Acme Ltd', classification: 'Significant Data Fiduciary', plan: 'PROFESSIONAL', ceoEmail: 'ceo@acme.test' })
      expect(await db.platformLicence.findUnique({ where: { tenantId: org } })).toMatchObject({ keyId: 'test-key', plan: 'PROFESSIONAL' })
      expect(await db.tenantRegulationClassification.count({ where: { tenantId: org } })).toBe(1)
      expect(r.ceoInvite).toMatchObject({ email: 'ceo@acme.test' })
      expect(r.ceoInvite!.url).toMatch(/^https:\/\/portal\.example\.test\/invite\/.{20,}/)
      expect(await db.tenantAuditLog.count({ where: { tenantId: org, action: 'INSTANCE_ACTIVATED' } })).toBe(1)
    })

    it('the invited CEO can set a password and becomes the organisation\'s CEO (the whole first-sign-in path)', async () => {
      const org = newOrgId()
      const { ceoInvite } = await install(licenceFor(org), { allowFirstActivation: true })
      const token = ceoInvite!.url.split('/invite/')[1]
      expect(await auth.verifyInvite(token)).toMatchObject({ type: 'ceo', email: 'ceo@acme.test', tenantId: org })

      const signedIn = await auth.setPassword({ token, password: 'Str0ng!Passw0rd#1' })
      expect(signedIn.user).toMatchObject({ role: 'CEO', tenantId: org })
      expect(await db.tenantProfile.findUnique({ where: { id: org } })).toMatchObject({ inviteToken: null })
      await expect(auth.verifyInvite(token)).rejects.toThrow(/Invalid or expired/)           // single use
    })

    it('installing the same licence again changes nothing and does not invite twice; a second licence does not invite a second CEO', async () => {
      const org = newOrgId(), lic = licenceFor(org)
      const first = await install(lic, { allowFirstActivation: true })
      const again = await install(lic, { allowFirstActivation: true })
      expect(again.ceoInvite).toBeUndefined()
      expect(again.firstActivation).toBe(false)

      const renewed = await install(licenceFor(org, { iatOffsetSec: 10 }), { allowFirstActivation: false, expectTenantId: org })
      expect(renewed.ceoInvite).toBeUndefined()                         // an invitation is already waiting
      expect((await db.tenantProfile.findUnique({ where: { id: org } })).inviteToken).toBe(first.ceoInvite!.url.split('/invite/')[1])
    })

    it('an organisation that already has a CEO (existing data) is activated without a new invitation', async () => {
      const org = newOrgId()
      await makeUser(db, org, 'CEO')
      const r = await install(licenceFor(org), { allowFirstActivation: true })
      expect(r.firstActivation).toBe(true)
      expect(r.ceoInvite).toBeUndefined()
    })

    it('refuses a licence from an untrusted key, an altered one, garbage, and an already-expired one - and writes nothing', async () => {
      const org = newOrgId(), other = generateSigningKeyPair()
      const bad = [
        licenceFor(org, { signWith: other.privateKeyPem }),                                              // signed by someone else
        (() => { const [h, , s] = licenceFor(org).split('.'); return `${h}.${Buffer.from('{"v":1}').toString('base64url')}.${s}` })(),
        'not a licence at all',
        licenceFor(org, { validDays: -60, startDays: -400 }),                                            // expired beyond grace
      ]
      for (const b of bad) await expect(install(b, { allowFirstActivation: true })).rejects.toMatchObject({ status: 400 })
      expect(await db.tenantProfile.count({ where: { id: org } })).toBe(0)
    })

    it('a signed-in renewal must be for the same organisation, may not go backwards, and keeps what the customer edited', async () => {
      const a = await activated(), b = newOrgId()
      await expect(install(licenceFor(b), { allowFirstActivation: false, expectTenantId: a.org })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/different organization/) })
      await expect(install(licenceFor(a.org, { iatOffsetSec: -3600 }), { allowFirstActivation: false, expectTenantId: a.org })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/newer licence/) })

      await db.tenantProfile.update({ where: { id: a.org }, data: { address: 'New HQ, Mumbai' } })
      await install(licenceFor(a.org, { iatOffsetSec: 60, plan: 'ENTERPRISE' }), { allowFirstActivation: false, expectTenantId: a.org })
      expect(await db.tenantProfile.findUnique({ where: { id: a.org } })).toMatchObject({ plan: 'ENTERPRISE', address: 'New HQ, Mumbai' })
    })

    it('POST /platform/activate works only on a fresh deployment and never exposes anything to a bad licence', async () => {
      const status = await (await call('GET', '/api/v1/platform/status')).json()
      expect(status.data).toMatchObject({ activated: true })                      // this database already has organisations
      const r = await call('POST', '/api/v1/platform/activate', undefined, { licence: licenceFor(newOrgId()) })
      expect(r.status).toBe(409)
      expect((await call('POST', '/api/v1/platform/activate', undefined, { licence: 'x' })).status).toBe(400)
    })
  })

  describe('the read-only gate', () => {
    it('an active licence: everything works', async () => {
      const o = await activated()
      expect((await call('GET', '/api/v1/org/departments', o.token)).status).toBe(200)
      const made = await call('POST', '/api/v1/org/departments', o.token, { name: `Dept ${randomUUID().slice(0, 4)}` })
      expect(made.status).toBeLessThan(400)
    })

    it('in the grace period everything still works', async () => {
      const o = await activated({ validDays: -5, startDays: -400 })
      const r = await call('POST', '/api/v1/org/departments', o.token, { name: `Dept ${randomUUID().slice(0, 4)}` })
      expect(r.status).toBeLessThan(400)
      expect((await (await call('GET', '/api/v1/platform/licence', o.token)).json()).data).toMatchObject({ state: 'GRACE' })
    })

    it('after the grace period it is read-only: reading and exporting work, changing anything is refused with a clear message, renewal works', async () => {
      const o = await activated({ validDays: -40, startDays: -400 })
      expect((await call('GET', '/api/v1/org/departments', o.token)).status).toBe(200)               // can look at everything
      const blocked = await call('POST', '/api/v1/org/departments', o.token, { name: 'Nope' })
      expect(blocked.status).toBe(403)
      expect(await blocked.json()).toMatchObject({ success: false, code: 'LICENCE_RESTRICTED', message: expect.stringMatching(/read-only.*renew/i) })
      expect((await call('POST', '/api/v1/auth/logout', o.token, {})).status).toBe(200)               // still can sign out
      expect((await call('GET', '/api/v1/platform/licence', o.token)).status).toBe(200)

      // renewal restores full function
      const renewed = await call('POST', '/api/v1/platform/licence', o.token, { licence: licenceFor(o.org, { iatOffsetSec: 120 }) })
      expect(renewed.status).toBe(200)
      view.resetLicenceCache(o.org)
      expect((await call('POST', '/api/v1/org/departments', o.token, { name: `After ${randomUUID().slice(0, 4)}` })).status).toBeLessThan(400)
    })

    it('only the CEO or a CO can renew', async () => {
      const o = await activated({ validDays: -40, startDays: -400 })
      const admin = await makeUser(db, o.org, 'IT_ADMIN')
      const adminToken = tokens.signAccessToken({ userId: admin.id, tenantId: o.org, role: 'IT_ADMIN' })
      expect((await call('POST', '/api/v1/platform/licence', adminToken, { licence: licenceFor(o.org, { iatOffsetSec: 120 }) })).status).toBe(403)
    })

    it('an organization that was never licensed cannot use the portal at all - until the CEO installs a licence', async () => {
      const org = newOrgId(), user = await makeUser(db, org, 'CEO')
      await db.tenantProfile.create({ data: { id: org, tenantCode: `U-${org.slice(0, 6)}`, name: 'No licence', contactEmail: 'a@b.test', ceoName: 'x', ceoEmail: 'a@b.test' } })
      const token = tokens.signAccessToken({ userId: user.id, tenantId: org, role: 'CEO' })

      // not even reading
      const blocked = await call('GET', '/api/v1/org/departments', token)
      expect(blocked.status).toBe(403)
      expect(await blocked.json()).toMatchObject({ code: 'NO_LICENCE' })
      expect(await (await call('POST', '/api/v1/org/departments', token, { name: 'x' })).json()).toMatchObject({ code: 'NO_LICENCE' })

      // ... but the person can still be identified, see the licence state and install the licence
      expect((await call('GET', '/api/v1/auth/me', token)).status).toBe(200)
      expect((await (await call('GET', '/api/v1/platform/licence', token)).json()).data).toMatchObject({ state: 'UNLICENSED' })
      expect((await call('POST', '/api/v1/platform/licence', token, { licence: licenceFor(org) })).status).toBe(200)

      view.resetLicenceCache(org)
      expect((await call('GET', '/api/v1/org/departments', token)).status).toBe(200)               // now everything works
    })

    it('only the CEO or a CO can install it; anyone else is told to ask them', async () => {
      const org = newOrgId(), admin = await makeUser(db, org, 'IT_ADMIN')
      await db.tenantProfile.create({ data: { id: org, tenantCode: `V-${org.slice(0, 6)}`, name: 'No licence 2', contactEmail: 'a@b.test', ceoName: 'x', ceoEmail: 'a@b.test' } })
      const token = tokens.signAccessToken({ userId: admin.id, tenantId: org, role: 'IT_ADMIN' })
      expect((await call('POST', '/api/v1/platform/licence', token, { licence: licenceFor(org) })).status).toBe(403)
    })

    it('opening a file (a POST) keeps working when read-only, because it is reading', async () => {
      const o = await activated({ validDays: -40, startDays: -400 })
      const r = await call('POST', `/api/v1/files/evidence/${randomUUID()}/link`, o.token, {})
      expect(r.status).not.toBe(403)         // 404 (no such file) - the gate let it through to the file lookup
    })
  })

  describe('the signed licence is the authority', () => {
    it('editing the database cannot extend a licence: dates come from the signed token, not the columns beside it', async () => {
      const o = await activated({ validDays: -40, startDays: -400 })
      await db.platformLicence.update({ where: { tenantId: o.org }, data: { validUntil: new Date(Date.now() + 3650 * DAY), graceDays: 9999 } })
      view.resetLicenceCache(o.org)
      expect((await call('POST', '/api/v1/org/departments', o.token, { name: 'Sneaky' })).status).toBe(403)
    })

    it('replacing the stored token with one signed by an untrusted key makes the deployment read-only (not locked out)', async () => {
      const o = await activated()
      const other = generateSigningKeyPair()
      await db.platformLicence.update({ where: { tenantId: o.org }, data: { token: licenceFor(o.org, { signWith: other.privateKeyPem }) } })
      view.resetLicenceCache(o.org)
      expect((await call('GET', '/api/v1/org/departments', o.token)).status).toBe(200)               // a licence WAS installed: data stays readable
      const blocked = await call('POST', '/api/v1/org/departments', o.token, { name: 'x' })
      expect(blocked.status).toBe(403)
      expect((await blocked.json()).message).toMatch(/cannot be verified/)
    })

    it('winding the clock back is noticed: read-only until a fresh licence is installed', async () => {
      const o = await activated()
      await db.platformLicence.update({ where: { tenantId: o.org }, data: { lastSeenAt: new Date(Date.now() + 10 * DAY) } })   // this instance has already seen a later date
      view.resetLicenceCache(o.org)
      const blocked = await call('POST', '/api/v1/org/departments', o.token, { name: 'x' })
      expect(blocked.status).toBe(403)
      expect((await blocked.json()).message).toMatch(/clock/i)

      await install(licenceFor(o.org, { iatOffsetSec: 300 }), { allowFirstActivation: false, expectTenantId: o.org })
      view.resetLicenceCache(o.org)
      expect((await call('POST', '/api/v1/org/departments', o.token, { name: `Back ${randomUUID().slice(0, 4)}` })).status).toBeLessThan(400)
    })
  })
})
