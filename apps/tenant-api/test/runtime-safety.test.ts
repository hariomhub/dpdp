import { describe, expect, it, vi } from 'vitest'
import { allowedOrigins, buildCorsOptions, buildHelmetOptions, originOf } from '../src/security/http-security'
import { parseRedisUrl } from '../src/queue/redis-connection'
import { cachedReadiness, databaseProbe, localDiskProbe, migrationsProbe, objectStoreProbe, redisProbe, runReadiness } from '../src/health'
import { createShutdown } from '../src/shutdown'
import { requestId } from '../src/middleware/request-id'
import { formatCode } from '../src/utils/code-counter'
import { todaySnapshotDate } from '../src/utils/snapshot-date'
import { buildTransportOptions } from '../src/utils/email'

describe('CORS: only the portal and listed origins', () => {
  const corsAllows = (opts: any, origin: string | undefined) =>
    new Promise<boolean>(resolve => opts.origin(origin, (_e: any, ok: boolean) => resolve(ok)))

  it('production: the portal origin and CORS_ALLOWED_ORIGINS, nothing else (not the dev server)', async () => {
    const o = buildCorsOptions({ appUrl: 'https://portal.example.com/some/path', extraOrigins: ['https://partner.example.com'], production: true })
    expect(await corsAllows(o, 'https://portal.example.com')).toBe(true)
    expect(await corsAllows(o, 'https://partner.example.com')).toBe(true)
    expect(await corsAllows(o, 'https://evil.example.net')).toBe(false)
    expect(await corsAllows(o, 'http://localhost:5173')).toBe(false)
  })
  it('a request with no Origin header (same-origin, curl, probes) is not a CORS request', async () => {
    expect(await corsAllows(buildCorsOptions({ extraOrigins: [], production: true }), undefined)).toBe(true)
  })
  it('development adds the Vite dev server', () => {
    expect(allowedOrigins({ extraOrigins: [], production: false })).toContain('http://localhost:5173')
  })
  it('originOf strips path and tolerates garbage', () => {
    expect(originOf('https://a.example.com:8443/x?y=1')).toBe('https://a.example.com:8443')
    expect(originOf('not a url')).toBeNull()
    expect(originOf(undefined)).toBeNull()
  })
})

describe('Content-Security-Policy', () => {
  const csp = (mode: any, https = true) => buildHelmetOptions({ cspMode: mode, https }).contentSecurityPolicy as any

  it('enforces: scripts only from self, no framing, no plugins, no upgrade-insecure-requests', () => {
    const d = csp('enforce').directives
    expect(csp('enforce').reportOnly).toBe(false)
    expect(d.scriptSrc).toEqual(["'self'"])
    expect(d.frameAncestors).toEqual(["'none'"])
    expect(d.objectSrc).toEqual(["'none'"])
    expect(d.baseUri).toEqual(["'self'"])
    expect(d).not.toHaveProperty('upgradeInsecureRequests') // would break a plain-http intranet install
  })
  it('report-only observes without blocking; off disables', () => {
    expect(csp('report-only').reportOnly).toBe(true)
    expect(csp('off')).toBe(false)
  })
  it('HSTS only when the portal is served over https', () => {
    expect(buildHelmetOptions({ cspMode: 'enforce', https: true }).hsts).toBeTruthy()
    expect(buildHelmetOptions({ cspMode: 'enforce', https: false }).hsts).toBe(false)
  })
})

