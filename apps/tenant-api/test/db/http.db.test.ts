import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { randomUUID } from 'crypto'
import { hasDb, makeUser, newOrgId, useTestDatabases } from './helpers'

/** The real Express application (all routes and middleware) against the scratch database, over real HTTP. */
describe.skipIf(!hasDb)('HTTP surface (real app, real database)', () => {
  let db: any, server: Server, base: string, shuttingDown = false
  let tokens: typeof import('../../src/utils/tokens'), access: typeof import('../../src/utils/user-access')

  beforeAll(async () => {
    useTestDatabases()
    process.env.TENANT_APP_URL = 'https://portal.example.test'
    process.env.CORS_ALLOWED_ORIGINS = 'https://partner.example.test'
    db = (await import('@dpdp/database')).getTenantPrisma()
    tokens = await import('../../src/utils/tokens')
    access = await import('../../src/utils/user-access')
    const health = await import('../../src/health')
    const { createApp } = await import('../../src/create-app')

    const ready = health.cachedReadiness([
      health.databaseProbe('database', db),
      health.migrationsProbe(db),
    ], 0)
    server = createApp({ readiness: ready.get, isShuttingDown: () => shuttingDown }).listen(0)
    await new Promise(r => server.once('listening', r))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(async () => { server?.close(); await db?.$disconnect() })

  const get = (path: string, headers: Record<string, string> = {}) => fetch(base + path, { headers })
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
  const bearer = (t: string) => ({ authorization: `Bearer ${t}` })

  describe('probes', () => {
    it('/health is alive and says nothing about dependencies; /version reports the build', async () => {
      const h = await get('/health'); expect(h.status).toBe(200)
      expect(await h.json()).toMatchObject({ status: 'ok', service: 'tenant-api' })
      const v = await (await get('/version')).json()
      expect(v).toMatchObject({ service: 'tenant-api' }); expect(v).toHaveProperty('version'); expect(v).toHaveProperty('commit')
    })

    it('/ready checks the database and that every migration finished', async () => {
      const r = await get('/ready'); expect(r.status).toBe(200)
      expect(await r.json()).toEqual({ status: 'ready', checks: { database: 'ok', migrations: 'ok' } })
    })

    it('/ready turns 503 the moment shutdown starts', async () => {
      shuttingDown = true
      const r = await get('/ready'); expect(r.status).toBe(503)
      expect(await r.json()).toEqual({ status: 'shutting_down' })
      shuttingDown = false
    })

    it('/ready is 503 when a migration did not finish (and says only ok/fail, never why)', async () => {
      await db.$executeRawUnsafe(`INSERT INTO _prisma_migrations (id, checksum, migration_name, started_at) VALUES ('${randomUUID()}', 'x', 'half_applied_test', now())`)
      const r = await get('/ready')
      expect(r.status).toBe(503)
      const body = await r.json()
      expect(body.checks.migrations).toBe('fail')
      expect(JSON.stringify(body)).not.toMatch(/half_applied/)
      await db.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE migration_name = 'half_applied_test'`)
      expect((await get('/ready')).status).toBe(200)
    })
  })

  describe('browser security headers', () => {
    it('every response carries a request id, and a supplied one is kept', async () => {
      expect((await get('/health')).headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
      expect((await get('/health', { 'x-request-id': 'support-ticket-1234' })).headers.get('x-request-id')).toBe('support-ticket-1234')
    })

    it('CORS: the portal and listed partners are allowed; any other origin gets no CORS headers', async () => {
      const allowed = await get('/health', { origin: 'https://portal.example.test' })
      expect(allowed.headers.get('access-control-allow-origin')).toBe('https://portal.example.test')
      expect((await get('/health', { origin: 'https://partner.example.test' })).headers.get('access-control-allow-origin')).toBe('https://partner.example.test')
      expect((await get('/health', { origin: 'https://evil.example.net' })).headers.get('access-control-allow-origin')).toBeNull()
    })

    it('CSP: scripts only from the app itself, never framed; no x-powered-by', async () => {
      const r = await get('/health')
      const csp = r.headers.get('content-security-policy') ?? ''
      expect(csp).toMatch(/script-src 'self'/)
      expect(csp).toMatch(/frame-ancestors 'none'/)
      expect(csp).toMatch(/object-src 'none'/)
      expect(csp).not.toMatch(/upgrade-insecure-requests/)
      expect(r.headers.get('x-powered-by')).toBeNull()
      expect(r.headers.get('strict-transport-security')).toBeTruthy()   // TENANT_APP_URL is https
    })

    it('an unknown API path is a JSON 404, not an HTML page', async () => {
      const r = await get('/api/v1/nope')
      expect(r.status).toBe(404)
      expect(await r.json()).toEqual({ success: false, message: 'Not found' })
    })
  })

  describe('sessions', () => {
    async function person(role = 'CO') {
      const tenantId = newOrgId(), user = await makeUser(db, tenantId, role)
      return { tenantId, user, ...tokens.generateTokens({ userId: user.id, tenantId, role }) }
    }

    it('no token, a refresh token used as an access token, and a garbage token are all refused', async () => {
      const p = await person()
      expect((await get('/api/v1/users')).status).toBe(401)
      expect((await get('/api/v1/users', bearer(p.refreshToken))).status).toBe(401)
      expect((await get('/api/v1/users', bearer('garbage'))).status).toBe(401)
      expect((await get('/api/v1/users', bearer(p.accessToken))).status).toBe(200)
    })

    it('a deactivated user is refused on the very next request', async () => {
      const p = await person()
      expect((await get('/api/v1/users', bearer(p.accessToken))).status).toBe(200)
      await db.user.update({ where: { id: p.user.id }, data: { status: 'INACTIVE' } })
      access.invalidateUserAccess(p.user.id)     // what the deactivate endpoint does on this instance
      const r = await get('/api/v1/users', bearer(p.accessToken))
      expect(r.status).toBe(401)
      expect((await r.json()).message).toMatch(/not active/)
    })

    it('a demotion applies to a token issued before it: a CO token no longer reaches CO-only endpoints', async () => {
      const p = await person('CO')
      expect((await post('/api/v1/users/invite', {}, bearer(p.accessToken))).status).not.toBe(403)  // allowed through to validation
      await db.user.update({ where: { id: p.user.id }, data: { role: 'IT_ADMIN' } })
      access.invalidateUserAccess(p.user.id)
      expect((await post('/api/v1/users/invite', {}, bearer(p.accessToken))).status).toBe(403)
    })

    it('a password change ends sessions issued before it', async () => {
      const p = await person()
      await new Promise(r => setTimeout(r, 1100))   // token iat has 1-second precision
      await db.user.update({ where: { id: p.user.id }, data: { passwordChangedAt: new Date() } })
      access.invalidateUserAccess(p.user.id)
      expect((await get('/api/v1/users', bearer(p.accessToken))).status).toBe(401)
    })

    it('refresh works, sign-out ends that device\'s refresh token for good, and other people\'s tokens cannot be revoked', async () => {
      const p = await person(), other = await person()
      expect((await post('/api/v1/auth/refresh', { refreshToken: p.refreshToken })).status).toBe(200)

      // someone else's token presented at logout is ignored: it stays valid
      await post('/api/v1/auth/logout', { refreshToken: other.refreshToken }, bearer(p.accessToken))
      expect((await post('/api/v1/auth/refresh', { refreshToken: other.refreshToken })).status).toBe(200)

      const out = await post('/api/v1/auth/logout', { refreshToken: p.refreshToken }, bearer(p.accessToken))
      expect(out.status).toBe(200)
      const again = await post('/api/v1/auth/refresh', { refreshToken: p.refreshToken })
      expect(again.status).toBeGreaterThanOrEqual(400)
      expect(await db.revokedRefreshToken.count({ where: { userId: p.user.id } })).toBe(1)
      // two sign-out requests were made: the one that presented someone else's token revoked nothing, the real one did
      const logouts = await db.tenantAuditLog.findMany({ where: { tenantId: p.tenantId, action: 'USER_LOGOUT' }, orderBy: { createdAt: 'asc' } })
      expect(logouts.map((l: any) => l.details.sessionRevoked)).toEqual([false, true])
    })

    it('housekeeping: revoked-token rows whose token has expired are removed on the next sign-out', async () => {
      const p = await person()
      await db.revokedRefreshToken.create({ data: { tokenHash: randomUUID(), userId: p.user.id, expiresAt: new Date(Date.now() - 1000) } })
      await post('/api/v1/auth/logout', { refreshToken: p.refreshToken }, bearer(p.accessToken))
      expect(await db.revokedRefreshToken.count({ where: { userId: p.user.id } })).toBe(1)   // only the fresh one remains
    })

    it('a deactivated user cannot refresh', async () => {
      const p = await person()
      await db.user.update({ where: { id: p.user.id }, data: { status: 'INACTIVE' } })
      expect((await post('/api/v1/auth/refresh', { refreshToken: p.refreshToken })).status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Microsoft sign-in state', () => {
    it('auth-url returns a signed state, a PKCE challenge and a nonce meant for the browser only', async () => {
      const tenantId = newOrgId()
      await db.entraConfig.create({ data: { tenantId, tenantDomain: 'x.onmicrosoft.com', clientId: randomUUID(), clientSecretEncrypted: 'x', azureTenantId: randomUUID() } })
      const r = await get(`/api/v1/entra/auth-url?tenantId=${tenantId}`)
      expect(r.status).toBe(200)
      const { data } = await r.json()
      const url = new URL(data.authUrl)
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(url.searchParams.get('state')).toContain('.')            // a signed token, not the organisation id
      expect(url.searchParams.get('state')).not.toContain(tenantId)
      expect(data.nonce.length).toBeGreaterThan(20)
      expect(url.toString()).not.toContain(data.nonce)                // the nonce never travels in the URL

      // completing the sign-in without the right nonce is refused before Microsoft is contacted
      const bad = await post('/api/v1/entra/login', { code: 'abc', state: url.searchParams.get('state'), nonce: 'x'.repeat(30) })
      expect(bad.status).toBe(400)
      expect((await bad.json()).message).toMatch(/expired or is not valid/)
      // and so is the old, unprotected request shape
      expect((await post('/api/v1/entra/login', { code: 'abc', tenantId, redirectUri: 'https://x.test/auth/callback' })).status).toBe(400)
    })
  })
})
