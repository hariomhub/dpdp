import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { cloudConnectionsService } from './cloud-connections.service'

const createSchema = z.object({
  providerKey: z.string().min(1),
  alias: z.string().min(1),
  credentials: z.record(z.string(), z.any()),
})

export const cloudConnectionsController = {
  async listProviders(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await cloudConnectionsService.listActiveProviders() }) }
    catch (err) { next(err) }
  },

  async listConnections(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await cloudConnectionsService.listConnections(req.tenantId!) }) }
    catch (err) { next(err) }
  },

  async createConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body)
      const connection = await cloudConnectionsService.createConnection({
        tenantId: req.tenantId!, userId: req.userId!, ...body,
      })
      res.status(201).json({ success: true, data: connection, message: 'Connection created — testing in the background' })
    } catch (err) { next(err) }
  },

  async retestConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await cloudConnectionsService.retestConnection({
        connectionId: req.params.id, tenantId: req.tenantId!,
      })
      res.json({ success: true, data: result, message: 'Retest queued' })
    } catch (err) { next(err) }
  },

  async disconnectConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await cloudConnectionsService.disconnectConnection({
        connectionId: req.params.id, tenantId: req.tenantId!, userId: req.userId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },
}
