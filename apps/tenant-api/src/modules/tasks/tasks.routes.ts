import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireRole } from '../../middleware/auth'
import { tasksController } from './tasks.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })
router.use(authenticate)

router.get('/',                    tasksController.list)
router.get('/assignable-users',    tasksController.getAssignableUsers)
router.get('/:id',                 tasksController.getOne)

// IT Admin actions
router.patch('/:id/start',         tasksController.start)
router.patch('/:id/submit',        tasksController.submit)
router.post('/:id/evidence',              upload.single('file'), tasksController.addEvidence)
router.patch('/:id/evidence/:evidenceId', upload.single('file'), tasksController.updateEvidence)
router.delete('/:id/evidence/:evidenceId', tasksController.deleteEvidence)

// IA actions
router.patch('/:id/review',        requireRole('INTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.review)

// External Auditor final sign-off (CO/CEO retain override access)
router.patch('/:id/signoff',       requireRole('EXTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.signoff)
router.patch('/:id/reject-final',  requireRole('EXTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.rejectFinal)

// Gap findings — recorded by whoever can reject a task
router.post('/:id/gap-findings',   upload.array('files', 10), requireRole('INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.addGapFinding)

// CO/CEO actions
router.patch('/:id/assign',        requireRole('CO', 'CEO'), tasksController.assign)

export default router