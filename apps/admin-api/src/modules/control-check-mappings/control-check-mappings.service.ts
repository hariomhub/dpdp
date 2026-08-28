import axios from 'axios'
import { getSuperAdminPrisma } from '@dpdp/database'
import { AuditAction, Prisma } from '@prisma/super-admin-client'
import { logAuditAction } from '../../utils/audit-logger'
import { config } from '../../config'

const db = getSuperAdminPrisma()

interface ScannerCheckInfo {
  check_id: string
  title: string
  severity: string
  service: string
  resource_type: string
  description: string
}

export const controlCheckMappingsService = {

  // ── GET /control-check-mappings/checks?provider=X ──────────────────────────
  // Read-through to cloud-scanner's real check catalog — Super Admin browses
  // actual Prowler checks instead of typing a CheckID blind. Never touches a
  // real cloud account (CheckMetadata.get_bulk reads local metadata files).
  async browseChecks(providerKey: string): Promise<ScannerCheckInfo[]> {
    const provider = await db.cloudProviderType.findUnique({ where: { key: providerKey } })
    if (!provider) throw new Error(`Unknown provider "${providerKey}"`)

    try {
      const response = await axios.get<{ provider: string; checks: ScannerCheckInfo[] }>(
        `${config.cloudScanner.scannerServiceUrl}/checks`,
        { params: { provider: providerKey }, timeout: 30_000 }
      )
      return response.data.checks
    } catch (err: any) {
      throw new Error(`Could not load checks from cloud-scanner: ${err.message}`)
    }
  },

  // ── GET /control-check-mappings ─────────────────────────────────────────────
  async listMappings(predefinedActionId?: string) {
    return db.controlCheckMapping.findMany({
      where: predefinedActionId ? { predefinedActionId } : undefined,
      orderBy: [{ provider: { displayName: 'asc' } }, { checkId: 'asc' }],
      include: {
        provider: { select: { id: true, key: true, displayName: true } },
        predefinedAction: { select: { id: true, title: true, control: { select: { id: true, title: true } } } },
      },
    })
  },

  // ── POST /control-check-mappings ────────────────────────────────────────────
  async createMapping(data: {
    predefinedActionId: string; providerId: string
    checkId: string; checkTitle: string; checkSeverity?: string
    status?: 'DRAFT' | 'PUBLISHED'
  }, adminId: string) {
    const action = await db.controlPredefinedAction.findUnique({
      where: { id: data.predefinedActionId },
      include: { control: { select: { title: true } } },
    })
    if (!action) throw new Error('Predefined action not found')

    const provider = await db.cloudProviderType.findUnique({ where: { id: data.providerId } })
    if (!provider) throw new Error('Provider not found')

    const existing = await db.controlCheckMapping.findUnique({
      where: { predefinedActionId_providerId_checkId: {
        predefinedActionId: data.predefinedActionId, providerId: data.providerId, checkId: data.checkId,
      } },
    })
    if (existing) throw new Error(`"${data.checkId}" is already mapped to "${action.title}"`)

    const mapping = await db.controlCheckMapping.create({
      data: {
        predefinedActionId: data.predefinedActionId,
        providerId: data.providerId,
        checkId: data.checkId.trim(),
        checkTitle: data.checkTitle.trim(),
        checkSeverity: data.checkSeverity ?? null,
        status: data.status ?? 'DRAFT',
      },
      include: { provider: { select: { key: true, displayName: true } } },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CHECK_MAPPING_CREATED,
      targetType: 'control_check_mapping', targetId: mapping.id, targetName: mapping.checkId,
      details: { provider: provider.key, action: action.title, control: action.control.title } as Prisma.InputJsonValue,
    })

    return mapping
  },

  // ── PATCH /control-check-mappings/:id ───────────────────────────────────────
  async updateMapping(id: string, data: { status?: 'DRAFT' | 'PUBLISHED'; isActive?: boolean }, adminId: string) {
    const existing = await db.controlCheckMapping.findUnique({ where: { id } })
    if (!existing) throw new Error('Mapping not found')

    const updated = await db.controlCheckMapping.update({
      where: { id },
      data: {
        status: data.status ?? existing.status,
        isActive: data.isActive ?? existing.isActive,
      },
    })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CHECK_MAPPING_UPDATED,
      targetType: 'control_check_mapping', targetId: id, targetName: updated.checkId,
    })

    return updated
  },

  // ── DELETE /control-check-mappings/:id ──────────────────────────────────────
  // Safe to hard-delete — historical Evidence/GapFinding rows only carry
  // sourceCheckId as a plain string, not a foreign key to this table, so
  // removing a mapping stops future findings from routing through it
  // without corrupting anything already recorded.
  async deleteMapping(id: string, adminId: string) {
    const mapping = await db.controlCheckMapping.findUnique({ where: { id } })
    if (!mapping) throw new Error('Mapping not found')

    await db.controlCheckMapping.delete({ where: { id } })

    await logAuditAction({
      superAdminId: adminId,
      action: AuditAction.CHECK_MAPPING_DELETED,
      targetType: 'control_check_mapping', targetId: id, targetName: mapping.checkId,
    })

    return { success: true }
  },
}
