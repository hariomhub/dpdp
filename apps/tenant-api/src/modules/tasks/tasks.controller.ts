import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { tasksService } from './tasks.service'

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
}