import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { controlsService } from './controls.service'

const createCustomControlSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(5),
  applicableTo: z.enum(['DATA_FIDUCIARY', 'SIGNIFICANT_DF', 'BOTH']).default('BOTH'),
  regulationMappings: z.array(z.object({
    regulationId: z.string().uuid(),
    chapterId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
  })).optional(),
  predefinedActions: z.array(z.object({
    title: z.string().min(2),
    description: z.string().min(2),
    evidenceTypes: z.array(z.string()).min(1),
    suggestedDueDays: z.number().int().min(1).max(365),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  })).min(1),
})

export const controlsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const controls = await controlsService.listControls(req.tenantId!)
      res.json({ success: true, data: controls })
    } catch (err) { next(err) }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const control = await controlsService.getControl(req.tenantId!, req.params.id)
      res.json({ success: true, data: control })
    } catch (err) { next(err) }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createCustomControlSchema.parse(req.body)
      const control = await controlsService.createCustomControl(req.tenantId!, body)
      res.status(201).json({ success: true, data: control })
    } catch (err) { next(err) }
  },
}
