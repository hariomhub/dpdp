import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { riskService } from './risk.service'

export const riskController = {
  async getAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await riskService.getAnalysis(req.tenantId!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async getHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const days = Number(req.query.days) || 30
      const data = await riskService.getHistory(req.tenantId!, days)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },
}
