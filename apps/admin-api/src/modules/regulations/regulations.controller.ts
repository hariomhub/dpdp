import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { regulationsService } from './regulations.service'
import { AuthRequest } from '../../middleware/auth'
import { RegulationStatus } from '@prisma/super-admin-client'

const createRegulationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  shortCode: z.string().min(2).max(10, 'Short code max 10 chars'),
  issuingAuthority: z.string().min(2, 'Issuing authority is required'),
  description: z.string().min(10, 'Description is required'),
  jurisdiction: z.string().default('India'),
  effectiveDate: z.string().transform(val => new Date(val)),
  status: z.nativeEnum(RegulationStatus).default(RegulationStatus.DRAFT),
})

const updateRegulationSchema = z.object({
  name: z.string().min(2).optional(),
  issuingAuthority: z.string().optional(),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
  effectiveDate: z.string().transform(val => new Date(val)).optional(),
  status: z.nativeEnum(RegulationStatus).optional(),
})

export const regulationsController = {

  async getChapters(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const chapters = await regulationsService.getChapters(req.params.id)
      res.json({ success: true, data: chapters })
    } catch (err) {
      next(err)
    }
  },

  async createChapter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        name: z.string().min(1),
        title: z.string().optional(),
        orderIndex: z.number().int().optional(),
      }).parse(req.body)

      const chapter = await regulationsService.createChapter({
        regulationId: req.params.id,
        ...body,
        adminId: req.adminId!,
      })
      res.status(201).json({ success: true, data: chapter, message: 'Chapter created' })
    } catch (err) {
      next(err)
    }
  },

  async updateChapter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        name: z.string().optional(),
        title: z.string().optional(),
        orderIndex: z.number().int().optional(),
        isMandatory: z.boolean().optional(),
      }).parse(req.body)

      const chapter = await regulationsService.updateChapter({
        chapterId: req.params.chapterId,
        data: body,
        adminId: req.adminId!,
      })
      res.json({ success: true, data: chapter, message: 'Chapter updated' })
    } catch (err) {
      next(err)
    }
  },

  async deleteChapter(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await regulationsService.deleteChapter(
        req.params.chapterId,
        req.adminId!
      )
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await regulationsService.list({
        query: req.query as Record<string, unknown>,
      })
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const regulation = await regulationsService.getById(req.params.id)
      res.json({ success: true, data: regulation })
    } catch (err) {
      next(err)
    }
  },

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createRegulationSchema.parse(req.body)
      const regulation = await regulationsService.create({
        ...body,
        adminId: req.adminId!,
        ipAddress: req.ip,
      })
      res.status(201).json({
        success: true,
        data: regulation,
        message: 'Regulation created successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateRegulationSchema.parse(req.body)
      const regulation = await regulationsService.update({
        id: req.params.id,
        data: body,
        adminId: req.adminId!,
      })
      res.json({
        success: true,
        data: regulation,
        message: 'Regulation updated successfully',
      })
    } catch (err) {
      next(err)
    }
  },

  async archive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await regulationsService.archive(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Regulation archived' })
    } catch (err) {
      next(err)
    }
  },

  async addControl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { controlId } = z.object({
        controlId: z.string().uuid(),
      }).parse(req.body)

      const result = await regulationsService.addControl(
        req.params.id,
        controlId,
        req.adminId!
      )
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },

  async removeControl(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await regulationsService.removeControl(
        req.params.id,
        req.params.controlId,
        req.adminId!
      )
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },
}
// ─── Section controller (appended) ───────────────────────────────────────────
import { regulationSectionsService } from './regulations.service'

export const regulationSectionsController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await regulationSectionsService.listSections(req.params.chapterId)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, title } = req.body
      const data = await regulationSectionsService.createSection({ chapterId: req.params.chapterId, name, title })
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await regulationSectionsService.updateSection(req.params.sid, req.body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await regulationSectionsService.deleteSection(req.params.sid)
      res.json({ success: true, message: 'Section deleted' })
    } catch (err) { next(err) }
  },
}