import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { assessmentsController } from './assessments.controller'

const router = Router()

// All assessment routes require authentication
router.use(authenticate)

// GET operations
router.get('/it-admins', assessmentsController.getDeptItAdmins)
router.get('/regulations', assessmentsController.listRegulations)
router.get('/assets', assessmentsController.listAssets)
router.get('/', assessmentsController.listAssessments)
router.get('/:id', assessmentsController.getAssessment)

// Write operations require CO (Compliance Officer)
const canWrite = requireRole('CO')

router.post('/', canWrite, assessmentsController.createAssessment)

export default router