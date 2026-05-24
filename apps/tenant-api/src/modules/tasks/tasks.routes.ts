import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { tasksController } from './tasks.controller'

const router = Router()
router.use(authenticate)

router.get('/',                    tasksController.list)
router.get('/assignable-users',    tasksController.getAssignableUsers)
router.get('/:id',                 tasksController.getOne)

// IT Admin actions
router.patch('/:id/start',         tasksController.start)
router.patch('/:id/submit',        tasksController.submit)

// IA actions
router.patch('/:id/review',        requireRole('INTERNAL_AUDITOR', 'CO', 'CEO'), tasksController.review)

// CO/CEO actions
router.patch('/:id/signoff',       requireRole('CO', 'CEO'), tasksController.signoff)
router.patch('/:id/reject-final',  requireRole('CO', 'CEO'), tasksController.rejectFinal)
router.patch('/:id/assign',        requireRole('CO', 'CEO'), tasksController.assign)

export default router