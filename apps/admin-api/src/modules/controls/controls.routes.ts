import { Router } from 'express'
import { controlsController } from './controls.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', controlsController.list)
router.post('/', controlsController.create)
router.get('/:id', controlsController.getById)
router.patch('/:id', controlsController.update)
router.post('/:id/publish', controlsController.publish)
router.post('/:id/deactivate', controlsController.deactivate)
router.post('/:id/actions', controlsController.addPredefinedAction)
router.delete('/:id/actions/:actionId', controlsController.removePredefinedAction)

export default router