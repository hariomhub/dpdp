import { Router } from 'express'
import { lmsController, lmsDesignationController } from './lms.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()
router.use(authenticate)

// Courses
router.get('/courses', lmsController.listCourses)
router.post('/courses', lmsController.createCourse)
router.get('/courses/:id', lmsController.getCourseById)
router.patch('/courses/:id', lmsController.updateCourse)
router.put('/courses/:id/sync-content', lmsController.syncCourseContent)
router.post('/courses/:id/publish', lmsController.publishCourse)
router.post('/courses/:id/archive', lmsController.archiveCourse)

// Sections (nested under course)
router.post('/courses/:courseId/sections', lmsController.createSection)
router.patch('/courses/:courseId/sections/:sectionId', lmsController.updateSection)
router.delete('/courses/:courseId/sections/:sectionId', lmsController.deleteSection)

// Lessons (nested under section)
router.post('/courses/:courseId/sections/:sectionId/lessons', lmsController.createLesson)
router.patch('/courses/:courseId/sections/:sectionId/lessons/:lessonId', lmsController.updateLesson)
router.delete('/courses/:courseId/sections/:sectionId/lessons/:lessonId', lmsController.deleteLesson)

// Quiz (nested under section)
router.post('/courses/:courseId/sections/:sectionId/quiz', lmsController.createQuiz)
router.patch('/courses/:courseId/sections/:sectionId/quiz/:quizId', lmsController.updateQuiz)
router.post('/quizzes/:quizId/questions', lmsController.addQuestionToQuiz)

// Question Bank
router.get('/questions', lmsController.listQuestions)
router.post('/questions', lmsController.createQuestion)
router.patch('/questions/:id', lmsController.updateQuestion)

// Certificate Templates
router.get('/certificate-templates', lmsController.listCertificateTemplates)
router.post('/certificate-templates', lmsController.createCertificateTemplate)
router.patch('/certificate-templates/:id', lmsController.updateCertificateTemplate)

// ── Designations
router.get('/designations',                          lmsDesignationController.list)
router.post('/designations',                         lmsDesignationController.create)
router.patch('/designations/:id',                    lmsDesignationController.update)
router.delete('/designations/:id',                   lmsDesignationController.delete)

// ── Course ↔ Designation targeting
router.get('/courses/:courseId/designations',        lmsDesignationController.getCourseDesignations)
router.put('/courses/:courseId/designations',        lmsDesignationController.setCourseDesignations)

export default router