import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'crypto'
import { hasDb, makeUser, newOrgId, useTestDatabases } from './helpers'

// The queue itself needs Redis; what matters here is what is HANDED to it. Capture the payloads.
const queued = vi.hoisted(() => ({ jobs: [] as Array<{ kind: string; data: any }> }))
vi.mock('../../src/queue/queues', () => ({
  enqueueConnectionTest: async (data: any) => { queued.jobs.push({ kind: 'connection-test', data }) },
  enqueueDiscoveryScan: async (data: any) => { queued.jobs.push({ kind: 'discovery-scan', data }) },
}))
const scanner = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('axios', () => ({ default: { post: scanner.post } }))

describe.skipIf(!hasDb)('cloud credentials never travel through the queue (real databases)', () => {
  let db: any, sa: any
  let connections: any, discovery: any, processConnectionTest: any, processDiscoveryScan: any

  const SECRET = { tenant_id: 'tt', client_id: 'cc', client_secret: 'SUPER-SECRET-VALUE-123' }

  beforeAll(async () => {
    useTestDatabases()
    process.env.CLOUD_CONNECTION_ENCRYPTION_KEY = 'ab'.repeat(32)
    const database = await import('@dpdp/database')
    db = database.getTenantPrisma(); sa = database.getSuperAdminPrisma()
    connections = (await import('../../src/modules/cloud-connections/cloud-connections.service')).cloudConnectionsService
    discovery = (await import('../../src/modules/discovery/discovery.service')).discoveryService
    processConnectionTest = (await import('../../src/queue/processors/connection-test.processor')).processConnectionTest
    processDiscoveryScan = (await import('../../src/queue/processors/discovery-scan.processor')).processDiscoveryScan
  })
  afterAll(async () => { await db?.$disconnect(); await sa?.$disconnect() })

  async function connect() {
    const key = `azure-${randomUUID().slice(0, 6)}`
    await sa.cloudProviderType.create({ data: { key, displayName: 'Azure', category: 'CLOUD_INFRASTRUCTURE', isActive: true, credentialSchema: {} } })
    const tenantId = newOrgId(), user = await makeUser(db, tenantId, 'IT_ADMIN')
    queued.jobs.length = 0
    const connection = await connections.createConnection({ tenantId, userId: user.id, providerKey: key, alias: 'prod', credentials: SECRET })
    return { tenantId, key, connection }
  }

  it('creating a connection stores ciphertext and queues only identifiers', async () => {
    const { tenantId, key, connection } = await connect()
    const row = await db.tenantCloudConnection.findUnique({ where: { id: connection.id } })
    expect(row.credentialEncrypted).not.toContain('SUPER-SECRET-VALUE-123')

    expect(queued.jobs).toHaveLength(1)
    expect(queued.jobs[0].data).toEqual({ tenantId, connectionId: connection.id, provider: key })
    expect(JSON.stringify(queued.jobs)).not.toContain('SUPER-SECRET')
  })

  it('retest and discovery queue only identifiers too', async () => {
    const { tenantId, connection } = await connect()
    queued.jobs.length = 0
    await connections.retestConnection({ connectionId: connection.id, tenantId })
    await discovery.triggerDiscovery({ connectionId: connection.id, tenantId, userId: 'u' })
    expect(queued.jobs.map(j => j.kind)).toEqual(['connection-test', 'discovery-scan'])
    for (const j of queued.jobs) {
      expect(Object.keys(j.data).sort()).toEqual(['connectionId', 'provider', 'tenantId'])
      expect(JSON.stringify(j.data)).not.toContain('SUPER-SECRET')
    }
  })

  it('the worker loads and decrypts the credentials itself, only when it runs the job', async () => {
    const { tenantId, key, connection } = await connect()
    scanner.post.mockReset()
    scanner.post.mockResolvedValue({ data: { connected: true, error: null } })

    await processConnectionTest({ tenantId, connectionId: connection.id, provider: key })

    expect(scanner.post).toHaveBeenCalledTimes(1)
    expect(scanner.post.mock.calls[0][0]).toMatch(/\/connection-test$/)
    expect(scanner.post.mock.calls[0][1]).toEqual({ provider: key, credentials: SECRET })   // decrypted for the scanner call only
    expect(await db.tenantCloudConnection.findUnique({ where: { id: connection.id } })).toMatchObject({ status: 'CONNECTED', lastError: null })
  })

  it('a job that still carries credentials from an older release is ignored for them: the stored ones are used', async () => {
    const { tenantId, key, connection } = await connect()
    scanner.post.mockReset(); scanner.post.mockResolvedValue({ data: { connected: true, error: null } })
    await processConnectionTest({ tenantId, connectionId: connection.id, provider: key, credentials: { client_secret: 'STALE' } } as any)
    expect(scanner.post.mock.calls[0][1].credentials).toEqual(SECRET)
  })

  it('a connection disconnected while its job was waiting is skipped quietly (no scanner call, no retry storm)', async () => {
    const { tenantId, key, connection } = await connect()
    await db.tenantCloudConnection.delete({ where: { id: connection.id } })
    scanner.post.mockReset()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    await expect(processConnectionTest({ tenantId, connectionId: connection.id, provider: key })).resolves.toBeUndefined()
    await expect(processDiscoveryScan({ tenantId, connectionId: connection.id, provider: key })).resolves.toBeUndefined()
    expect(scanner.post).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('another organisation cannot queue a scan for this connection', async () => {
    const { connection } = await connect()
    await expect(discovery.triggerDiscovery({ connectionId: connection.id, tenantId: newOrgId(), userId: 'u' })).rejects.toThrow(/Connection not found/)
  })
})
