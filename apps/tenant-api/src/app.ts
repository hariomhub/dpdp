import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import authRoutes from './modules/auth/auth.routes'
import onboardingRoutes from './modules/onboarding/onboarding.routes'
import entraRoutes from './modules/entra/entra.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import orgRoutes from './modules/org/org.routes'
import auditRoutes from './modules/audit/audit.routes'
import usersRoutes from './modules/users/users.routes'
import assessmentsRoutes from './modules/assessments/assessments.routes'
import tasksRoutes from './modules/tasks/tasks.routes'
import lmsRoutes from './modules/lms/lms.routes'

const app = express()

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// In production, the frontend and API are served from the same domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? true // allow same-origin implicitly by not restricting tightly
    : ['http://localhost:5173'],
  credentials: true,
}))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use(limiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tenant-api',
    version: '1.0.0',
  })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/onboarding', onboardingRoutes)
app.use('/api/v1/entra', entraRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/org', orgRoutes)
app.use('/api/v1/audit-log', auditRoutes)
app.use('/api/v1/assessments', assessmentsRoutes)
app.use('/api/v1/users', usersRoutes)
app.use('/api/v1/tasks', tasksRoutes)
app.use('/api/v1/lms', lmsRoutes)

app.use(errorHandler)

// ─── STATIC SERVING & SPA FALLBACK (Production) ─────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public')
  app.use(express.static(publicPath))
  
  // SPA fallback - must be the very last route
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'))
  })
}

app.listen(config.port, () => {
  console.log(`Tenant API running on port ${config.port}`)
  console.log(`Environment: ${config.env}`)
})

export default app