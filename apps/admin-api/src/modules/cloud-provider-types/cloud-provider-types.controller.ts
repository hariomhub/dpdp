import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { cloudProviderTypesService } from './cloud-provider-types.service'

const PROVIDER_CATEGORIES = [
  'CLOUD_INFRASTRUCTURE', 'IDENTITY_SAAS', 'DEVOPS_SOURCE',
  'DATABASE_SERVICE', 'EDGE_PLATFORM', 'CONTAINER_ORCHESTRATION', 'EMERGING',
] as const

const createSchema = z.object({
  key:              z.string().min(2).regex(/^[a-z0-9]+$/, 'Key must be lowercase letters/digits only, matching Prowler\'s provider key'),
  displayName:      z.string().min(2),
  category:         z.enum(PROVIDER_CATEGORIES),
  credentialSchema: z.record(z.string(), z.any()),
  logoUrl:          z.string().url().optional().or(z.literal('')),
  docsUrl:          z.string().url().optional().or(z.literal('')),
})

const updateSchema = createSchema.omit({ key: true }).partial()

const toggleSchema = z.object({
  isActive: z.boolean(),
})

export const cloudProviderTypesController = {
  async listProviders(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await cloudProviderTypesService.listProviders() }) }
    catch (err) { next(err) }
  },
  async createProvider(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body)
      res.status(201).json({ success: true, data: await cloudProviderTypesService.createProvider(body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async updateProvider(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = updateSchema.parse(req.body)
      res.json({ success: true, data: await cloudProviderTypesService.updateProvider(req.params.id, body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async toggleActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = toggleSchema.parse(req.body)
      res.json({ success: true, data: await cloudProviderTypesService.toggleActive(req.params.id, isActive, req.adminId!) })
    } catch (err) { next(err) }
  },
}
