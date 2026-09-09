import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { auditService } from './audit.service'

export const auditController = {
  async getLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await auditService.getLogs(req.tenantId!, {
        page:   req.query.page   ? Number(req.query.page)  : 1,
        limit:  req.query.limit  ? Number(req.query.limit) : 25,
        module: req.query.module as string | undefined,
        action: req.query.action as string | undefined,
        from:   req.query.from   as string | undefined,
        to:     req.query.to     as string | undefined,
        targetId: req.query.targetId as string | undefined,
      })
      res.json({ success: true, data })
    } catch (err) {
      next(err)
    }
  },
}
