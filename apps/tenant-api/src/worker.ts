// Settings are validated before anything else runs (see config/boot-check-worker.ts).
import './config/boot-check-worker'
import { Worker, Job } from 'bullmq'
import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { cloudScansQueue } from './queue/queues'
import { CLOUD_SCANS_QUEUE_NAME, JOB_NAMES } from './queue/queues'
import { DASHBOARD_SNAPSHOTS_QUEUE_NAME, SNAPSHOT_JOB_NAMES, dashboardSnapshotsQueue } from './queue/snapshot-queue'
import { getRedisConnectionOptions } from './queue/redis-connection'
import { processConnectionTest } from './queue/processors/connection-test.processor'
import { processDiscoveryScan } from './queue/processors/discovery-scan.processor'
import { processCaptureDailySnapshot } from './queue/processors/dashboard-snapshot.processor'

async function dispatch(job: Job): Promise<void> {
  switch (job.name) {
    case JOB_NAMES.CONNECTION_TEST:
      return processConnectionTest(job.data)
    case JOB_NAMES.DISCOVERY_SCAN:
      return processDiscoveryScan(job.data)
    default:
      throw new Error(`No processor registered for job name "${job.name}"`)
  }
}

async function dispatchSnapshot(job: Job): Promise<void> {
  switch (job.name) {
    case SNAPSHOT_JOB_NAMES.CAPTURE_DAILY:
      return processCaptureDailySnapshot()
    default:
      throw new Error(`No processor registered for job name "${job.name}"`)
  }
}

const worker = new Worker(CLOUD_SCANS_QUEUE_NAME, dispatch, {
  connection: getRedisConnectionOptions(),
  concurrency: 5,
  // A full discovery scan can run many minutes (hundreds of checks against
  // a real account) — the default lock duration would let another worker
  // pick up the same job mid-scan, thinking it stalled. 20 minutes covers
  // the 15-minute scan timeout in discovery-scan.processor.ts with margin.
  lockDuration: 20 * 60 * 1000,
})

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} (${job.name}) completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
})

const snapshotWorker = new Worker(DASHBOARD_SNAPSHOTS_QUEUE_NAME, dispatchSnapshot, {
  connection: getRedisConnectionOptions(),
  concurrency: 1,
})

snapshotWorker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} (${job.name}) completed`)
})

snapshotWorker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} (${job?.name}) failed:`, err.message)
})

// Idempotent/keyed — safe to call on every worker restart without
// duplicating the schedule (BullMQ dedupes by scheduler id).
dashboardSnapshotsQueue.upsertJobScheduler(
  'daily-dashboard-snapshot',
  { pattern: '0 1 * * *' }, // 01:00 daily
  { name: SNAPSHOT_JOB_NAMES.CAPTURE_DAILY, data: {} }
).catch(err => console.error('[worker] Failed to register daily snapshot scheduler:', err))

console.log(`[worker] Listening on queues "${CLOUD_SCANS_QUEUE_NAME}", "${DASHBOARD_SNAPSHOTS_QUEUE_NAME}"...`)

// Finish the jobs in progress, then release queues and database connections. A job that is still running when the
// platform's kill timeout hits is picked up again by another worker (BullMQ stalled-job handling).
let closing = false
async function shutdown(signal: string) {
  if (closing) return
  closing = true
  console.log(`[worker] ${signal} received, closing gracefully...`)
  try {
    await worker.close()
    await snapshotWorker.close()
    await cloudScansQueue.close()
    await dashboardSnapshotsQueue.close()
    await getTenantPrisma().$disconnect()
    await getSuperAdminPrisma().$disconnect()
  } catch (err) {
    console.error('[worker] error while closing', err)
  }
  process.exit(0)
}
process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT',  () => { void shutdown('SIGINT') })
