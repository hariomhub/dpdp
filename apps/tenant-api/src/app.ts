// Entry point of the API process. Keep these two imports first: the settings are loaded and validated before any
// module that creates a database client or reads a setting runs.
import './config/boot-check'
import { config } from './config'
import path from 'path'
import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { createApp } from './create-app'
import { cachedReadiness, databaseProbe, migrationsProbe, redisProbe, objectStoreProbe, localDiskProbe, Probe } from './health'
import { createShutdown } from './shutdown'
import { cloudScansQueue } from './queue/queues'
import { dashboardSnapshotsQueue } from './queue/snapshot-queue'
import { azureEvidenceStore } from './storage/stores'
import { activateFromConfiguration } from './platform/boot-activation'

let shuttingDown = false

const tenantDb = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

const probes: Probe[] = [
  databaseProbe('database', tenantDb as any),
  // Until the decoupling work removes it, the portal cannot work without the Super Admin database.
  databaseProbe('superAdminDatabase', superAdminDb as any),
  migrationsProbe(tenantDb as any),
  redisProbe(() => cloudScansQueue.getJobCounts('waiting')),
  config.storage.provider === 'azure'
    ? objectStoreProbe(azureEvidenceStore())
    : localDiskProbe(path.resolve(process.cwd(), config.storage.uploadDir), config.runtime.storageMinFreeMb),
]

const readiness = cachedReadiness(probes)
const app = createApp({ readiness: readiness.get, isShuttingDown: () => shuttingDown })

const server = app.listen(config.port, () => {
  console.log(`Tenant API ${config.platform.version} running on port ${config.port}`)
  console.log(`Environment: ${config.env}`)
  if (config.licence.mode === 'off') console.warn('[licence] LICENCE_MODE=off: licences are NOT being enforced (development only).')
  void activateFromConfiguration()
})

// Load balancers reuse connections for a while; Node's default 5 s keep-alive would close them first and surface as 502s.
server.keepAliveTimeout = 65_000
server.headersTimeout = 66_000

const shutdown = createShutdown({
  server,
  markNotReady: () => { shuttingDown = true },
  graceMs: config.runtime.shutdownGraceSeconds * 1000,
  closers: [
    { name: 'cloud-scans queue',         close: () => cloudScansQueue.close() },
    { name: 'dashboard-snapshots queue', close: () => dashboardSnapshotsQueue.close() },
    { name: 'tenant database',           close: () => tenantDb.$disconnect() },
    { name: 'super admin database',      close: () => superAdminDb.$disconnect() },
  ],
  exit: (code) => process.exit(code),
})
process.on('SIGTERM', () => { void shutdown('SIGTERM') })
process.on('SIGINT',  () => { void shutdown('SIGINT') })

export default app
