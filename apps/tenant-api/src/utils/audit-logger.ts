import { getTenantPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'

interface AuditParams {
  tenantId: string
  userId?: string
  role?: string
  action: TenantAuditAction
  targetType: string
  targetId?: string
  targetName?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

export async function logTenantAction(params: AuditParams): Promise<void> {
  try {
    const db = getTenantPrisma()
    await db.tenantAuditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        role: params.role as any,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        details: params.details as any,
        ipAddress: params.ipAddress,
      },
    })
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}