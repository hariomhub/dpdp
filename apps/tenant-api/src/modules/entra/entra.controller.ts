import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { entraService } from './entra.service'
import { AuthRequest } from '../../middleware/auth'
import { TenantRole } from '@prisma/tenant-client'

const connectSchema = z.object({
  tenantDomain: z.string().min(3, 'Tenant domain is required'),
  clientId: z.string().uuid('Client ID must be a valid UUID'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  azureTenantId: z.string().uuid('Azure Tenant ID must be a valid UUID'),
})

const mappingSchema = z.object({
  mappings: z.array(z.object({
    entraGroupId: z.string().min(1),
    entraGroupName: z.string().min(1),
    role: z.nativeEnum(TenantRole),
    departmentId: z.string().uuid().optional(),
  })).min(1, 'At least one mapping is required'),
})

const loginSchema = z.object({
  code:  z.string().min(1, 'Authorization code is required'),
  // Signed token created by GET /entra/auth-url, and the browser-held value that proves the same browser started the
  // sign-in. The organisation and redirect address are NOT taken from the request.
  state: z.string().min(20, 'Sign-in state is required'),
  nonce: z.string().min(20, 'Sign-in nonce is required'),
})

const syncSchema = z.object({
  /** Set after the person has seen the "this would remove N users" warning and agreed. */
  confirmRemovals: z.boolean().optional(),
})

export const entraController = {
  async getAuthUrl(req: import('express').Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined
      const result = await entraService.getAuthUrl(tenantId)
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },


  async getMappings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const mappings = await entraService.getMappings(req.tenantId!)
      res.json({ success: true, data: mappings })
    } catch (err) { next(err) }
  },

  async connect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = connectSchema.parse(req.body)
      const result = await entraService.connect({
        ...body,
        tenantId: req.tenantId!,
        userId: req.userId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async reconnect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = connectSchema.parse(req.body)
      const result = await entraService.reconnect({
        ...body,
        tenantId: req.tenantId!,
        userId: req.userId!,
      })
      res.json({ success: true, data: result })
    } catch (err) { next(err) }
  },

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const status = await entraService.getStatus(req.tenantId!)
      res.json({ success: true, data: status })
    } catch (err) { next(err) }
  },

  /** No credentials in request — reads from stored EntraConfig */
  async getGroups(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const groups = await entraService.getGroups(req.tenantId!)
      res.json({ success: true, data: groups })
    } catch (err) { next(err) }
  },

  async saveMappings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = mappingSchema.parse(req.body)
      const mappings = await entraService.saveMappings({
        tenantId: req.tenantId!,
        mappings: body.mappings,
        userId: req.userId!,
      })
      res.json({ success: true, data: mappings, message: `${mappings.length} mapping(s) saved` })
    } catch (err) { next(err) }
  },

  async removeGroupMapping(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const result = await entraService.removeGroupMapping({
        mappingId: id,
        tenantId: req.tenantId!,
        userId: req.userId!,
      })
      res.json({ success: true, data: result, message: `Removed mapping for ${result.removed}` })
    } catch (err) { next(err) }
  },

  /** No credentials in request — reads from stored EntraConfig */
  async syncUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = syncSchema.parse(req.body ?? {})
      const result = await entraService.syncUsers({
        tenantId: req.tenantId!,
        userId: req.userId!,
        confirmRemovals: body.confirmRemovals,
      })
      res.json({
        success: true,
        data: result,
        message: `Sync complete: ${result.created} created, ${result.updated} updated, ${result.deactivated} deactivated`,
      })
    } catch (err) { next(err) }
  },

  async disconnect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await entraService.disconnect(req.tenantId!, req.userId!)
      res.json({ success: true, message: result.message })
    } catch (err) { next(err) }
  },
}

/** Public endpoint — no JWT required (called from login page redirect) */
export async function entraLoginHandler(
  req: import('express').Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = loginSchema.parse(req.body)
    const result = await entraService.loginWithEntra(body)
    res.json({ success: true, data: result })
  } catch (err) { next(err) }
}