import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { tasksService } from './tasks.service'
import { EvidenceType, GapReasonCode } from '@prisma/tenant-client'
import { uploadFile } from '../../utils/storage'

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note:     z.string().max(1000).optional(),
})

const submitSchema = z.object({
  note: z.string().max(1000).optional(),
})

const assignSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
})

const rejectSchema = z.object({
  note: z.string().max(1000).optional(),
})

const evidenceActionTagSchema = z.object({
  actionId:   z.string().uuid(),
  productId:  z.string().uuid().optional(),
  otherLabel: z.string().max(200).optional(),
})

// multipart/form-data sends every field as a string, so `actions` arrives JSON-encoded
const addEvidenceSchema = z.object({
  title:       z.string().min(2).max(200),
  type:        z.nativeEnum(EvidenceType),
  description: z.string().max(2000).optional(),
  linkUrl:     z.string().url().optional(),
  textContent: z.string().max(5000).optional(),
  actions:     z.string().transform(s => JSON.parse(s)).pipe(z.array(evidenceActionTagSchema).min(1)),
})

const updateEvidenceSchema = z.object({
  title:       z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  linkUrl:     z.string().url().optional(),
  textContent: z.string().max(5000).optional(),
})

// multipart/form-data sends every field as a string, so `actionIds` arrives JSON-encoded
const addGapFindingSchema = z.object({
  reasonCodes: z.string().transform(s => JSON.parse(s)).pipe(z.array(z.nativeEnum(GapReasonCode)).min(1)),
  otherReason: z.string().max(500).optional(),
  remediation: z.string().min(5).max(2000),
  actionIds:   z.string().transform(s => JSON.parse(s)).pipe(z.array(z.string().uuid()).min(1)),
})

export const tasksController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tasksService.listTasks(req.tenantId!, req.userId!, req.userRole!, req.query as any)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async getOne(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tasksService.getTask(req.tenantId!, req.params.id)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async start(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await tasksService.startTask(req.tenantId!, req.params.id, req.userId!)
      res.json({ success: true, message: 'Task started' })
    } catch (err) { next(err) }
  },

  async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { note } = submitSchema.parse(req.body)
      await tasksService.submitTask(req.tenantId!, req.params.id, req.userId!, note)
      res.json({ success: true, message: 'Submitted for review' })
    } catch (err) { next(err) }
  },

  async review(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { decision, note } = reviewSchema.parse(req.body)
      await tasksService.reviewTask(req.tenantId!, req.params.id, req.userId!, decision, note)
      res.json({ success: true, message: decision === 'approve' ? 'Task approved' : 'Task rejected' })
    } catch (err) { next(err) }
  },

  async signoff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await tasksService.signoffTask(req.tenantId!, req.params.id, req.userId!)
      res.json({ success: true, message: 'Task marked as Compliant' })
    } catch (err) { next(err) }
  },

  async rejectFinal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { note } = rejectSchema.parse(req.body)
      await tasksService.rejectFinal(req.tenantId!, req.params.id, req.userId!, note)
      res.json({ success: true, message: 'Task rejected' })
    } catch (err) { next(err) }
  },

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { assigneeId } = assignSchema.parse(req.body)
      await tasksService.assignTask(req.tenantId!, req.params.id, req.userId!, assigneeId)
      res.json({ success: true, message: assigneeId ? 'Task assigned' : 'Task unassigned' })
    } catch (err) { next(err) }
  },

  async getAssignableUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await tasksService.getAssignableUsers(req.tenantId!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async addEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = addEvidenceSchema.parse(req.body)

      let fileData: { fileName: string; fileSize: number; fileUrl: string; storageProvider: string } | undefined
      if (req.file) {
        fileData = await uploadFile(req.file, `evidence/${req.params.id}`)
      }

      const evidence = await tasksService.addEvidence({
        tenantId: req.tenantId!, taskId: req.params.id, userId: req.userId!,
        data: {
          title: body.title, type: body.type, description: body.description,
          linkUrl: body.linkUrl, textContent: body.textContent,
          file: fileData, actions: body.actions,
        },
      })
      res.status(201).json({ success: true, data: evidence, message: 'Evidence added' })
    } catch (err) { next(err) }
  },

  async deleteEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await tasksService.deleteEvidence(req.tenantId!, req.params.id, req.params.evidenceId, req.userId!)
      res.json({ success: true, message: 'Evidence deleted' })
    } catch (err) { next(err) }
  },

  async updateEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateEvidenceSchema.parse(req.body)

      let fileData: { fileName: string; fileSize: number; fileUrl: string; storageProvider: string } | undefined
      if (req.file) {
        fileData = await uploadFile(req.file, `evidence/${req.params.id}`)
      }

      const evidence = await tasksService.updateEvidence({
        tenantId: req.tenantId!, taskId: req.params.id, evidenceId: req.params.evidenceId, userId: req.userId!,
        data: { ...body, file: fileData },
      })
      res.json({ success: true, data: evidence, message: 'Evidence updated' })
    } catch (err) { next(err) }
  },

  async addGapFinding(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = addGapFindingSchema.parse(req.body)

      const files: { fileName: string; fileSize: number; fileUrl: string }[] = []
      const reqFiles = (req.files as Express.Multer.File[] | undefined) ?? []
      for (const file of reqFiles) {
        const stored = await uploadFile(file, `gap-findings/${req.params.id}`)
        files.push({ fileName: stored.fileName, fileSize: stored.fileSize, fileUrl: stored.fileUrl })
      }

      const finding = await tasksService.addGapFinding({
        tenantId: req.tenantId!, taskId: req.params.id, userId: req.userId!,
        data: {
          reasonCodes: body.reasonCodes, otherReason: body.otherReason,
          remediation: body.remediation, actionIds: body.actionIds, files,
        },
      })
      res.status(201).json({ success: true, data: finding, message: 'Gap finding recorded' })
    } catch (err) { next(err) }
  },
}