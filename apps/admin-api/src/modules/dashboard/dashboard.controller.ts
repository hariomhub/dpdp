import { Response, NextFunction } from 'express'
import { dashboardService } from './dashboard.service'
import { AuthRequest } from '../../middleware/auth'

export const dashboardController = {
  async getStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats()
      res.json({ success: true, data: stats })
    } catch (err) {
      next(err)
    }
  },
}