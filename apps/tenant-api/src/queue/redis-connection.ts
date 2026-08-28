import { config } from '../config'

/**
 * BullMQ accepts an ioredis-compatible connection config directly — it
 * manages its own Redis client internally rather than taking an ioredis
 * instance, so this is just the parsed connection options, not a client.
 */
export function getRedisConnectionOptions() {
  const url = new URL(config.redis.url)
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379'),
    password: url.password || undefined,
    // BullMQ requires this exact setting — without it, blocking commands
    // (used internally for job polling) fail against ioredis's defaults.
    maxRetriesPerRequest: null as null,
  }
}
