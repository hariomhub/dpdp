import { Router } from 'express'
import { regulationsController } from './regulations.controller'
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

export default router