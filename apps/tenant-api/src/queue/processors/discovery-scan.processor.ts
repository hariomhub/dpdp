import axios from 'axios'
import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'
import { config } from '../../config'
import { logTenantAction } from '../../utils/audit-logger'
import { DiscoveryScanJobData } from '../queues'

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

interface ScannerResource {
  uid: string
  name: string
  region: string
  service: string
  cloud_resource_type: string
  tags: Record<string, string>
  metadata: Record<string, unknown>
}

interface ScannerDiscoveryResponse {
  provider: string
  connected: boolean
  error: string | null
  resources: ScannerResource[]
  findings: unknown[]
}

export async function processDiscoveryScan(data: DiscoveryScanJobData): Promise<void> {
  const { tenantId, connectionId, provider, credentials } = data

  const response = await axios.post<ScannerDiscoveryResponse>(
    `${config.cloudScanner.scannerServiceUrl}/discover`,
    { provider, credentials },
    // A real scan runs hundreds of checks — this can genuinely take
    // several minutes, matching what was observed running Prowler live
    // against a real account earlier in this project.
    { timeout: 15 * 60 * 1000 }
  )
  const result = response.data

  if (!result.connected) {
    await db.tenantCloudConnection.update({
      where: { id: connectionId },
      data: { status: 'FAILED', lastCheckedAt: new Date(), lastError: result.error },
    })
    await logTenantAction({
      tenantId,
      action: TenantAuditAction.CLOUD_CONNECTION_FAILED,
      targetType: 'tenant_cloud_connection', targetId: connectionId,
      details: { error: result.error, duringDiscovery: true },
    })
    return
  }

  // Load the Generic Asset Catalog for this provider once, not per-resource.
  const providerType = await superAdminDb.cloudProviderType.findUnique({
    where: { key: provider },
    select: { id: true },
  })
  const templates = providerType
    ? await superAdminDb.genericAssetTemplate.findMany({
        where: { providerId: providerType.id, status: 'PUBLISHED', isActive: true },
        select: { cloudResourceType: true, assetType: true, defaultCriticality: true },
      })
    : []
  const templateByResourceType = new Map(
    templates.map(t => [t.cloudResourceType, t])
  )

  let matched = 0
  let unrecognized = 0

  for (const resource of result.resources) {
    const template = templateByResourceType.get(resource.cloud_resource_type)
    if (template) matched++
    else unrecognized++

    const existing = await db.discoveredAssetDraft.findUnique({
      where: { connectionId_cloudResourceUid: { connectionId, cloudResourceUid: resource.uid } },
      select: { id: true, status: true },
    })

    // A draft the reviewer already confirmed or dismissed is a closed
    // decision — a re-scan refreshes only still-PENDING drafts (or creates
    // a new one for a resource seen for the first time), never silently
    // reopens or overwrites something a human already acted on.
    if (existing && existing.status !== 'PENDING') continue

    const draftData = {
      name: resource.name,
      region: resource.region,
      tags: resource.tags,
      metadata: resource.metadata as any,
      suggestedAssetType: template?.assetType ?? null,
      suggestedCriticality: template?.defaultCriticality ?? null,
    }

    if (existing) {
      await db.discoveredAssetDraft.update({ where: { id: existing.id }, data: draftData })
    } else {
      await db.discoveredAssetDraft.create({
        data: {
          tenantId,
          connectionId,
          cloudResourceUid: resource.uid,
          service: resource.service,
          cloudResourceType: resource.cloud_resource_type,
          status: 'PENDING',
          ...draftData,
        },
      })
    }
  }

  await db.tenantCloudConnection.update({
    where: { id: connectionId },
    data: { status: 'CONNECTED', lastCheckedAt: new Date(), lastError: null },
  })

  await logTenantAction({
    tenantId,
    action: TenantAuditAction.ASSETS_DISCOVERED,
    targetType: 'tenant_cloud_connection', targetId: connectionId,
    details: {
      resourcesFound: result.resources.length,
      matched,
      unrecognized,
    },
  })
}
