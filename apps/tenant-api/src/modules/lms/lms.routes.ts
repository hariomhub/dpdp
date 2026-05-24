import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { lmsController } from './lms.controller'

const router = Router()
router.use(authenticate)

// All authenticated users
router.get('/courses',                                     lmsController.getCourses)
router.post('/courses/:courseId/enroll',                   lmsController.enroll)
router.get('/certificates',                                lmsController.getCertificates)
router.get('/designations',                                lmsController.getDesignations)
router.patch('/enrollments/:enrollmentId/lessons/:lessonId/complete', lmsController.markLessonComplete)
router.post('/enrollments/:enrollmentId/quiz/:quizId/submit',         lmsController.submitQuiz)

// CO / CEO only
router.patch('/users/:userId/designation',                 requireRole('CO', 'CEO'), lmsController.setUserDesignation)
router.post('/users/bulk-designation',                     requireRole('CO', 'CEO'), lmsController.bulkSetDesignation)
router.get('/role-defaults',                               requireRole('CO', 'CEO'), lmsController.getRoleDefaults)
router.post('/role-defaults',                               requireRole('CO', 'CEO'), lmsController.setRoleDefaults)

export default router