import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { lmsService } from './lms.service'

export const lmsController = {
  async getCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getCourses(req.tenantId!, req.userId!) })
    } catch (err) { next(err) }
  },
  async enroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.enroll(req.tenantId!, req.userId!, req.params.courseId) })
    } catch (err) { next(err) }
  },
  async markLessonComplete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await lmsService.markLessonComplete(req.tenantId!, req.userId!, req.params.enrollmentId, req.params.lessonId)
      res.json({ success: true })
    } catch (err) { next(err) }
  },
  async submitQuiz(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.submitQuiz(req.tenantId!, req.userId!, req.params.enrollmentId, req.params.quizId, req.body.answers)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async getCertificates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getCertificates(req.tenantId!, req.userId!) })
    } catch (err) { next(err) }
  },
  async getDesignations(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getDesignations() })
    } catch (err) { next(err) }
  },
  async setUserDesignation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.setUserDesignation(req.tenantId!, req.userId!, req.params.userId, req.body.designation ?? null)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async bulkSetDesignation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.bulkSetDesignation(req.tenantId!, req.userId!, req.body.userIds, req.body.designation)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async getRoleDefaults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getRoleDefaults(req.tenantId!) })
    } catch (err) { next(err) }
  },
  async setRoleDefaults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.setRoleDefaults(req.tenantId!, req.userId!, req.body.mappings)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
}