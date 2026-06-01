import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { controlsService } from './controls.service'
import { AuthRequest } from '../../middleware/auth'
import { ControlStatus, ApplicableTo, EvidenceType, Priority } from '@prisma/super-admin-client'

const predefinedActionSchema = z.object({
  title: z.string().min(2, 'Action title is required'),
  description: z.string().min(2, 'Action description is required'),
  evidenceTypes: z.array(z.nativeEnum(EvidenceType)).min(1, 'At least one evidence type required'),
  suggestedDueDays: z.number().int().min(1).max(365),
  priority: z.nativeEnum(Priority),
  orderIndex: z.number().int().optional(),
  productIds: z.array(z.string().uuid()).optional(),
})

const createControlSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  applicableTo: z.nativeEnum(ApplicableTo).default(ApplicableTo.BOTH),
  status: z.nativeEnum(ControlStatus).default(ControlStatus.DRAFT),
  regulationMappings: z.array(z.object({
    regulationId: z.string().uuid(),
    chapterId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional()
  })).min(1, 'At least one regulation mapping required'),
  predefinedActions: z.array(predefinedActionSchema).min(1, 'At least one action required'),
})

const updateControlSchema = z.object({
  title: z.string().min(5).optional(),
  description: z.string().min(10).optional(),
  applicableTo: z.nativeEnum(ApplicableTo).optional(),
  status: z.nativeEnum(ControlStatus).optional(),
  regulationMappings: z.array(z.object({
    regulationId: z.string().uuid(),
    chapterId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional()
  })).optional(),
})

export const controlsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await controlsService.list(
        req.query as Record<string, unknown>
      )
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const control = await controlsService.getById(req.params.id)
      res.json({ success: true, data: control })
    } catch (err) {
      next(err)
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createControlSchema.parse(req.body)
      const control = await controlsService.create({
        ...body,
        adminId: req.adminId!,
        ipAddress: req.ip,
      })
      res.status(201).json({
        success: true,
        data: control,
        message: 'Control created successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateControlSchema.parse(req.body)
      const control = await controlsService.update({
        id: req.params.id,
        data: body,
        adminId: req.adminId!,
      })
      res.json({
        success: true,
        data: control,
        message: 'Control updated successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  async publish(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const control = await controlsService.publish(
        req.params.id,
        req.adminId!
      )
      res.json({
        success: true,
        data: control,
        message: 'Control published successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const control = await controlsService.deactivate(
        req.params.id,
        req.adminId!
      )
      res.json({
        success: true,
        data: control,
        message: 'Control deactivated',
      })
    } catch (err) {
      next(err)
    }
  },

  async addPredefinedAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = predefinedActionSchema.parse(req.body)
      const action = await controlsService.addPredefinedAction(
        req.params.id,
        body,
        req.adminId!
      )
      res.status(201).json({
        success: true,
        data: action,
        message: 'Predefined action added',
      })
    } catch (err) {
      next(err)
    }
  },

  async removePredefinedAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await controlsService.removePredefinedAction(
        req.params.id,
        req.params.actionId,
        req.adminId!
      )
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },
}
// ─── Appended controller methods ─────────────────────────────────────────────

export const controlsControllerExtension = {
  async deleteControl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await (controlsService as any).deleteControl(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Control deleted' })
    } catch (err) { next(err) }
  },

  async updateAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await (controlsService as any).updateAction({
        controlId: req.params.id, actionId: req.params.actionId,
        data: req.body, adminId: req.adminId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async setActionProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productIds } = req.body
      const result = await (controlsService as any).setActionProducts({
        controlId: req.params.id, actionId: req.params.actionId,
        productIds: productIds ?? [], adminId: req.adminId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async createMasterEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      let fileData: any = undefined
      if (req.file) {
        const { uploadFile } = await import('../../utils/storage')
        fileData = await uploadFile(req.file, `master-evidence/${req.params.actionId}`)
      }
      const result = await (controlsService as any).createMasterEvidence({
        controlId: req.params.id, actionId: req.params.actionId,
        productId: req.params.productId,
        adminId: req.adminId!,
        data: { title: req.body.title, description: req.body.description, file: fileData },
      })
      res.status(201).json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async deleteMasterEvidence(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await (controlsService as any).deleteMasterEvidence({
        controlId: req.params.id, actionId: req.params.actionId,
        evidenceId: req.params.evidenceId, adminId: req.adminId!,
      })
      res.json({ success: true, message: 'Master evidence deleted' })
    } catch (err) { next(err) }
  },
}

Object.assign(controlsController, controlsControllerExtension)