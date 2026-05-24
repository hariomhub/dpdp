import { Router } from 'express'
import multer from 'multer'
import { controlsController } from './controls.controller'
import { authenticate } from '../../middleware/auth'

const router  = Router()
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

router.use(authenticate)

// ── Control CRUD ──────────────────────────────────────────────────────────────
router.get('/',    controlsController.list)
router.post('/',   controlsController.create)
router.get('/:id', controlsController.getById)
router.patch('/:id',      controlsController.update)
router.delete('/:id',     (controlsController as any).deleteControl)
router.post('/:id/publish',    controlsController.publish)
router.post('/:id/deactivate', controlsController.deactivate)

// ── Actions ───────────────────────────────────────────────────────────────────
router.post('/:id/actions',                    controlsController.addPredefinedAction)
router.patch('/:id/actions/:actionId',         (controlsController as any).updateAction)
router.delete('/:id/actions/:actionId',        controlsController.removePredefinedAction)
router.put('/:id/actions/:actionId/products',  (controlsController as any).setActionProducts)

// ── Master Evidence ───────────────────────────────────────────────────────────
router.post(
  '/:id/actions/:actionId/products/:productId/master-evidence',
  upload.single('file'),
  (controlsController as any).createMasterEvidence
)
router.delete(
  '/:id/actions/:actionId/products/:productId/master-evidence/:evidenceId',
  (controlsController as any).deleteMasterEvidence
)

export default router