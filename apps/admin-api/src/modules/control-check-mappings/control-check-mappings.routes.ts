import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { controlCheckMappingsController } from './control-check-mappings.controller'

const router = Router()
router.use(authenticate)

router.get('/checks',   controlCheckMappingsController.browseChecks)
router.get('/',         controlCheckMappingsController.listMappings)
router.post('/',        controlCheckMappingsController.createMapping)
router.patch('/:id',    controlCheckMappingsController.updateMapping)
router.delete('/:id',   controlCheckMappingsController.deleteMapping)

export default router
