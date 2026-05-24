import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { controlFamiliesController } from './control-families.controller'

const router = Router()
router.use(authenticate)

router.get('/',                                      controlFamiliesController.list)
router.get('/:id',                                   controlFamiliesController.getById)
router.post('/',                                     controlFamiliesController.create)
router.patch('/:id',                                 controlFamiliesController.update)
router.delete('/:id',                                controlFamiliesController.delete)
router.post('/:id/controls',                         controlFamiliesController.addControls)
router.delete('/:id/controls/:controlId',            controlFamiliesController.removeControl)

export default router