import { Router } from 'express'
import { auditController } from './audit.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', auditController.list)

export default router