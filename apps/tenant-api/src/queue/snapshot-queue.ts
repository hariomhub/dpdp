import { Queue } from 'bullmq'
import { getRedisConnectionOptions } from './redis-connection'

/**
 * Separate from the cloud-scans queue — different failure/retry profile
 * (a snapshot capture is idempotent and cheap to retry; it shares no
 * downstream dependency with cloud-scanner work), so splitting it out
 * follows the same reasoning documented in queues.ts for keeping shared-
 * profile jobs together and distinct-profile jobs apart.
 */
export const DASHBOARD_SNAPSHOTS_QUEUE_NAME = 'dashboard-snapshots'

export const dashboardSnapshotsQueue = new Queue(DASHBOARD_SNAPSHOTS_QUEUE_NAME, {
  connection: getRedisConnectionOptions(),
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 30 },
    removeOnFail: { count: 100 },
  },
})

export const SNAPSHOT_JOB_NAMES = {
  CAPTURE_DAILY: 'capture-daily-snapshot',
} as const
