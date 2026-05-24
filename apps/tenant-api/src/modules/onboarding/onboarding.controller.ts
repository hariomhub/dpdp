import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { onboardingService } from './onboarding.service'
import { AuthRequest } from '../../middleware/auth'

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const orgDetailsSchema = z.object({
  name:         z.string().min(2, 'Organization name must be at least 2 characters'),
  industry:     z.string().min(1, 'Industry is required'),
  orgSize:      z.string().min(1, 'Organization size is required'),
  address:      z.string().min(5, 'Address must be at least 5 characters'),
  country:      z.string().default('India'),
  website:      z.string().url('Invalid URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid contact email'),
  panNumber:    z.string().optional(),
  gstNumber:    z.string().optional(),
  dpoName:      z.string().min(2, 'DPO name is required'),
  dpoEmail:     z.string().email('Invalid DPO email'),
  dpoPhone:     z.string().optional(),
  ceoName:      z.string().min(2, 'CEO name is required'),
})

const classificationSchema = z.object({
  classification: z.enum(
    ['Data Fiduciary', 'Significant Data Fiduciary'],
    { errorMap: () => ({ message: 'Classification must be Data Fiduciary or Significant Data Fiduciary' }) }
  ),
  classUncertain: z.boolean().default(false),
})

// ── Reusable nested schemas ───────────────────────────────────────────────────

const piiRecordSchema = z.object({
  categories:            z.array(z.string()).min(1, 'At least one PII category is required'),
  sensitivity:           z.string().min(1, 'Sensitivity is required'),
  purpose:               z.string().min(5, 'Purpose must be at least 5 characters'),
  legalBasis:            z.string().min(1, 'Legal basis is required'),
  retention:             z.string().min(1, 'Retention period is required'),
  deletionMechanism:     z.string().optional(),
  volume:                z.union([z.string(), z.number()]).default('0'),
  crossBorderTransfer:   z.boolean().default(false),
  crossBorderDestination: z.string().optional(),
  principalType:         z.string().min(1, 'Principal type is required'),
  sharedWithThirdParties: z.boolean().default(false),
})

const assetSchema = z.object({
  name:            z.string().min(1, 'Asset name is required'),
  assetType:       z.string().min(1, 'Asset type is required'),
  description:     z.string().optional(),
  assetOwner:      z.string().optional(),
  hostingLocation: z.string().default('India'),
  vendorName:      z.string().optional(),
  criticality:     z.string().default('Medium'),
  internetFacing:  z.boolean().default(false),
  status:          z.string().default('Active'),
  piiRecords:      z.array(piiRecordSchema).default([]),
})

const supplierSchema = z.object({
  name:               z.string().min(1, 'Supplier name is required'),
  supplierType:       z.string().default('Other'),
  contactName:        z.string().optional(),
  contactEmail:       z.string().email('Invalid supplier contact email'),
  countryOfOperation: z.string().default('India'),
  dpaSigned:          z.boolean().default(false),
  criticality:        z.string().default('Medium'),
  status:             z.string().default('Active'),
  assets:             z.array(assetSchema).default([]),
})

const departmentSchema = z.object({
  id:          z.string().min(1, 'Frontend department ID is required'),
  name:        z.string().min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
  owner:       z.string().optional(),
  ownerEmail:  z.string().email('Invalid owner email').optional().or(z.literal('')),
  assets:      z.array(assetSchema).default([]),
  suppliers:   z.array(supplierSchema).default([]),
})

const structureSchema = z.object({
  departments: z.array(departmentSchema).min(1, 'At least one department is required'),
})

const inviteItemSchema = z.object({
  email:         z.string().email('Invalid email address'),
  role:          z.enum(
    ['Compliance Officer', 'IT Admin', 'Internal Auditor', 'External Auditor'],
    { errorMap: () => ({ message: 'Invalid role' }) }
  ),
  departmentIds: z.array(z.string().uuid()).optional().default([]),
  note:          z.string().max(500, 'Note cannot exceed 500 characters').optional(),
})

const inviteSchema = z.object({
  invites: z.array(inviteItemSchema).min(1, 'At least one invite is required'),
})

// ─── Controller ───────────────────────────────────────────────────────────────

export const onboardingController = {

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const status = await onboardingService.getStatus(req.tenantId!)
      res.json({ success: true, data: status })
    } catch (err) {
      next(err)
    }
  },

  async saveOrgDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = orgDetailsSchema.parse(req.body)
      const result = await onboardingService.saveOrgDetails({
        tenantId: req.tenantId!,
        userId:   req.userId!,
        data:     body,
      })
      res.json({ success: true, data: result, message: 'Organization details saved' })
    } catch (err) {
      next(err)
    }
  },

  async saveClassification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = classificationSchema.parse(req.body)
      const result = await onboardingService.saveClassification({
        tenantId: req.tenantId!,
        userId:   req.userId!,
        ...body,
      })
      res.json({ success: true, data: result, message: 'Classification saved' })
    } catch (err) {
      next(err)
    }
  },

  async saveStructure(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = structureSchema.parse(req.body)
      const result = await onboardingService.saveStructure({
        tenantId:    req.tenantId!,
        userId:      req.userId!,
        departments: body.departments,
        ipAddress:   req.ip,
      })
      res.json({
        success: true,
        data:    result,
        message: `${result.summary.departments} department(s), ${result.summary.assets} asset(s), and ${result.summary.suppliers} supplier(s) saved`,
      })
    } catch (err) {
      next(err)
    }
  },

  async inviteTeamMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body = inviteSchema.parse(req.body)
      const result = await onboardingService.inviteTeamMembers({
        tenantId:  req.tenantId!,
        userId:    req.userId!,
        invites:   body.invites,
        ipAddress: req.ip,
      })
      res.json({
        success: true,
        data:    result,
        message: `${result.total} invitation(s) sent${result.skipped.length > 0 ? `, ${result.skipped.length} skipped` : ''}`,
      })
    } catch (err) {
      next(err)
    }
  },

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onboardingService.complete({
        tenantId:  req.tenantId!,
        userId:    req.userId!,
        ipAddress: req.ip,
      })
      res.json({ success: true, message: result.message })
    } catch (err) {
      next(err)
    }
  },
}