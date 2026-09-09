import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { controlsController } from './controls.controller'

const router = Router()

router.use(authenticate)

router.get('/', controlsController.list)
router.get('/:id', controlsController.getById)
router.post('/', requireRole('CEO', 'CO'), controlsController.create)

export default router
