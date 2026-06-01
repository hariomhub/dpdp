import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import rateLimit from 'express-rate-limit'
import { config } from './config'
import { errorHandler } from './middleware/error-handler'
import authRoutes from './modules/auth/auth.routes'
import organizationRoutes from './modules/organizations/organizations.routes'
import regulationRoutes from './modules/regulations/regulations.routes'
import controlRoutes from './modules/controls/controls.routes'
import lmsRoutes from './modules/lms/lms.routes'
import auditRoutes from './modules/audit/audit.routes'
import dashboardRoutes from './modules/dashboard/dashboard.routes'
import controlFamilyRoutes from './modules/control-families/control-families.routes'
import productFamilyRoutes from './modules/product-families/product-families.routes'


const app = express()

// Security middleware
app.use(helmet({
  // Allow same-origin iframe embeds if needed; tighten in production
  contentSecurityPolicy: false,
}))
// CORS: only needed if a *separate* frontend origin calls this API.
// When serving the frontend from this same Express server (same origin),
// CORS is not required. Keeping it here for dev convenience.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false  // same-origin — no CORS headers needed
    : ['http://localhost:5174'],
  credentials: true,
}))

// Serve super-admin static build (must be declared before API routes
// so assets are served fast, but AFTER cors/helmet/rate-limit middleware)
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '..', 'public')
  app.use(express.static(publicDir))
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
})
app.use(limiter)

// Body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-api' })
})

// Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/organizations', organizationRoutes)
app.use('/api/v1/regulations', regulationRoutes)
app.use('/api/v1/controls', controlRoutes)
app.use('/api/v1/lms', lmsRoutes)
app.use('/api/v1/audit-logs', auditRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/control-families', controlFamilyRoutes)
app.use('/api/v1/product-families', productFamilyRoutes)

// SPA fallback: serve index.html for any non-API route
// This makes React Router's client-side routing work on hard refresh / direct URL
if (process.env.NODE_ENV === 'production') {
  const publicDir = path.join(__dirname, '..', 'public')
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

// Error handler (must be last)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Admin API running on port ${config.port}`)
  console.log(`Environment: ${config.env}`)
})

export default app;