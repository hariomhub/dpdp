import { Router } from 'express'
import { dashboardController } from './dashboard.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/stats', dashboardController.getStats)

export default router