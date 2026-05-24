import { Router } from 'express'
import { regulationsController, regulationSectionsController } from './regulations.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', regulationsController.list)
router.post('/', regulationsController.create)
router.get('/:id', regulationsController.getById)
router.patch('/:id', regulationsController.update)
router.post('/:id/archive', regulationsController.archive)
router.post('/:id/controls', regulationsController.addControl)
router.delete('/:id/controls/:controlId', regulationsController.removeControl)
router.get('/:id/chapters', regulationsController.getChapters)
router.post('/:id/chapters', regulationsController.createChapter)
router.patch('/:id/chapters/:chapterId', regulationsController.updateChapter)
router.delete('/:id/chapters/:chapterId', regulationsController.deleteChapter)

router.get('/:id/chapters/:chapterId/sections',        regulationSectionsController.list)
router.post('/:id/chapters/:chapterId/sections',       regulationSectionsController.create)
router.patch('/:id/chapters/:chapterId/sections/:sid', regulationSectionsController.update)
router.delete('/:id/chapters/:chapterId/sections/:sid',regulationSectionsController.delete)

export default router