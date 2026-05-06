import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { parsePagination, buildMeta } from '../../utils/pagination'

const db = getSuperAdminPrisma()

export const auditService = {
  async list(query: Record<string, unknown>) {
    const { page, limit, skip } = parsePagination(query)

    const where: Prisma.PlatformAuditLogWhereInput = {}

    if (query.superAdminId) where.superAdminId = String(query.superAdminId)
    if (query.tenantId) where.tenantId = String(query.tenantId)
    if (query.action) where.action = query.action as AuditAction
    if (query.targetType) where.targetType = String(query.targetType)

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {}
      if (query.dateFrom) {
        where.createdAt.gte = new Date(String(query.dateFrom))
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(String(query.dateTo))
      }
    }

    if (query.search) {
      where.OR = [
        { targetName: { contains: String(query.search), mode: 'insensitive' } },
        { targetType: { contains: String(query.search), mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      db.platformAuditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          superAdmin: {
            select: { id: true, name: true, email: true },
          },
          tenant: {
            select: { id: true, name: true, tenantCode: true },
          },
        },
      }),
      db.platformAuditLog.count({ where }),
    ])

    return { data: logs, meta: buildMeta(total, page, limit) }
  },
}