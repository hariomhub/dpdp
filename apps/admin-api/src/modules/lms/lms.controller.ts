import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { lmsService } from './lms.service'
import { AuthRequest } from '../../middleware/auth'
import {
  CourseStatus, CourseDifficulty, CourseCategory,
  LessonType, VideoSource, ReadingContentType,
  AssignmentSubmissionType, QuestionType, Difficulty,
  EvidenceType, CertLayout
} from '@prisma/super-admin-client'

const createCourseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.nativeEnum(CourseCategory),
  difficulty: z.nativeEnum(CourseDifficulty),
  estimatedHours: z.number().int().min(0).default(0),
  estimatedMinutes: z.number().int().min(0).max(59).default(0),
  thumbnailUrl: z.string().url().optional(),
  status: z.nativeEnum(CourseStatus).default(CourseStatus.DRAFT),
  certificateTemplateId: z.string().uuid().optional(),
})

const updateCourseSchema = createCourseSchema.partial()

const createSectionSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  orderIndex: z.number().int().min(0).default(0),
})

const createLessonSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  type: z.nativeEnum(LessonType),
  orderIndex: z.number().int().min(0).default(0),
  videoSource: z.nativeEnum(VideoSource).optional(),
  videoUrl: z.string().optional(),
  videoDurationS: z.number().int().optional(),
  readingContentType: z.nativeEnum(ReadingContentType).optional(),
  readingContent: z.string().optional(),
  assignmentInstructions: z.string().optional(),
  assignmentSubmissionType: z.nativeEnum(AssignmentSubmissionType).optional(),
})

const createQuizSchema = z.object({
  title: z.string().min(2),
  passThreshold: z.number().int().min(1).max(100).default(70),
  timeLimitMins: z.number().int().min(1).optional(),
})

const createQuestionSchema = z.object({
  quizId: z.string().uuid().optional(),
  questionText: z.string().min(5),
  type: z.nativeEnum(QuestionType),
  marks: z.number().int().min(1).default(1),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  topic: z.string().optional(),
  orderIndex: z.number().int().optional(),
  tfCorrectAnswer: z.boolean().optional(),
  modelAnswer: z.string().optional(),
  wordLimit: z.number().int().optional(),
  options: z.array(z.object({
    optionText: z.string().min(1),
    isCorrect: z.boolean(),
    orderIndex: z.number().int(),
  })).optional(),
})

const createCertTemplateSchema = z.object({
  name: z.string().min(2),
  layout: z.nativeEnum(CertLayout).default(CertLayout.CLASSIC),
  titleText: z.string().default('Certificate of Completion'),
  bodyText: z.string().min(10),
  signatory: z.string().optional(),
  designation: z.string().optional(),
  bgColor: z.string().default('#FFFFFF'),
  isDefault: z.boolean().default(false),
})

export const lmsController = {
  // Courses
  async listCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await lmsService.listCourses(req.query as Record<string, unknown>)
      res.json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  async getCourseById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const course = await lmsService.getCourseById(req.params.id)
      res.json({ success: true, data: course })
    } catch (err) { next(err) }
  },

  async createCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createCourseSchema.parse(req.body)
      const course = await lmsService.createCourse({ ...body, adminId: req.adminId! })
      res.status(201).json({ success: true, data: course, message: 'Course created' })
    } catch (err) { next(err) }
  },

  async updateCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateCourseSchema.parse(req.body)
      const course = await lmsService.updateCourse({
        id: req.params.id, data: body, adminId: req.adminId!
      })
      res.json({ success: true, data: course, message: 'Course updated' })
    } catch (err) { next(err) }
  },

  async publishCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const course = await lmsService.publishCourse(req.params.id, req.adminId!)
      res.json({ success: true, data: course, message: 'Course published' })
    } catch (err) { next(err) }
  },

  async archiveCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const course = await lmsService.archiveCourse(req.params.id, req.adminId!)
      res.json({ success: true, data: course, message: 'Course archived' })
    } catch (err) { next(err) }
  },

  // Sections
  async createSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSectionSchema.parse(req.body)
      const section = await lmsService.createSection({
        courseId: req.params.courseId, ...body
      })
      res.status(201).json({ success: true, data: section, message: 'Section created' })
    } catch (err) { next(err) }
  },

  async updateSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSectionSchema.partial().parse(req.body)
      const section = await lmsService.updateSection(req.params.sectionId, body)
      res.json({ success: true, data: section, message: 'Section updated' })
    } catch (err) { next(err) }
  },

  async deleteSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await lmsService.deleteSection(req.params.sectionId)
      res.json({ success: true, message: result.message })
    } catch (err) { next(err) }
  },

  // Lessons
  async createLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createLessonSchema.parse(req.body)
      const lesson = await lmsService.createLesson({
        sectionId: req.params.sectionId, ...body
      })
      res.status(201).json({ success: true, data: lesson, message: 'Lesson created' })
    } catch (err) { next(err) }
  },

  async updateLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createLessonSchema.partial().parse(req.body)
      const lesson = await lmsService.updateLesson(req.params.lessonId, body)
      res.json({ success: true, data: lesson, message: 'Lesson updated' })
    } catch (err) { next(err) }
  },

  async deleteLesson(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await lmsService.deleteLesson(req.params.lessonId)
      res.json({ success: true, message: result.message })
    } catch (err) { next(err) }
  },

  // Quiz
  async createQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createQuizSchema.parse(req.body)
      const quiz = await lmsService.createQuiz({
        sectionId: req.params.sectionId, ...body
      })
      res.status(201).json({ success: true, data: quiz, message: 'Quiz created' })
    } catch (err) { next(err) }
  },

  async updateQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createQuizSchema.partial().parse(req.body)
      const quiz = await lmsService.updateQuiz(req.params.quizId, body)
      res.json({ success: true, data: quiz, message: 'Quiz updated' })
    } catch (err) { next(err) }
  },

  // Questions
  async listQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await lmsService.listQuestions(req.query as Record<string, unknown>)
      res.json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  async createQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createQuestionSchema.parse(req.body)
      const question = await lmsService.createQuestion({ ...body, adminId: req.adminId! })
      res.status(201).json({ success: true, data: question, message: 'Question created' })
    } catch (err) { next(err) }
  },

  async updateQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createQuestionSchema.partial().parse(req.body)
      const question = await lmsService.updateQuestion({
        id: req.params.id, data: body, adminId: req.adminId!
      })
      res.json({ success: true, data: question, message: 'Question updated' })
    } catch (err) { next(err) }
  },

  async addQuestionToQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { questionId } = z.object({ questionId: z.string().uuid() }).parse(req.body)
      const result = await lmsService.addQuestionToQuiz(req.params.quizId, questionId)
      res.json({ success: true, data: result, message: 'Question added to quiz' })
    } catch (err) { next(err) }
  },

  // Certificate Templates
  async listCertificateTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const templates = await lmsService.listCertificateTemplates()
      res.json({ success: true, data: templates })
    } catch (err) { next(err) }
  },

  async createCertificateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createCertTemplateSchema.parse(req.body)
      const template = await lmsService.createCertificateTemplate({
        ...body, adminId: req.adminId!
      })
      res.status(201).json({ success: true, data: template, message: 'Template created' })
    } catch (err) { next(err) }
  },

  async updateCertificateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createCertTemplateSchema.partial().parse(req.body)
      const template = await lmsService.updateCertificateTemplate({
        id: req.params.id, data: body, adminId: req.adminId!
      })
      res.json({ success: true, data: template, message: 'Template updated' })
    } catch (err) { next(err) }
  },
}