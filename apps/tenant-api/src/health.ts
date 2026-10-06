import fs from 'fs/promises'
import { TtlCache } from './utils/ttl-cache'

/**
 * Liveness vs readiness.
 *  - /health  = "the process is running". Never touches a dependency, so a database outage does not make the
 *               orchestrator kill and restart a perfectly healthy process.
 *  - /ready   = "send me traffic". Fails when something the portal needs is unavailable, so a load balancer routes
 *               around it, and flips to failing the moment shutdown starts so no new requests arrive while draining.
 *
 * The response lists only ok/fail per check; the reason goes to the log, not to an unauthenticated caller.
 */

export interface Probe {
  name: string
  run: () => Promise<void>   // resolve = healthy, throw = unhealthy
}

export interface Readiness {
  ready: boolean
  checks: Record<string, 'ok' | 'fail'>
}

const withTimeout = <T>(p: Promise<T>, ms: number, name: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${name} did not answer within ${ms} ms`)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })

export async function runReadiness(probes: Probe[], timeoutMs = 3000, log: (msg: string) => void = console.error): Promise<Readiness> {
  const results = await Promise.all(probes.map(async (p): Promise<[string, 'ok' | 'fail']> => {
    try {
      await withTimeout(p.run(), timeoutMs, p.name)
      return [p.name, 'ok']
    } catch (err: any) {
      log(`[ready] ${p.name} check failed: ${err?.message ?? err}`)
      return [p.name, 'fail']
    }
  }))
  const checks = Object.fromEntries(results)
  return { ready: results.every(([, s]) => s === 'ok'), checks }
}

/** Orchestrators poll often and this endpoint is public: reuse a result for a few seconds so it cannot be used to hammer the database. */
export function cachedReadiness(probes: Probe[], ttlMs = 5000, timeoutMs = 3000) {
  const cache = new TtlCache<Readiness>(() => runReadiness(probes, timeoutMs), ttlMs)
  return { get: () => cache.get('ready'), reset: () => cache.invalidate() }
}

// ─── Probes ──────────────────────────────────────────────────────────────────

/** A `SELECT 1`-capable client. */
export interface SqlClient { $queryRawUnsafe: (query: string) => Promise<unknown> }

export const databaseProbe = (name: string, db: SqlClient): Probe => ({
  name,
  run: async () => { await db.$queryRawUnsafe('SELECT 1') },
})

/**
 * Every migration the runner started has finished. An unfinished row means an update was interrupted or failed
 * half-way, and the schema may not match what this version of the app expects.
 */
export const migrationsProbe = (db: SqlClient): Probe => ({
  name: 'migrations',
  run: async () => {
    const rows = (await db.$queryRawUnsafe(
      'SELECT count(*)::int AS unfinished FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL',
    )) as Array<{ unfinished: number }>
    if (!rows[0] || rows[0].unfinished !== 0) throw new Error(`${rows[0]?.unfinished ?? '?'} migration(s) did not finish`)
  },
})

/** `check` is any cheap call through the same connection the queues use, so TLS, credentials and reachability are all exercised. */
export const redisProbe = (check: () => Promise<unknown>): Probe => ({
  name: 'redis',
  run: async () => { await check() },
})

/** Object store reachable (cloud) - `exists` on a key that is never written proves auth, network and container. */
export const objectStoreProbe = (store: { exists: (key: string) => Promise<boolean> }): Probe => ({
  name: 'storage',
  run: async () => { await store.exists('.ready-probe') },
})

/** Local folder is writable and not nearly full - uploads refused for lack of space are an outage for users. */
export const localDiskProbe = (dir: string, minFreeMb: number): Probe => ({
  name: 'storage',
  run: async () => {
    await fs.mkdir(dir, { recursive: true })
    await fs.access(dir, (await import('fs')).constants.W_OK)
    const s = await fs.statfs(dir)
    const freeMb = (Number(s.bavail) * Number(s.bsize)) / (1024 * 1024)
    if (freeMb < minFreeMb) throw new Error(`only ${Math.floor(freeMb)} MB free in ${dir} (minimum ${minFreeMb} MB)`)
  },
})
