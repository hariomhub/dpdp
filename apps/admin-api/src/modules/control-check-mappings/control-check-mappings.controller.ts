import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { controlCheckMappingsService } from './control-check-mappings.service'

const createSchema = z.object({
  predefinedActionId: z.string().uuid(),
  providerId: z.string().uuid(),
  checkId: z.string().min(1),
  checkTitle: z.string().min(1),
  checkSeverity: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

const updateSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  isActive: z.boolean().optional(),
})

export const controlCheckMappingsController = {
  async browseChecks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const provider = String(req.query.provider ?? '')
      if (!provider) throw new Error('provider query param is required')
      res.json({ success: true, data: await controlCheckMappingsService.browseChecks(provider) })
    } catch (err) { next(err) }
  },

  async listMappings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const predefinedActionId = typeof req.query.predefinedActionId === 'string' ? req.query.predefinedActionId : undefined
      res.json({ success: true, data: await controlCheckMappingsService.listMappings(predefinedActionId) })
    } catch (err) { next(err) }
  },

  async createMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body)
      res.status(201).json({ success: true, data: await controlCheckMappingsService.createMapping(body, req.adminId!) })
    } catch (err) { next(err) }
  },

  async updateMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body)
      res.json({ success: true, data: await controlCheckMappingsService.updateMapping(req.params.id, body, req.adminId!) })
    } catch (err) { next(err) }
  },

  async deleteMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await controlCheckMappingsService.deleteMapping(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Mapping deleted' })
    } catch (err) { next(err) }
  },
}
