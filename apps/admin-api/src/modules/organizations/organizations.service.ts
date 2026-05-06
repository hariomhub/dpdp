import { getSuperAdminPrisma } from '@dpdp/database'
import { OrgStatus, Plan, AuditAction, Prisma } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'
import { logAuditAction } from '../../utils/audit-logger'
import { sendOrgInvitationEmail } from '../../utils/email'
import { config } from '../../config'
import crypto from 'crypto'

const db = getSuperAdminPrisma()

interface ListOrgsParams {
  query: Record<string, unknown>
  adminId: string
}

interface CreateOrgParams {
  name: string
  industry: string
  country: string
  plan: Plan
  ceoName: string
  ceoEmail: string
  internalNotes?: string
  tenantPortalUrl?: string
  adminId: string
  ipAddress?: string
}

interface UpdateOrgParams {
  id: string
  data: Partial<{
    name: string
    industry: string
    plan: Plan
    internalNotes: string
  }>
  adminId: string
}

function generateTenantCode(name: string): string {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `${prefix}-${suffix}`
}

function generateLicenseKey(): string {
  return crypto.randomUUID()
}

function getExpiryDate(): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date
}

function getLicenseLimits(plan: Plan) {
  const limits = {
    STARTER: { maxUsers: 10, maxAssessments: 5, storageGb: 10 },
    PROFESSIONAL: { maxUsers: 50, maxAssessments: 20, storageGb: 50 },
    ENTERPRISE: { maxUsers: 999, maxAssessments: 999, storageGb: 500 },
  }
  return limits[plan]
}

export const organizationsService = {
  async list({ query, adminId }: ListOrgsParams) {
    const { page, limit, skip } = parsePagination(query)

    const where: Record<string, unknown> = {}

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { tenantCode: { contains: String(query.search), mode: 'insensitive' } },
        { ceoEmail: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    if (query.status) where.status = query.status
    if (query.industry) where.industry = query.industry
    if (query.plan) where.plan = query.plan

    const [orgs, total] = await Promise.all([
      db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantCode: true,
          name: true,
          industry: true,
          plan: true,
          status: true,
          ceoName: true,
          ceoEmail: true,
          onboardedAt: true,
          createdAt: true,
          updatedAt: true,
          licenseKey: {
            select: {
              status: true,
              expiresAt: true,
            },
          },
        },
      }),
      db.tenant.count({ where }),
    ])

    return {
      data: orgs,
      meta: buildMeta(total, page, limit),
    }
  },

  async getById(id: string) {
    const org = await db.tenant.findUnique({
      where: { id },
      include: {
        licenseKey: true,
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            superAdmin: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })

    if (!org) throw new Error('Organization not found')
    return org
  },

  async create(params: CreateOrgParams) {
    const tenantCode = generateTenantCode(params.name)
    const licenseKey = generateLicenseKey()
    const limits = getLicenseLimits(params.plan)
    const expiresAt = getExpiryDate()
    const inviteToken = crypto.randomUUID()
    const inviteExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * config.platform.inviteTokenExpiryHours
    )

    const tenant = await db.tenant.create({
      data: {
        tenantCode,
        name: params.name,
        industry: params.industry,
        orgSize: '',
        address: '',
        country: params.country,
        contactEmail: params.ceoEmail,
        dpoName: '',
        dpoEmail: '',
        ceoName: params.ceoName,
        ceoEmail: params.ceoEmail,
        plan: params.plan,
        status: OrgStatus.ONBOARDING,
        internalNotes: params.internalNotes,
        tenantPortalUrl: params.tenantPortalUrl,
        // Store invite token in database
        inviteToken,
        inviteExpiresAt,
        licenseKey: {
          create: {
            key: licenseKey,
            plan: params.plan,
            ...limits,
            expiresAt,
          },
        },
      },
      include: {
        licenseKey: true,
      },
    })

    await logAuditAction({
      superAdminId: params.adminId,
      tenantId: tenant.id,
      action: AuditAction.ORG_CREATED,
      targetType: 'tenant',
      targetId: tenant.id,
      targetName: tenant.name,
      details: {
        plan: params.plan,
        ceoEmail: params.ceoEmail,
      } as Prisma.InputJsonValue,
      ipAddress: params.ipAddress,
    })

    // Send invitation email with stored token
    await sendOrgInvitationEmail({
      toEmail: params.ceoEmail,
      toName: params.ceoName,
      orgName: params.name,
      inviteToken,
    })

    return tenant
  },

  async update(params: UpdateOrgParams) {
    const existing = await db.tenant.findUnique({
      where: { id: params.id },
    })
    if (!existing) throw new Error('Organization not found')

    const updated = await db.tenant.update({
      where: { id: params.id },
      data: params.data,
    })

    await logAuditAction({
      superAdminId: params.adminId,
      tenantId: params.id,
      action: AuditAction.ORG_UPDATED,
      targetType: 'tenant',
      targetId: params.id,
      targetName: updated.name,
      details: { changes: params.data },
    })

    return updated
  },

  async suspend(id: string, adminId: string) {
    const org = await db.tenant.findUnique({ where: { id } })
    if (!org) throw new Error('Organization not found')
    if (org.status === OrgStatus.SUSPENDED) {
      throw new Error('Organization is already suspended')
    }

    const updated = await db.tenant.update({
      where: { id },
      data: { status: OrgStatus.SUSPENDED },
    })

    await logAuditAction({
      superAdminId: adminId,
      tenantId: id,
      action: AuditAction.ORG_SUSPENDED,
      targetType: 'tenant',
      targetId: id,
      targetName: org.name,
    })

    return updated
  },

  async activate(id: string, adminId: string) {
    const org = await db.tenant.findUnique({ where: { id } })
    if (!org) throw new Error('Organization not found')

    const updated = await db.tenant.update({
      where: { id },
      data: { status: OrgStatus.ACTIVE },
    })

    await logAuditAction({
      superAdminId: adminId,
      tenantId: id,
      action: AuditAction.ORG_ACTIVATED,
      targetType: 'tenant',
      targetId: id,
      targetName: org.name,
    })

    return updated
  },

  async resendInvite(id: string, adminId: string) {
    const org = await db.tenant.findUnique({ where: { id } })
    if (!org) throw new Error('Organization not found')

    // Generate fresh token
    const inviteToken = crypto.randomUUID()
    const inviteExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * config.platform.inviteTokenExpiryHours
    )

    // Update token in database
    await db.tenant.update({
      where: { id },
      data: { inviteToken, inviteExpiresAt, inviteAcceptedAt: null },
    })

    await sendOrgInvitationEmail({
      toEmail: org.ceoEmail,
      toName: org.ceoName,
      orgName: org.name,
      inviteToken,
    })

    await logAuditAction({
      superAdminId: adminId,
      tenantId: id,
      action: AuditAction.ORG_UPDATED,
      targetType: 'tenant',
      targetId: id,
      targetName: org.name,
      details: { action: 'invitation_resent' } as Prisma.InputJsonValue,
    })

    return { message: 'Invitation resent successfully' }
  },
}