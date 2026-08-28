import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { discoveryService } from './discovery.service'

const confirmSchema = z.object({
  departmentId: z.string().uuid(),
  overrides: z.object({
    name: z.string().optional(),
    assetType: z.string().optional(),
    criticality: z.string().optional(),
    internetFacing: z.boolean().optional(),
    hostingLocation: z.string().optional(),
    vendorName: z.string().optional(),
  }).optional(),
})

export const discoveryController = {
  async triggerDiscovery(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await discoveryService.triggerDiscovery({
        connectionId: req.params.connectionId, tenantId: req.tenantId!, userId: req.userId!,
      })
      res.json({ success: true, data: result, message: 'Discovery scan queued' })
    } catch (err) { next(err) }
  },

  async listDrafts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await discoveryService.listDrafts({
        tenantId: req.tenantId!,
        connectionId: typeof req.query.connectionId === 'string' ? req.query.connectionId : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
      })
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async confirmDraft(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = confirmSchema.parse(req.body)
      const asset = await discoveryService.confirmDraft({
        draftId: req.params.id, tenantId: req.tenantId!, userId: req.userId!, ...body,
      })
      res.json({ success: true, data: asset, message: 'Asset created from discovered resource' })
    } catch (err) { next(err) }
  },

  async dismissDraft(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await discoveryService.dismissDraft({
        draftId: req.params.id, tenantId: req.tenantId!, userId: req.userId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
}
