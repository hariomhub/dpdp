import { getTenantPrisma } from '@dpdp/database'

const db = getTenantPrisma()

const ACTION_LABEL: Record<string, string> = {
  USER_LOGIN:            'User logged in',
  USER_LOGOUT:           'User logged out',
  USER_INVITED:          'User invited',
  USER_ACTIVATED:        'User account activated',
  USER_DEACTIVATED:      'User deactivated',
  ONBOARDING_COMPLETED:  'Onboarding completed',
  DEPARTMENT_CREATED:    'Department created',
  DEPARTMENT_UPDATED:    'Department updated',
  DEPARTMENT_DELETED:    'Department deleted',
  ASSET_CREATED:         'Asset created',
  ASSET_UPDATED:         'Asset updated',
  ASSET_DEACTIVATED:     'Asset removed',
  PII_RECORD_CREATED:    'PII record added',
  PII_RECORD_UPDATED:    'PII record updated',
  PII_RECORD_DELETED:    'PII record deleted',
  SUPPLIER_CREATED:      'Supplier added',
  SUPPLIER_UPDATED:      'Supplier updated',
  SUPPLIER_DELETED:      'Supplier removed',
  ASSESSMENT_CREATED:    'Assessment created',
  ASSESSMENT_UPDATED:    'Assessment updated',
  ASSESSMENT_CLOSED:     'Assessment closed',
  TASK_CREATED:          'Task created',
  TASK_ASSIGNED:         'Task assigned',
  TASK_STARTED:          'Task started',
  TASK_SUBMITTED:        'Evidence submitted',
  TASK_APPROVED:         'Evidence approved',
  TASK_REJECTED:         'Evidence rejected',
  TASK_ESCALATED:        'Task escalated',
  TASK_REDELEGATED:      'Task re-delegated',
  EVIDENCE_UPLOADED:     'Evidence uploaded',
  EVIDENCE_UPDATED:      'Evidence updated',
  EVIDENCE_APPROVED:     'Evidence approved',
  EVIDENCE_REJECTED:     'Evidence rejected',
  SETTINGS_UPDATED:      'Settings updated',
  CLASSIFICATION_CHANGED: 'DPDP classification changed',
  ENTRA_CONNECTED:       'Entra ID connected',
  ENTRA_DISCONNECTED:    'Entra ID disconnected',
}

const MODULE_LABEL: Record<string, string> = {
  tenant:           'Settings',
  department:       'Org Structure',
  asset:            'Assets',
  pii_record:       'Assets',
  supplier:         'Suppliers',
  assessment:       'Assessments',
  compliance_task:  'Tasks',
  evidence:         'Evidence',
  user_invitation:  'Users',
  onboarding_structure: 'Onboarding',
}

export const auditService = {
  async getLogs(tenantId: string, params: {
    page?: number
    limit?: number
    module?: string
    action?: string
    from?: string
    to?: string
  }) {
    const page  = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 25))
    const skip  = (page - 1) * limit

    const where: Record<string, unknown> = { tenantId }

    if (params.module && params.module !== 'All') {
      // Filter by module using targetType mapping
      const targetTypes = Object.entries(MODULE_LABEL)
        .filter(([, label]) => label === params.module)
        .map(([type]) => type)
      if (targetTypes.length > 0) where.targetType = { in: targetTypes }
    }

    if (params.action && params.action !== 'All') {
      where.action = params.action
    }

    if (params.from || params.to) {
      where.createdAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to   ? { lte: new Date(params.to + 'T23:59:59Z') } : {}),
      }
    }

    const [total, logs] = await Promise.all([
      db.tenantAuditLog.count({ where: where as any }),
      db.tenantAuditLog.findMany({
        where:   where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { name: true, role: true, email: true } } },
      }),
    ])

    const rows = logs.map(log => ({
      id:         log.id,
      timestamp:  log.createdAt.toISOString(),
      user:       log.user?.name ?? 'System',
      email:      log.user?.email ?? '',
      role:       log.user?.role ?? null,
      action:     ACTION_LABEL[log.action] ?? log.action,
      rawAction:  log.action,
      module:     MODULE_LABEL[log.targetType] ?? log.targetType,
      targetName: log.targetName ?? '',
      details:    log.details,
      ipAddress:  log.ipAddress,
    }))

    return {
      rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  },
}
