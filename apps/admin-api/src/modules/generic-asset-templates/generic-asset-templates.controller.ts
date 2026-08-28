import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { genericAssetTemplatesService, VALID_ASSET_TYPES } from './generic-asset-templates.service'

const createSchema = z.object({
  providerId:              z.string().uuid(),
  cloudResourceType:       z.string().min(1),
  displayName:             z.string().min(2),
  assetType:               z.enum(VALID_ASSET_TYPES),
  defaultCriticality:      z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  suggestedDataCategories: z.array(z.string()).optional(),
  status:                  z.enum(['DRAFT', 'PUBLISHED']).optional(),
})

const updateSchema = createSchema.omit({ providerId: true, cloudResourceType: true }).partial().extend({
  isActive: z.boolean().optional(),
})

export const genericAssetTemplatesController = {
  async listTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const providerId = typeof req.query.providerId === 'string' ? req.query.providerId : undefined
      res.json({ success: true, data: await genericAssetTemplatesService.listTemplates(providerId) })
    } catch (err) { next(err) }
  },
  async createTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body)
      res.status(201).json({ success: true, data: await genericAssetTemplatesService.createTemplate(body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async updateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body)
      res.json({ success: true, data: await genericAssetTemplatesService.updateTemplate(req.params.id, body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async deleteTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await genericAssetTemplatesService.deleteTemplate(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Asset template deleted' })
    } catch (err) { next(err) }
  },
}
