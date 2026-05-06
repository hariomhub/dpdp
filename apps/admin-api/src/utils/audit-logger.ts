import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'

const db = getSuperAdminPrisma()

interface AuditLogParams {
  superAdminId?: string
  tenantId?: string
  action: AuditAction
  targetType: string
  targetId?: string
  targetName?: string
  details?: Prisma.InputJsonValue
  ipAddress?: string
}

export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    await db.platformAuditLog.create({
      data: {
        superAdminId: params.superAdminId,
        tenantId: params.tenantId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    })
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}