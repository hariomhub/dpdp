import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { masterControlsService } from './master-controls.service'
import { AuthRequest } from '../../middleware/auth'
import { EvidenceType, Priority } from '@prisma/super-admin-client'

const createMasterControlSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
})

const updateMasterControlSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(5).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
})

const createMasterActionSchema = z.object({
  title: z.string().min(2, 'Action title is required'),
  description: z.string().min(2, 'Action description is required'),
  evidenceTypes: z.array(z.nativeEnum(EvidenceType)).min(1, 'At least one evidence type required'),
  suggestedDueDays: z.number().int().min(1).max(365).optional(),
  priority: z.nativeEnum(Priority).optional(),
  orderIndex: z.number().int().optional(),
})

const updateMasterActionSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().min(2).optional(),
  evidenceTypes: z.array(z.nativeEnum(EvidenceType)).min(1).optional(),
  suggestedDueDays: z.number().int().min(1).max(365).optional(),
  priority: z.nativeEnum(Priority).optional(),
  orderIndex: z.number().int().optional(),
})

export const masterControlsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await masterControlsService.list(req.query as Record<string, unknown>)
      res.json({ success: true, ...result })
    } catch (err) { next(err) }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const masterControl = await masterControlsService.getById(req.params.id)
      res.json({ success: true, data: masterControl })
    } catch (err) { next(err) }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createMasterControlSchema.parse(req.body)
      const masterControl = await masterControlsService.create({
        ...body, adminId: req.adminId!, ipAddress: req.ip,
      })
      res.status(201).json({ success: true, data: masterControl, message: 'Master control created' })
    } catch (err) { next(err) }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateMasterControlSchema.parse(req.body)
      const masterControl = await masterControlsService.update({
        id: req.params.id, data: body, adminId: req.adminId!,
      })
      res.json({ success: true, data: masterControl, message: 'Master control updated' })
    } catch (err) { next(err) }
  },

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await masterControlsService.delete(req.params.id, req.adminId!)
      res.json({ success: true, message: result.message })
    } catch (err) { next(err) }
  },

  async createAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createMasterActionSchema.parse(req.body)
      const action = await masterControlsService.createAction({
        masterControlId: req.params.id, ...body, adminId: req.adminId!,
      })
      res.status(201).json({ success: true, data: action, message: 'Master action created' })
    } catch (err) { next(err) }
  },

  async updateAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateMasterActionSchema.parse(req.body)
      const action = await masterControlsService.updateAction({
        actionId: req.params.actionId, data: body, adminId: req.adminId!,
      })
      res.json({ success: true, data: action, message: 'Master action updated' })
    } catch (err) { next(err) }
  },

  async deleteAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await masterControlsService.deleteAction(req.params.actionId, req.adminId!)
      res.json({ success: true, message: result.message })
    } catch (err) { next(err) }
  },
}
