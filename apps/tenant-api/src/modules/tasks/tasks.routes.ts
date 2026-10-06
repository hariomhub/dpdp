import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { cleanupTempUploads, createUploader } from '../../storage/uploads'
import { tasksController } from './tasks.controller'

const router = Router()
// Uploads stream to a temp file (not into memory) and are validated + moved into storage by the service.
// cleanupTempUploads must come first so the temp file is removed whatever the outcome.
const upload = createUploader()
const uploadMany = createUploader({ maxFiles: 10 })
router.use(authenticate)

router.get('/',                    tasksController.list)
router.get('/assignable-users',    tasksController.getAssignableUsers)
router.get('/:id',                 tasksController.getOne)

// IT Admin actions
router.patch('/:id/start',         tasksController.start)
router.patch('/:id/submit',        tasksController.submit)
router.post('/:id/evidence',               cleanupTempUploads, upload.single('file'), tasksController.addEvidence)
router.patch('/:id/evidence/:evidenceId',  cleanupTempUploads, upload.single('file'), tasksController.updateEvidence)
router.delete('/:id/evidence/:evidenceId', tasksController.deleteEvidence)

// IA actions
router.patch('/:id/review',        requireRole('INTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.review)

// External Auditor final sign-off (CO/CEO retain override access)
router.patch('/:id/signoff',       requireRole('EXTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.signoff)
router.patch('/:id/reject-final',  requireRole('EXTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.rejectFinal)

// Gap findings — recorded by whoever can reject a task
router.post('/:id/gap-findings',   requireRole('INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR', 'CO', 'CEO'), cleanupTempUploads, uploadMany.array('files', 10), tasksController.addGapFinding)

// CO/CEO actions
router.patch('/:id/assign',        requireRole('CO', 'CEO'), tasksController.assign)

export default router
