import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { orgService } from './org.service'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const deptCreateSchema = z.object({
  name:        z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
})

const deptUpdateSchema = z.object({
  name:        z.string().min(2).optional(),
  description: z.string().optional(),
})

const assetCreateSchema = z.object({
  name:            z.string().min(1, 'Asset name is required'),
  assetType:       z.string().min(1, 'Asset type is required'),
  description:     z.string().optional(),
  hostingLocation: z.string().default('India'),
  vendorName:      z.string().optional(),
  criticality:     z.string().default('Medium'),
  internetFacing:  z.boolean().default(false),
  status:          z.string().default('Active'),
})

const assetUpdateSchema = assetCreateSchema.partial()

const piiSchema = z.object({
  categories:            z.array(z.string()).min(1),
  sensitivity:           z.string().min(1),
  purpose:               z.string().min(5),
  legalBasis:            z.string().min(1),
  retention:             z.string().min(1),
  deletionMechanism:     z.string().optional(),
  volume:                z.union([z.string(), z.number()]).default(0),
  crossBorderTransfer:   z.boolean().default(false),
  crossBorderDestination: z.string().optional(),
  principalType:         z.string().min(1),
  sharedWithThirdParties: z.boolean().default(false),
})

const supplierCreateSchema = z.object({
  name:               z.string().min(1),
  supplierType:       z.string().default('Other'),
  contactName:        z.string().optional(),
  contactEmail:       z.string().email(),
  countryOfOperation: z.string().default('India'),
  dpaSigned:          z.boolean().default(false),
  criticality:        z.string().default('Medium'),
  status:             z.string().default('Active'),
})

const supplierAssetSchema = z.object({
  name:            z.string().min(1),
  assetType:       z.string().min(1),
  description:     z.string().optional(),
  hostingLocation: z.string().optional(),
  criticality:     z.string().default('Medium'),
  internetFacing:  z.boolean().default(false),
})

// ─── Controller ───────────────────────────────────────────────────────────────

export const orgController = {

  // Departments
  async listDepartments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await orgService.listDepartments(req.tenantId!)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async createDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = deptCreateSchema.parse(req.body)
      const data = await orgService.createDepartment(req.tenantId!, req.userId!, body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },

  async updateDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = deptUpdateSchema.parse(req.body)
      const data = await orgService.updateDepartment(req.tenantId!, req.userId!, req.params.id, body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async deleteDepartment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await orgService.deleteDepartment(req.tenantId!, req.userId!, req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  // Own Assets
  async createAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = assetCreateSchema.parse(req.body)
      const data = await orgService.createAsset(req.tenantId!, req.userId!, req.params.deptId, body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },

  async updateAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = assetUpdateSchema.parse(req.body)
      const data = await orgService.updateAsset(req.tenantId!, req.userId!, req.params.id, body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async deleteAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await orgService.deleteAsset(req.tenantId!, req.userId!, req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  // PII Records
  async listPiiRecords(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await orgService.listPiiRecords(req.tenantId!, req.params.assetId)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async createPiiRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = piiSchema.parse(req.body)
      const data = await orgService.createPiiRecord(req.tenantId!, req.userId!, req.params.assetId, body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },

  async updatePiiRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = piiSchema.partial().parse(req.body)
      const data = await orgService.updatePiiRecord(req.tenantId!, req.userId!, req.params.id, body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async deletePiiRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await orgService.deletePiiRecord(req.tenantId!, req.userId!, req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  // Suppliers
  async createSupplier(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = supplierCreateSchema.parse(req.body)
      const data = await orgService.createSupplier(req.tenantId!, req.userId!, req.params.deptId, body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },

  async updateSupplier(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = supplierCreateSchema.partial().parse(req.body)
      const data = await orgService.updateSupplier(req.tenantId!, req.userId!, req.params.id, body)
      res.json({ success: true, data })
    } catch (err) { next(err) }
  },

  async deleteSupplier(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await orgService.deleteSupplier(req.tenantId!, req.userId!, req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },

  // Supplier Assets
  async createSupplierAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = supplierAssetSchema.parse(req.body)
      const data = await orgService.createSupplierAsset(req.tenantId!, req.userId!, req.params.supplierId, body)
      res.status(201).json({ success: true, data })
    } catch (err) { next(err) }
  },

  async deleteSupplierAsset(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await orgService.deleteSupplierAsset(req.tenantId!, req.userId!, req.params.id)
      res.json({ success: true })
    } catch (err) { next(err) }
  },
}
