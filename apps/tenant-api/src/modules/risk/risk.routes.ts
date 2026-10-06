import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { riskController } from './risk.controller'

const router = Router()

router.use(authenticate)
router.get('/', riskController.getAnalysis)
router.get('/history', riskController.getHistory)

export default router
