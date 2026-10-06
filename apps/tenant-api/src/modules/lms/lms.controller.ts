import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { z } from 'zod'
import { checkUploadedFile, SNIFF_BYTES } from '@dpdp/storage'
import { config } from '../../config'
import { HttpError } from '../../utils/http-error'
import { lmsService } from './lms.service'

const designationName = z.string().trim().min(1).max(120)
const setDesignationSchema = z.object({ designation: designationName.nullable().optional() })
const bulkDesignationSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1, 'Select at least one user').max(1000),
  designation: designationName,
})

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
  async unenroll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.unenroll(req.tenantId!, req.userId!, req.params.courseId) })
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
  async getQuizReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.getQuizReview(req.tenantId!, req.userId!, req.params.enrollmentId, req.params.quizId)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async getCertificates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getCertificates(req.tenantId!, req.userId!) })
    } catch (err) { next(err) }
  },
  async getMyPerformance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getMyPerformance(req.tenantId!, req.userId!) })
    } catch (err) { next(err) }
  },
  async getCertificateByCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getCertificateByCode(req.tenantId!, req.userId!, req.params.code) })
    } catch (err) { next(err) }
  },
  async submitAssignment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { uploadLmsFile, getSignedUrl } = await import('../../utils/storage')
      let file: { fileUrl: string; fileName: string; fileSize: number } | undefined
      if (req.file) {
        // Same rule as evidence uploads: an allow-listed type whose content matches its extension. The content type
        // stored with the blob comes from that check, never from what the browser claimed.
        const check = checkUploadedFile(
          { originalName: req.file.originalname, head: req.file.buffer.subarray(0, SNIFF_BYTES) },
          { allowedExtensions: config.storage.allowedExtensions.length ? config.storage.allowedExtensions : undefined },
        )
        if (!check.ok) throw HttpError.badRequest(check.reason)
        req.file.mimetype = check.contentType
        req.file.originalname = check.safeName
        const stored = await uploadLmsFile(req.file, req.params.enrollmentId, 'submission')
        file = { fileUrl: stored.fileUrl, fileName: stored.fileName, fileSize: stored.fileSize }
      }
      const data = await lmsService.submitAssignment(
        req.tenantId!, req.userId!, req.params.enrollmentId, req.params.lessonId,
        { textAnswer: req.body?.textAnswer || undefined, file }
      )
      res.status(201).json({ success: true, data: { ...data, fileUrl: getSignedUrl((data as any).fileUrl) } })
    } catch (err) { next(err) }
  },
  async getDesignations(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getDesignations() })
    } catch (err) { next(err) }
  },
  async setUserDesignation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { designation } = setDesignationSchema.parse(req.body ?? {})
      const data = await lmsService.setUserDesignation(req.tenantId!, req.userId!, req.params.userId, designation ?? null)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async bulkSetDesignation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = bulkDesignationSchema.parse(req.body ?? {})
      const data = await lmsService.bulkSetDesignation(req.tenantId!, req.userId!, body.userIds, body.designation)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async getCoverage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await lmsService.getCoverage(req.tenantId!) })
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
  async applyRoleDefaultToExisting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await lmsService.applyRoleDefaultToExisting(req.tenantId!, req.userId!, req.params.role as any)
      res.json({ success: true, data, message: `Applied to ${data.usersUpdated} existing user(s)` })
    } catch (err) { next(err) }
  },
}