import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { auditController } from './audit.controller'

const router = Router()

router.get('/', authenticate, auditController.getLogs)

export default router
