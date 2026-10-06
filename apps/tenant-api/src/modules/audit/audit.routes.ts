import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { AUDIT_LOG_VIEWER_ROLES } from '../../utils/roles'
import { auditController } from './audit.controller'

const router = Router()

// The audit log records what every person did, so reading it is limited to those with a job-related need.
router.get('/', authenticate, requireRole(...AUDIT_LOG_VIEWER_ROLES), auditController.getLogs)

export default router
