import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
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


const app = express()

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://admin.dpdpcms.in']
    : ['http://localhost:5174'],
  credentials: true,
}))

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

// Error handler (must be last)
app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Admin API running on port ${config.port}`)
  console.log(`Environment: ${config.env}`)
})

export default app;