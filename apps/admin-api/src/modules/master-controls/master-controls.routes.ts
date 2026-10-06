import { Router } from 'express'
import { masterControlsController } from './master-controls.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()
router.use(authenticate)

router.get('/', masterControlsController.list)
router.post('/', masterControlsController.create)
router.get('/:id', masterControlsController.getById)
router.patch('/:id', masterControlsController.update)
router.delete('/:id', masterControlsController.delete)

router.post('/:id/actions', masterControlsController.createAction)
router.patch('/:id/actions/:actionId', masterControlsController.updateAction)
router.delete('/:id/actions/:actionId', masterControlsController.deleteAction)

export default router
