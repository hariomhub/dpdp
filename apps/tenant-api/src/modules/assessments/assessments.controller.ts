import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { assessmentsService } from './assessments.service'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const exclusionSchema = z.object({
  controlId: z.string().min(1, 'Control ID is required'),
  reason:    z.string().min(1, 'Exclusion reason is required'),
})

const taskAssignmentSchema = z.object({
  controlId:  z.string().min(1, 'Control ID is required'),
  assetId:    z.string().min(1, 'Asset ID is required'),
  assigneeId: z.string().nullable(),
})

const createAssessmentSchema = z.object({
  name:            z.string().min(2, 'Assessment name must be at least 2 characters'),
  description:     z.string().optional(),
  departmentId:    z.string().min(1, 'Department is required'),
  startDate:       z.string().min(1, 'Start date is required'),
  endDate:         z.string().min(1, 'End date is required'),
  regulationId:    z.string().min(1, 'Regulation is required'),
  assetIds:        z.array(z.string().min(1)).min(1, 'At least one asset must be selected'),
  exclusions:      z.array(exclusionSchema).optional(),
  taskAssignments: z.array(taskAssignmentSchema).optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

export const assessmentsController = {
  async getDeptItAdmins(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { deptId } = req.query as { deptId: string }
      if (!deptId) { res.status(400).json({ success: false, message: 'deptId required' }); return }
      const data = await assessmentsService.getDeptItAdmins(req.tenantId!, deptId)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },


  async listRegulations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const regulations = await assessmentsService.listRegulations(req.tenantId!)
      res.json({ success: true, data: regulations })
    } catch (error) {
      next(error)
    }
  },

  async listAssets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!
      const assets = await assessmentsService.listAssets(tenantId)
      res.json({ success: true, data: assets })
    } catch (error) {
      next(error)
    }
  },

  async listAssessments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!
      const assessments = await assessmentsService.listAssessments(tenantId)
      res.json({ success: true, data: assessments })
    } catch (error) {
      next(error)
    }
  },

  async createAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!
      const userId = req.userId!
      const data = createAssessmentSchema.parse(req.body)
      const assessment = await assessmentsService.createAssessment(tenantId, userId, data)
      res.status(201).json({ success: true, data: assessment })
    } catch (error) {
      next(error)
    }
  },

  async getAssessment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!
      const id = req.params.id
      const assessment = await assessmentsService.getAssessment(tenantId, id)
      res.json({ success: true, data: assessment })
    } catch (error) {
      next(error)
    }
  }
}