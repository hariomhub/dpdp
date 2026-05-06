import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { organizationsService } from './organizations.service'
import { AuthRequest } from '../../middleware/auth'
import { Plan } from '@prisma/super-admin-client'

const createOrgSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  industry: z.string().min(1, 'Industry is required'),
  country: z.string().default('India'),
  plan: z.nativeEnum(Plan),
  ceoName: z.string().min(2, 'CEO name is required'),
  ceoEmail: z.string().email('Invalid CEO email'),
  internalNotes: z.string().optional(),
  tenantPortalUrl: z.string().url().optional(),
})

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  industry: z.string().optional(),
  plan: z.nativeEnum(Plan).optional(),
  internalNotes: z.string().optional(),
})

export const organizationsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await organizationsService.list({
        query: req.query as Record<string, unknown>,
        adminId: req.adminId!,
      })
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const org = await organizationsService.getById(req.params.id)
      res.json({ success: true, data: org })
    } catch (err) {
      next(err)
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createOrgSchema.parse(req.body)
      const org = await organizationsService.create({
        ...body,
        adminId: req.adminId!,
        ipAddress: req.ip,
      })
      res.status(201).json({
        success: true,
        data: org,
        message: 'Organization created and invitation sent',
      })
    } catch (err) {
      next(err)
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateOrgSchema.parse(req.body)
      const org = await organizationsService.update({
        id: req.params.id,
        data: body,
        adminId: req.adminId!,
      })
      res.json({
        success: true,
        data: org,
        message: 'Organization updated',
      })
    } catch (err) {
      next(err)
    }
  },

  async suspend(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await organizationsService.suspend(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Organization suspended' })
    } catch (err) {
      next(err)
    }
  },

  async activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await organizationsService.activate(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Organization activated' })
    } catch (err) {
      next(err)
    }
  },

  async resendInvite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await organizationsService.resendInvite(
        req.params.id,
        req.adminId!
      )
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },
}