import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { dashboardService } from './dashboard.service'

export const dashboardController = {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getStats(req.tenantId!, req.userId!)
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
}
