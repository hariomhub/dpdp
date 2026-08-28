import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { encryptWithKey, decryptWithKey } from '../../utils/crypto'
import { config } from '../../config'
import { enqueueConnectionTest } from '../../queue/queues'

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

function encryptCreds(credentials: Record<string, unknown>): string {
  return encryptWithKey(JSON.stringify(credentials), config.cloudScanner.encryptionKey)
}

function decryptCreds(ciphertext: string): Record<string, unknown> {
  return JSON.parse(decryptWithKey(ciphertext, config.cloudScanner.encryptionKey))
}

export const cloudConnectionsService = {

  // ── GET /cloud-connections/providers ────────────────────────────────────
  // Reads directly from the super-admin database — the same established
  // cross-database read pattern onboarding.service.ts already uses for
  // Tenant/Regulation data, not a new architecture.
  async listActiveProviders() {
    const providers = await superAdminDb.cloudProviderType.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { displayName: 'asc' }],
      select: {
        key: true,
        displayName: true,
        category: true,
        credentialSchema: true,
        logoUrl: true,
      },
    })
    return providers
  },

  // ── GET /cloud-connections ───────────────────────────────────────────────
  async listConnections(tenantId: string) {
    const connections = await db.tenantCloudConnection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, providerKey: true, alias: true, status: true,
        lastCheckedAt: true, lastError: true, createdAt: true,
        _count: { select: { discoveredAssets: true } },
      },
    })

    // Enrich with provider display names in one batched cross-database read
    // rather than one query per row.
    const providerKeys = [...new Set(connections.map(c => c.providerKey))]
    const providers = await superAdminDb.cloudProviderType.findMany({
      where: { key: { in: providerKeys } },
      select: { key: true, displayName: true },
    })
    const displayNameByKey = new Map(providers.map(p => [p.key, p.displayName]))

    return connections.map(c => ({
      ...c,
      providerDisplayName: displayNameByKey.get(c.providerKey) ?? c.providerKey,
    }))
  },

  // ── POST /cloud-connections ──────────────────────────────────────────────
  async createConnection(params: {
    tenantId: string; userId: string
    providerKey: string; alias: string; credentials: Record<string, unknown>
  }) {
    const provider = await superAdminDb.cloudProviderType.findUnique({
      where: { key: params.providerKey },
    })
    if (!provider) throw new Error(`Unknown provider "${params.providerKey}"`)
    if (!provider.isActive) throw new Error(`Provider "${provider.displayName}" is not currently active`)

    const existing = await db.tenantCloudConnection.findFirst({
      where: { tenantId: params.tenantId, providerKey: params.providerKey, alias: params.alias.trim() },
    })
    if (existing) throw new Error(`A connection named "${params.alias}" already exists for ${provider.displayName}`)

    const connection = await db.tenantCloudConnection.create({
      data: {
        tenantId: params.tenantId,
        providerKey: params.providerKey,
        alias: params.alias.trim(),
        credentialEncrypted: encryptCreds(params.credentials),
        status: 'PENDING',
      },
    })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId,
      action: TenantAuditAction.CLOUD_CONNECTION_CREATED,
      targetType: 'tenant_cloud_connection', targetId: connection.id, targetName: params.alias,
      details: { providerKey: params.providerKey },
    })

    await enqueueConnectionTest({
      tenantId: params.tenantId,
      connectionId: connection.id,
      provider: params.providerKey,
      credentials: params.credentials,
    })

    return connection
  },

  // ── POST /cloud-connections/:id/retest ───────────────────────────────────
  async retestConnection(params: { connectionId: string; tenantId: string }) {
    const connection = await db.tenantCloudConnection.findFirst({
      where: { id: params.connectionId, tenantId: params.tenantId },
    })
    if (!connection) throw new Error('Connection not found')

    const credentials = decryptCreds(connection.credentialEncrypted)

    await enqueueConnectionTest({
      tenantId: params.tenantId,
      connectionId: connection.id,
      provider: connection.providerKey,
      credentials,
    })

    return { queued: true }
  },

  // ── DELETE /cloud-connections/:id ────────────────────────────────────────
  async disconnectConnection(params: { connectionId: string; tenantId: string; userId: string }) {
    const connection = await db.tenantCloudConnection.findFirst({
      where: { id: params.connectionId, tenantId: params.tenantId },
    })
    if (!connection) throw new Error('Connection not found')

    await db.tenantCloudConnection.delete({ where: { id: connection.id } })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId,
      action: TenantAuditAction.CLOUD_CONNECTION_DISCONNECTED,
      targetType: 'tenant_cloud_connection', targetId: connection.id, targetName: connection.alias,
    })

    return { disconnected: true }
  },

  // Internal — used by the discovery module, not exposed as its own route.
  async getDecryptedCredentials(connectionId: string, tenantId: string) {
    const connection = await db.tenantCloudConnection.findFirst({
      where: { id: connectionId, tenantId },
    })
    if (!connection) throw new Error('Connection not found')
    return { providerKey: connection.providerKey, credentials: decryptCreds(connection.credentialEncrypted) }
  },
}
