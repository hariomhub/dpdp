import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { controlFamiliesService } from './control-families.service'
import { AuthRequest } from '../../middleware/auth'

const createSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  icon:        z.string().optional(),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
})

const updateSchema = createSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
}).partial()

const controlIdsSchema = z.object({
  controlIds: z.array(z.string().uuid()).min(1, 'At least one control ID required'),
})

export const controlFamiliesController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await controlFamiliesService.list() })
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await controlFamiliesService.getById(req.params.id) })
    } catch (err) { next(err) }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body   = createSchema.parse(req.body)
      const result = await controlFamiliesService.create(body, req.adminId!)
      res.status(201).json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body   = updateSchema.parse(req.body)
      const result = await controlFamiliesService.update(req.params.id, body, req.adminId!)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await controlFamiliesService.delete(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Control family deleted' })
    } catch (err) { next(err) }
  },

  async addControls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { controlIds } = controlIdsSchema.parse(req.body)
      const result = await controlFamiliesService.addControls(req.params.id, controlIds, req.adminId!)
      res.json({ success: true, data: result, message: `${result.added} control(s) added` })
    } catch (err) { next(err) }
  },

  async removeControl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await controlFamiliesService.removeControl(req.params.id, req.params.controlId, req.adminId!)
      res.json({ success: true, message: 'Control removed from family' })
    } catch (err) { next(err) }
  },
}