import { Worker, Job } from 'bullmq'
import { CLOUD_SCANS_QUEUE_NAME, JOB_NAMES } from './queue/queues'
import { getRedisConnectionOptions } from './queue/redis-connection'
import { processConnectionTest } from './queue/processors/connection-test.processor'
import { processDiscoveryScan } from './queue/processors/discovery-scan.processor'

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

console.log(`[worker] Listening on queue "${CLOUD_SCANS_QUEUE_NAME}"...`)

process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received, closing gracefully...')
  await worker.close()
  process.exit(0)
})
