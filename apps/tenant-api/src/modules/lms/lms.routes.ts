import { Router } from 'express'
import multer from 'multer'
import { authenticate, requireRole } from '../../middleware/auth'
import { lmsController } from './lms.controller'
import { config } from '../../config'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 } })
router.use(authenticate)

// All authenticated users
router.get('/courses',                                     lmsController.getCourses)
router.post('/courses/:courseId/enroll',                   lmsController.enroll)
router.delete('/courses/:courseId/enroll',                  lmsController.unenroll)
router.get('/certificates',                                lmsController.getCertificates)
router.get('/my-performance',                              lmsController.getMyPerformance)
router.get('/certificates/:code',                          lmsController.getCertificateByCode)
router.get('/designations',                                lmsController.getDesignations)
router.patch('/enrollments/:enrollmentId/lessons/:lessonId/complete', lmsController.markLessonComplete)
router.post('/enrollments/:enrollmentId/quiz/:quizId/submit',         lmsController.submitQuiz)
router.get('/enrollments/:enrollmentId/quiz/:quizId/review',          lmsController.getQuizReview)
router.post('/enrollments/:enrollmentId/lessons/:lessonId/submit',    upload.single('file'), lmsController.submitAssignment)

// CO / CEO only
router.get('/coverage',                                     requireRole('CO', 'CEO'), lmsController.getCoverage)
router.patch('/users/:userId/designation',                 requireRole('CO', 'CEO'), lmsController.setUserDesignation)
router.post('/users/bulk-designation',                     requireRole('CO', 'CEO'), lmsController.bulkSetDesignation)
router.get('/role-defaults',                               requireRole('CO', 'CEO'), lmsController.getRoleDefaults)
router.post('/role-defaults',                               requireRole('CO', 'CEO'), lmsController.setRoleDefaults)
router.post('/role-defaults/:role/apply-existing',          requireRole('CO', 'CEO'), lmsController.applyRoleDefaultToExisting)

export default router