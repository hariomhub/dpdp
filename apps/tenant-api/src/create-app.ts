import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import { requestId } from './middleware/request-id'
import { apiLimiter } from './middleware/rate-limit'
import { buildCorsOptions, buildHelmetOptions } from './security/http-security'
import type { Readiness } from './health'
import filesRoutes from './modules/files/files.routes'
import authRoutes from './modules/auth/auth.routes'
import onboardingRoutes from './modules/onboarding/onboarding.routes'
import entraRoutes from './modules/entra/entra.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import orgRoutes from './modules/org/org.routes'
import auditRoutes from './modules/audit/audit.routes'
import usersRoutes from './modules/users/users.routes'
import assessmentsRoutes from './modules/assessments/assessments.routes'
import controlsRoutes from './modules/controls/controls.routes'
import riskRoutes from './modules/risk/risk.routes'
import tasksRoutes from './modules/tasks/tasks.routes'
import lmsRoutes from './modules/lms/lms.routes'
import cloudConnectionsRoutes from './modules/cloud-connections/cloud-connections.routes'
import discoveryRoutes from './modules/discovery/discovery.routes'
import platformRoutes from './modules/platform/platform.routes'

export interface AppRuntime {
  /** Resolves the current readiness (cached for a few seconds). */
  readiness: () => Promise<Readiness>
  /** True once shutdown has started: /ready then answers 503 immediately. */
  isShuttingDown: () => boolean
}

// Behind a reverse proxy (Azure App Service, nginx, an ingress...) every request would otherwise appear to come
// from the proxy's address, which breaks per-client rate limiting and makes the audit log's IPs useless.
export function parseTrustProxy(v: string): boolean | number | string {
  if (v === 'true') return true
  if (v === 'false') return false
  const n = Number(v)
  return Number.isInteger(n) ? n : v
}

/** The Express application, without listening - so it can be started by app.ts and exercised by tests. */
export function createApp(runtime: AppRuntime) {
  const app = express()

  app.set('trust proxy', parseTrustProxy(config.security.trustProxy))
  app.disable('x-powered-by')

  app.use(requestId)

  const https = (config.platform.tenantAppUrl || '').startsWith('https:')
  app.use(helmet(buildHelmetOptions({ cspMode: config.security.cspMode, https })))

  app.use(cors(buildCorsOptions({
    appUrl: config.platform.tenantAppUrl,
    extraOrigins: config.security.corsAllowedOrigins,
    production: config.env === 'production',
  })))

  // Probes: outside /api, so they are neither rate limited nor behind login.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'tenant-api', version: config.platform.version })
  })

  app.get('/ready', async (_req, res) => {
    if (runtime.isShuttingDown()) return res.status(503).json({ status: 'shutting_down' })
    const r = await runtime.readiness()
    res.status(r.ready ? 200 : 503).json({ status: r.ready ? 'ready' : 'not_ready', checks: r.checks })
  })

  app.get('/version', (_req, res) => {
    res.json({ service: 'tenant-api', version: config.platform.version, commit: config.platform.commit })
  })

  // Limits apply to API calls only (not the SPA's static files or the probes), per signed-in user rather than per IP.
  app.use('/api', apiLimiter)

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  // NOTE: there is deliberately no static route for uploaded files. They used to be served from /uploads on the app's
  // own origin with no login; every file is now opened through the authenticated /api/v1/files endpoints.

  app.use('/api/v1/platform', platformRoutes)
  app.use('/api/v1/auth', authRoutes)
  app.use('/api/v1/onboarding', onboardingRoutes)
  app.use('/api/v1/entra', entraRoutes)
  app.use('/api/v1/dashboard', dashboardRoutes)
  app.use('/api/v1/org', orgRoutes)
  app.use('/api/v1/audit-log', auditRoutes)
  app.use('/api/v1/assessments', assessmentsRoutes)
  app.use('/api/v1/controls', controlsRoutes)
  app.use('/api/v1/risk', riskRoutes)
  app.use('/api/v1/users', usersRoutes)
  app.use('/api/v1/tasks', tasksRoutes)
  app.use('/api/v1/lms', lmsRoutes)
  app.use('/api/v1/cloud-connections', cloudConnectionsRoutes)
  app.use('/api/v1/discovery', discoveryRoutes)
  app.use('/api/v1/files', filesRoutes)

  // An unknown API path is a 404 for the caller, not the SPA's HTML page.
  app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Not found' }))

  app.use(errorHandler)

  // ─── STATIC SERVING & SPA FALLBACK (Production) ─────────────────────────────
  if (config.env === 'production') {
    const publicPath = path.join(__dirname, '../public')
    app.use(express.static(publicPath, {
      setHeaders: (res, filePath) => {
        // The build fingerprints files under /assets, so they never change under the same name; the HTML shell must
        // be re-fetched so a new release is picked up at once.
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
        else if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      },
    }))

    // SPA fallback - must be the very last route
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(publicPath, 'index.html'))
    })
  }

  return app
}
