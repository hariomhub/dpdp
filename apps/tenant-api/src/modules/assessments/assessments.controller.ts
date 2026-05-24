import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { assessmentsService } from './assessments.service'

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
      const regulations = await assessmentsService.listRegulations()
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
      const data = req.body
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