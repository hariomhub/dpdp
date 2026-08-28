import axios from 'axios'
import { getTenantPrisma } from '@dpdp/database'
import { TenantAuditAction } from '@prisma/tenant-client'
import { config } from '../../config'
import { logTenantAction } from '../../utils/audit-logger'
import { ConnectionTestJobData } from '../queues'

const db = getTenantPrisma()

interface ScannerConnectionTestResponse {
  connected: boolean
  error: string | null
}

export async function processConnectionTest(data: ConnectionTestJobData): Promise<void> {
  const { tenantId, connectionId, provider, credentials } = data

  let result: ScannerConnectionTestResponse
  try {
    const response = await axios.post<ScannerConnectionTestResponse>(
      `${config.cloudScanner.scannerServiceUrl}/connection-test`,
      { provider, credentials },
      { timeout: 60_000 }
    )
    result = response.data
  } catch (err: any) {
    // A failure to reach the scanner service itself (not a bad-credentials
    // response from it) is a different failure mode — surface it distinctly
    // rather than reporting it as "credentials rejected".
    result = {
      connected: false,
      error: `Could not reach cloud-scanner service: ${err.message}`,
    }
  }

  await db.tenantCloudConnection.update({
    where: { id: connectionId },
    data: {
      status: result.connected ? 'CONNECTED' : 'FAILED',
      lastCheckedAt: new Date(),
      lastError: result.error,
    },
  })

  await logTenantAction({
    tenantId,
    action: result.connected
      ? TenantAuditAction.CLOUD_CONNECTION_TESTED
      : TenantAuditAction.CLOUD_CONNECTION_FAILED,
    targetType: 'tenant_cloud_connection',
    targetId: connectionId,
    targetName: provider,
    details: { connected: result.connected, error: result.error },
  })
}
