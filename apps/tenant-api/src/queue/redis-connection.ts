import { config } from '../config'

/**
 * Connection options for BullMQ (it manages its own ioredis client internally, so this is plain options, not a client).
 *
 * REDIS_URL forms understood:
 *   redis://host:6379                      plain, no password
 *   redis://:password@host:6379            password only
 *   redis://user:password@host:6379/2      ACL user, database 2
 *   rediss://:password@host:10000          TLS (Azure Managed Redis and most managed services require it)
 * User name and password are percent-decoded, so a password containing @ : / must be written percent-encoded in the URL.
 */
export interface RedisConnectionOptions {
  host: string
  port: number
  username?: string
  password?: string
  db?: number
  tls?: { servername: string }
  keepAlive: number
  maxRetriesPerRequest: null
}

export function parseRedisUrl(raw: string): RedisConnectionOptions {
  const url = new URL(raw)
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error(`REDIS_URL must start with redis:// or rediss:// (got "${url.protocol}//")`)
  }
  const dbText = url.pathname.replace(/^\//, '')
  const db = dbText === '' ? undefined : parseInt(dbText, 10)
  if (db !== undefined && (!Number.isInteger(db) || db < 0)) throw new Error('REDIS_URL database must be a non-negative number (e.g. /0)')

  return {
    host: url.hostname,
    port: url.port ? parseInt(url.port, 10) : 6379,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db,
    // Certificate verification uses the host name from the URL; Node's default trust store applies.
    tls: url.protocol === 'rediss:' ? { servername: url.hostname } : undefined,
    // Managed Redis closes idle connections after a few minutes; TCP keep-alive prevents surprise drops.
    keepAlive: 30_000,
    // BullMQ requires this exact setting - without it, blocking commands (used for job polling) fail against
    // ioredis's defaults.
    maxRetriesPerRequest: null as null,
  }
}

export function getRedisConnectionOptions(): RedisConnectionOptions {
  return parseRedisUrl(config.redis.url)
}
