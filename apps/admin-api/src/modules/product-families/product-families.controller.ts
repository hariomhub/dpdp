import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { productFamiliesService } from './product-families.service'

const familySchema = z.object({
  name:        z.string().min(2),
  description: z.string().optional(),
  category:    z.string().optional(),
})

const productSchema = z.object({
  name:            z.string().min(1, 'Product name is required'),
  description:     z.string().optional(),
  vendor:          z.string().optional(),
  website:         z.string().url('Must be a valid URL').optional().or(z.literal('')),
  logoUrl:         z.string().url('Must be a valid URL').optional().or(z.literal('')),
  category:        z.string().optional(),
  productFamilyId: z.string().uuid().optional().nullable(),
})

const actionProductsSchema = z.object({
  productIds: z.array(z.string().uuid()),
})

export const productFamiliesController = {
  async listFamilies(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await productFamiliesService.listFamilies() }) }
    catch (err) { next(err) }
  },
  async createFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = familySchema.parse(req.body)
      res.status(201).json({ success: true, data: await productFamiliesService.createFamily(body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async updateFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = familySchema.partial().parse(req.body)
      res.json({ success: true, data: await productFamiliesService.updateFamily(req.params.id, body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async deleteFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await productFamiliesService.deleteFamily(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Product family deleted' })
    } catch (err) { next(err) }
  },
  async listAllProducts(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await productFamiliesService.listAllProducts() }) }
    catch (err) { next(err) }
  },
  async createProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = productSchema.parse(req.body)
      res.status(201).json({ success: true, data: await productFamiliesService.createProduct(body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = productSchema.partial().parse(req.body)
      res.json({ success: true, data: await productFamiliesService.updateProduct(req.params.id, body, req.adminId!) })
    } catch (err) { next(err) }
  },
  async deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await productFamiliesService.deleteProduct(req.params.id, req.adminId!)
      res.json({ success: true, message: 'Product deleted' })
    } catch (err) { next(err) }
  },
  async setActionProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { productIds } = actionProductsSchema.parse(req.body)
      const result = await productFamiliesService.setActionProducts(req.params.actionId, productIds, req.adminId!)
      res.json({ success: true, data: result, message: `${productIds.length} product(s) assigned` })
    } catch (err) { next(err) }
  },
}