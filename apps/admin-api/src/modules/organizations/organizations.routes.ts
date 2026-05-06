import { Router } from 'express'
import { organizationsController } from './organizations.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', organizationsController.list)
router.post('/', organizationsController.create)
router.get('/:id', organizationsController.getById)
router.patch('/:id', organizationsController.update)
router.post('/:id/suspend', organizationsController.suspend)
router.post('/:id/activate', organizationsController.activate)
router.post('/:id/resend-invite', organizationsController.resendInvite)

export default router