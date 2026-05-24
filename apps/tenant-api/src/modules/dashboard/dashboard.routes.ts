import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { dashboardController } from './dashboard.controller'

const router = Router()

router.get('/stats', authenticate, dashboardController.getStats)

export default router
