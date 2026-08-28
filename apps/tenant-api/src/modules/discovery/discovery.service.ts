import { getTenantPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { orgService } from '../org/org.service'
import { cloudConnectionsService } from '../cloud-connections/cloud-connections.service'
import { enqueueDiscoveryScan } from '../../queue/queues'

const db = getTenantPrisma()

// Reverse of org.service.ts's ASSET_TYPE_MAP — GenericAssetTemplate stores
// the raw AssetType enum value (validated against the same set admin-api
// validates against), but orgService.createAsset expects the label string
// a human would pick from a dropdown. Kept local rather than exported from
// org.service.ts since nothing there needs the reverse direction.
const ASSET_TYPE_ENUM_TO_LABEL: Record<string, string> = {
  DATABASE_DATA_STORE: 'Database / Data Store',
  SYSTEM_APPLICATION: 'System / Application',
  DATA_FLOW: 'Data Flow',
  THIRD_PARTY_VENDOR: 'Third-Party Vendor',
  CONSENT_MECHANISM: 'Consent Mechanism',
  PHYSICAL_HARDWARE: 'Physical / Hardware',
  API_INTEGRATION: 'API / Integration Layer',
  MOBILE_APPLICATION: 'Mobile Application',
  LEGACY_SYSTEM: 'Legacy System',
  SAAS_THIRD_PARTY: 'SaaS (Third-Party Hosted)',
  OUTSOURCED_MANAGED: 'Outsourced / Managed Service',
  IN_HOUSE_CLOUD: 'In-House (Cloud Hosted)',
  IN_HOUSE_ON_PREMISE: 'In-House (On-Premise)',
  THIRD_PARTY_CLOUD: 'Third-Party (Cloud Hosted)',
}

const CRITICALITY_ENUM_TO_LABEL: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
}

export const discoveryService = {

  // ── POST /cloud-connections/:id/discover ─────────────────────────────────
  async triggerDiscovery(params: { connectionId: string; tenantId: string; userId: string }) {
    const { providerKey, credentials } = await cloudConnectionsService.getDecryptedCredentials(
      params.connectionId, params.tenantId
    )

    await enqueueDiscoveryScan({
      tenantId: params.tenantId,
      connectionId: params.connectionId,
      provider: providerKey,
      credentials,
    })

    return { queued: true }
  },

  // ── GET /discovery/drafts ─────────────────────────────────────────────────
  async listDrafts(params: { tenantId: string; connectionId?: string; status?: string }) {
    return db.discoveredAssetDraft.findMany({
      where: {
        tenantId: params.tenantId,
        connectionId: params.connectionId,
        status: (params.status as any) ?? 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        connection: { select: { providerKey: true, alias: true } },
      },
    })
  },

  // ── POST /discovery/drafts/:id/confirm ────────────────────────────────────
  // Reviewer supplies the department (drafts aren't scoped to one — a cloud
  // account often spans several) and, for an unrecognized resource with no
  // suggestedAssetType, must supply an assetType manually. Everything else
  // can be overridden or left as the suggestion.
  async confirmDraft(params: {
    draftId: string; tenantId: string; userId: string; departmentId: string
    overrides?: {
      name?: string; assetType?: string; criticality?: string
      internetFacing?: boolean; hostingLocation?: string; vendorName?: string
    }
  }) {
    const draft = await db.discoveredAssetDraft.findFirst({
      where: { id: params.draftId, tenantId: params.tenantId },
      include: { connection: { select: { providerKey: true } } },
    })
    if (!draft) throw new Error('Draft not found')
    if (draft.status !== 'PENDING') throw new Error(`Draft is already ${draft.status.toLowerCase()}`)

    const assetTypeEnum = params.overrides?.assetType ?? draft.suggestedAssetType
    if (!assetTypeEnum) {
      throw new Error('This resource has no suggested asset type — an asset type must be supplied to confirm it')
    }
    const assetTypeLabel = ASSET_TYPE_ENUM_TO_LABEL[assetTypeEnum]
    if (!assetTypeLabel) throw new Error(`"${assetTypeEnum}" is not a recognised asset type`)

    const criticalityEnum = params.overrides?.criticality ?? draft.suggestedCriticality ?? 'MEDIUM'
    const criticalityLabel = CRITICALITY_ENUM_TO_LABEL[criticalityEnum] ?? 'Medium'

    const asset = await orgService.createAsset(params.tenantId, params.userId, params.departmentId, {
      name: params.overrides?.name ?? draft.name,
      assetType: assetTypeLabel,
      hostingLocation: params.overrides?.hostingLocation ?? draft.region,
      vendorName: params.overrides?.vendorName ?? draft.connection.providerKey,
      criticality: criticalityLabel,
      internetFacing: params.overrides?.internetFacing ?? draft.internetFacing,
      status: 'Active',
    })

    await db.discoveredAssetDraft.update({
      where: { id: draft.id },
      data: { status: 'CONFIRMED', reviewedAssetId: asset.id },
    })

    return asset
  },

  // ── POST /discovery/drafts/:id/dismiss ────────────────────────────────────
  async dismissDraft(params: { draftId: string; tenantId: string; userId: string }) {
    const draft = await db.discoveredAssetDraft.findFirst({
      where: { id: params.draftId, tenantId: params.tenantId },
    })
    if (!draft) throw new Error('Draft not found')
    if (draft.status !== 'PENDING') throw new Error(`Draft is already ${draft.status.toLowerCase()}`)

    await db.discoveredAssetDraft.update({
      where: { id: draft.id },
      data: { status: 'DISMISSED' },
    })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId,
      action: TenantAuditAction.ASSET_DEACTIVATED, // closest existing action; a dedicated one wasn't warranted for a draft that was never a real asset
      targetType: 'discovered_asset_draft', targetId: draft.id, targetName: draft.name,
      details: { dismissed: true },
    })

    return { dismissed: true }
  },
}
