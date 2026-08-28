import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { genericAssetTemplatesController } from './generic-asset-templates.controller'

const router = Router()
router.use(authenticate)

router.get('/',      genericAssetTemplatesController.listTemplates)
router.post('/',     genericAssetTemplatesController.createTemplate)
router.patch('/:id', genericAssetTemplatesController.updateTemplate)
router.delete('/:id', genericAssetTemplatesController.deleteTemplate)

export default router
