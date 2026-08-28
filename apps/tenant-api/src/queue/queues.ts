import { Queue } from 'bullmq'
import { getRedisConnectionOptions } from './redis-connection'

/**
 * One queue for all cloud-scanner-related work, distinguished by job name
 * (BullMQ dispatches by name within a queue — see worker.ts). Keeping one
 * queue here rather than one per job kind is deliberate: everything in it
 * shares the same concurrency/retry profile and the same downstream
 * dependency (the cloud-scanner service), so splitting queues wouldn't buy
 * independent tuning, just more moving pieces.
 */
export const CLOUD_SCANS_QUEUE_NAME = 'cloud-scans'

export const cloudScansQueue = new Queue(CLOUD_SCANS_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    // Keep a short history for observability without letting Redis grow
    // unbounded — production tuning (longer retention, dashboards) is a
    // deployment-time concern, not something to guess at here.
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
})

// ─── Job payload types ─────────────────────────────────────────────────────

export interface ConnectionTestJobData {
  tenantId: string
  connectionId: string
  provider: string
  credentials: Record<string, unknown>
}

export interface DiscoveryScanJobData {
  tenantId: string
  connectionId: string
  provider: string
  credentials: Record<string, unknown>
}

export const JOB_NAMES = {
  CONNECTION_TEST: 'connection-test',
  DISCOVERY_SCAN: 'discovery-scan',
} as const

export function enqueueConnectionTest(data: ConnectionTestJobData) {
  return cloudScansQueue.add(JOB_NAMES.CONNECTION_TEST, data)
}

export function enqueueDiscoveryScan(data: DiscoveryScanJobData) {
  // Scans run real checks (not just a resource listing) and can genuinely
  // take minutes — a longer timeout than the default job options' backoff
  // window is appropriate, but BullMQ doesn't have a per-job "max runtime"
  // separate from the worker's own lock duration, so this relies on the
  // worker's lockDuration (set in worker.ts) rather than a job option here.
  return cloudScansQueue.add(JOB_NAMES.DISCOVERY_SCAN, data, {
    attempts: 1, // do not silently retry a real scan — a failed scan should surface, not re-run against the same account unattended
  })
}