describe('REDIS_URL parsing', () => {
  it('plain redis', () => {
    expect(parseRedisUrl('redis://localhost:6379')).toMatchObject({ host: 'localhost', port: 6379, tls: undefined, username: undefined, password: undefined, maxRetriesPerRequest: null })
  })
  it('rediss:// turns on TLS with the host name for verification (Azure Managed Redis)', () => {
    const o = parseRedisUrl('rediss://:p%40ss%2Fword@cache.redis.azure.net:10000')
    expect(o.tls).toEqual({ servername: 'cache.redis.azure.net' })
    expect(o.port).toBe(10000)
    expect(o.password).toBe('p@ss/word') // percent-decoded
  })
  it('ACL user and database number', () => {
    expect(parseRedisUrl('redis://svc:pw@h:6380/2')).toMatchObject({ username: 'svc', password: 'pw', db: 2, port: 6380 })
  })
  it('rejects other schemes and a bad database', () => {
    expect(() => parseRedisUrl('http://h')).toThrow(/redis:\/\//)
    expect(() => parseRedisUrl('redis://h/abc')).toThrow(/database/)
  })
})

describe('readiness', () => {
  const ok = { name: 'a', run: async () => undefined }
  const bad = { name: 'b', run: async () => { throw new Error('boom') } }

  it('ready only when every check passes; failure reasons are logged, not returned', async () => {
    const log = vi.fn()
    const r = await runReadiness([ok, bad], 1000, log)
    expect(r).toEqual({ ready: false, checks: { a: 'ok', b: 'fail' } })
    expect(log.mock.calls[0][0]).toMatch(/b check failed: boom/)
    expect((await runReadiness([ok], 1000, log)).ready).toBe(true)
  })
  it('a check that hangs fails after the timeout instead of hanging the probe', async () => {
    const hang = { name: 'h', run: () => new Promise<void>(() => undefined) }
    const r = await runReadiness([hang], 30, () => undefined)
    expect(r.checks.h).toBe('fail')
  })
  it('the database / redis / storage / migrations probes pass and fail on what they should', async () => {
    const sql = (rows: unknown) => ({ $queryRawUnsafe: vi.fn(async () => rows) })
    await expect(databaseProbe('database', sql([{ '?column?': 1 }])).run()).resolves.toBeUndefined()
    await expect(migrationsProbe(sql([{ unfinished: 0 }])).run()).resolves.toBeUndefined()
    await expect(migrationsProbe(sql([{ unfinished: 2 }])).run()).rejects.toThrow(/did not finish/)
    await expect(redisProbe(async () => 'x').run()).resolves.toBeUndefined()
    await expect(redisProbe(async () => { throw new Error('no route') }).run()).rejects.toThrow('no route')
    await expect(objectStoreProbe({ exists: async () => false }).run()).resolves.toBeUndefined()
    await expect(objectStoreProbe({ exists: async () => { throw new Error('403') } }).run()).rejects.toThrow('403')
  })
  it('the disk probe passes for a writable folder and fails when the required free space is absurd', async () => {
    const os = await import('os'); const fs = await import('fs/promises'); const path = await import('path')
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ready-'))
    await expect(localDiskProbe(dir, 1).run()).resolves.toBeUndefined()
    await expect(localDiskProbe(dir, 1_000_000_000).run()).rejects.toThrow(/MB free/)
    await fs.rm(dir, { recursive: true, force: true })
  })
  it('a result is reused for a few seconds so a public endpoint cannot hammer the dependencies', async () => {
    const run = vi.fn(async () => undefined)
    const r = cachedReadiness([{ name: 'a', run }], 60_000)
    await r.get(); await r.get(); await r.get()
    expect(run).toHaveBeenCalledTimes(1)
    r.reset(); await r.get()
    expect(run).toHaveBeenCalledTimes(2)
  })
})

describe('graceful shutdown', () => {
  function fakeServer(closeAfterMs: number | 'never') {
    const calls = { idle: 0, all: 0 }
    return {
      calls,
      close: (cb: () => void) => { if (closeAfterMs !== 'never') setTimeout(cb, closeAfterMs) },
      closeIdleConnections: () => { calls.idle++ },
      closeAllConnections: () => { calls.all++ },
    }
  }

  it('reports not-ready first, waits for requests to finish, closes resources, exits 0', async () => {
    const order: string[] = []
    const server = fakeServer(20)
    const shutdown = createShutdown({
      server, graceMs: 2000, log: () => undefined,
      markNotReady: () => order.push('not-ready'),
      closers: [{ name: 'queue', close: async () => { order.push('queue') } }, { name: 'db', close: async () => { order.push('db') } }],
      exit: (c) => order.push(`exit:${c}`),
    })
    await shutdown('SIGTERM')
    expect(order).toEqual(['not-ready', 'queue', 'db', 'exit:0'])
  })

  it('cuts connections and exits 1 when requests do not finish within the grace period', async () => {
    const server = fakeServer('never'); const exit = vi.fn()
    await createShutdown({ server, graceMs: 30, log: () => undefined, markNotReady: () => undefined, closers: [], exit })('SIGTERM')
    expect(server.calls.all).toBe(1)
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('a resource that fails or hangs on close does not stop the shutdown', async () => {
    const exit = vi.fn(); const log = vi.fn()
    await createShutdown({
      server: fakeServer(0), graceMs: 1000, log, markNotReady: () => undefined, exit, closerTimeoutMs: 20,
      closers: [{ name: 'bad', close: async () => { throw new Error('nope') } }, { name: 'hang', close: () => new Promise(() => undefined) }, { name: 'ok', close: async () => undefined }],
    })('SIGTERM')
    expect(exit).toHaveBeenCalledWith(0)
    expect(log.mock.calls.flat().join('\n')).toMatch(/could not close bad/)
    expect(log.mock.calls.flat().join('\n')).toMatch(/could not close hang/)
  })

  it('runs once even if the signal arrives twice', async () => {
    const exit = vi.fn()
    const s = createShutdown({ server: fakeServer(0), graceMs: 500, log: () => undefined, markNotReady: () => undefined, closers: [], exit })
    await Promise.all([s('SIGTERM'), s('SIGINT')])
    expect(exit).toHaveBeenCalledTimes(1)
  })
})

describe('small helpers', () => {
  it('request ids: kept if plain and sane, replaced if not', () => {
    const run = (header?: string) => {
      const req: any = { headers: header === undefined ? {} : { 'x-request-id': header } }
      const res: any = { setHeader: vi.fn() }
      requestId(req, res, () => undefined)
      return { id: req.id as string, res }
    }
    expect(run('abc-12345678').id).toBe('abc-12345678')
    expect(run('has spaces and <script>').id).toMatch(/^[0-9a-f-]{36}$/)
    expect(run().id).toMatch(/^[0-9a-f-]{36}$/)
    const r = run('abc-12345678'); expect(r.res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'abc-12345678')
  })

  it('codes are zero-padded and prefixed', () => {
    expect(formatCode('ASSET', 7)).toBe('AST-007')
    expect(formatCode('TASK', 1234)).toBe('ACT-1234')
  })

  it('snapshot date is the UTC calendar date regardless of the server time zone', () => {
    // 23:30 UTC on 5 Oct is already 6 Oct in IST; the snapshot must still be 5 Oct.
    expect(todaySnapshotDate(new Date('2026-10-05T23:30:00Z')).toISOString()).toBe('2026-10-05T00:00:00.000Z')
    expect(todaySnapshotDate(new Date('2026-10-06T00:00:01Z')).toISOString()).toBe('2026-10-06T00:00:00.000Z')
  })

  it('SMTP: relay without login, implicit TLS on 465, auth only when both are set', () => {
    expect(buildTransportOptions({ host: 'relay.corp', port: 25 })).not.toHaveProperty('auth')
    expect(buildTransportOptions({ host: 'h', port: 465 }).secure).toBe(true)
    expect(buildTransportOptions({ host: 'h', port: 587 }).secure).toBe(false)
    expect(buildTransportOptions({ host: 'h', port: 587, secure: true }).secure).toBe(true)
    expect(buildTransportOptions({ host: 'h', port: 587, user: 'u', pass: 'p' })).toMatchObject({ auth: { user: 'u', pass: 'p' } })
    expect(buildTransportOptions({ host: 'h', port: 587, user: 'u' })).not.toHaveProperty('auth')
    expect(buildTransportOptions({ host: 'h', port: 587 }).connectionTimeout).toBeGreaterThan(0)
  })
})
