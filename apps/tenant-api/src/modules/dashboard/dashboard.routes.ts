import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { dashboardController } from './dashboard.controller'

const router = Router()

router.get('/stats', authenticate, dashboardController.getStats)
router.get('/history', authenticate, dashboardController.getHistory)

export default router
