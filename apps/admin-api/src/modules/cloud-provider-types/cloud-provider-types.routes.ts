import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { cloudProviderTypesController } from './cloud-provider-types.controller'

const router = Router()
router.use(authenticate)

router.get('/',            cloudProviderTypesController.listProviders)
router.post('/',           cloudProviderTypesController.createProvider)
router.patch('/:id',       cloudProviderTypesController.updateProvider)
router.patch('/:id/active', cloudProviderTypesController.toggleActive)

export default router
