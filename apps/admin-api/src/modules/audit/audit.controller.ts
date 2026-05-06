import { Response, NextFunction } from 'express'
import { auditService } from './audit.service'
import { AuthRequest } from '../../middleware/auth'

export const auditController = {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await auditService.list(
        req.query as Record<string, unknown>
      )
      res.json({ success: true, ...result })
    } catch (err) {
      next(err)
    }
  },
}