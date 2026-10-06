import { getTenantPrisma } from '@dpdp/database'
import { encryptWithKey, decryptWithKey } from '../../utils/crypto'
import { config } from '../../config'

/**
 * Cloud account credentials are stored encrypted and are decrypted ONLY at the moment they are used - by the worker,
 * right before it calls the scanner. They are never placed in a queue payload: Redis is not an encrypted store, and its
 * persistence files and backups would otherwise hold every customer's cloud keys in plain text.
 */
export function encryptCreds(credentials: Record<string, unknown>): string {
  return encryptWithKey(JSON.stringify(credentials), config.cloudScanner.encryptionKey)
}

export function decryptCreds(ciphertext: string): Record<string, unknown> {
  return JSON.parse(decryptWithKey(ciphertext, config.cloudScanner.encryptionKey))
}

export interface LoadedConnection {
  id: string
  providerKey: string
  credentials: Record<string, unknown>
}

/** The connection with its credentials decrypted, or null if it no longer exists (e.g. disconnected while a job was waiting). */
export async function loadConnectionWithCredentials(connectionId: string, tenantId: string): Promise<LoadedConnection | null> {
  const connection = await getTenantPrisma().tenantCloudConnection.findFirst({ where: { id: connectionId, tenantId } })
  if (!connection) return null
  return { id: connection.id, providerKey: connection.providerKey, credentials: decryptCreds(connection.credentialEncrypted) }
}
