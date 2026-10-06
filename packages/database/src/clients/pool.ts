import { Pool } from 'pg'

/**
 * One place that builds a PostgreSQL connection pool, so both clients behave the same:
 *
 *  - an 'error' handler. Without it, a connection that the server resets while idle (a managed-database failover, a
 *    firewall dropping idle connections) raises an unhandled 'error' event and the whole process crashes;
 *  - a connect timeout, so an unreachable database fails a request in seconds instead of hanging it;
 *  - a pool size from DATABASE_POOL_MAX (default 10). Total connections = replicas x this, and must stay below the
 *    database's own limit (a small managed server allows a few dozen), so it is a deployment setting, not a constant.
 */
function intFromEnv(name: string, fallback: number): number {
  const v = process.env[name]
  const n = v === undefined || v === '' ? NaN : Number(v)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

export function createPool(connectionString: string, label: string): Pool {
  const pool = new Pool({
    connectionString,
    max: intFromEnv('DATABASE_POOL_MAX', 10),
    idleTimeoutMillis: intFromEnv('DATABASE_POOL_IDLE_MS', 30_000),
    connectionTimeoutMillis: intFromEnv('DATABASE_CONNECT_TIMEOUT_MS', 10_000),
    // Keep long-lived connections alive through load balancers and NAT that drop silent ones.
    keepAlive: true,
  })
  pool.on('error', (err) => console.error(`[database:${label}] idle connection error (the pool replaces it):`, err.message))
  return pool
}
