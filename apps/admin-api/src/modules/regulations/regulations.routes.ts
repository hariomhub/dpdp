import { Router } from 'express'
import {
  regulationsController,
  regulationSectionsController,
  regulationNodesController,
  regulationApplicabilityController,
} from './regulations.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.use(authenticate)

router.get('/', regulationsController.list)
router.post('/', regulationsController.create)
router.get('/:id', regulationsController.getById)
router.patch('/:id', regulationsController.update)
router.post('/:id/archive', regulationsController.archive)
router.delete('/:id', regulationsController.deleteRegulation)
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

// ─── Generic node tree (appended) ─────────────────────────────────────────
router.get('/:id/nodes', regulationNodesController.list)
router.post('/:id/nodes', regulationNodesController.create)
router.patch('/:id/nodes/:nodeId', regulationNodesController.update)
router.delete('/:id/nodes/:nodeId', regulationNodesController.delete)
router.post('/:id/nodes/:nodeId/move', regulationNodesController.move)

router.get('/:id/nodes/:nodeId/applicability', regulationApplicabilityController.listNodeApplicabilities)
router.post('/:id/nodes/:nodeId/applicability', regulationApplicabilityController.setNodeApplicability)

// ─── Applicability categories (appended) ──────────────────────────────────
router.get('/:id/applicability-categories', regulationApplicabilityController.listCategories)
router.post('/:id/applicability-categories', regulationApplicabilityController.createCategory)
router.patch('/:id/applicability-categories/:categoryId', regulationApplicabilityController.updateCategory)
router.delete('/:id/applicability-categories/:categoryId', regulationApplicabilityController.deleteCategory)

export default router