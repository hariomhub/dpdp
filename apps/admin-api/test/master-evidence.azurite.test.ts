// Cross-API round trip against the Azure emulator: Super Admin stores a sample file, the TENANT side reads it back
// from the same private container. Runs only when an emulator (or test account) is available:
//   AZURE_TEST_CONNECTION_STRING="UseDevelopmentStorage=true"   (with `npm run azurite` running)
import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

const cs = process.env.AZURE_TEST_CONNECTION_STRING

const env = vi.hoisted(() => {
  const prev = { provider: process.env.STORAGE_PROVIDER, cs: process.env.AZURE_STORAGE_CONNECTION_STRING, c: process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER }
  if (process.env.AZURE_TEST_CONNECTION_STRING) {
    process.env.STORAGE_PROVIDER = 'azure'
    process.env.AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_TEST_CONNECTION_STRING
    process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER = `master-evidence-${Math.random().toString(16).slice(2, 8)}`
  }
  return prev
})

afterAll(() => {
  // keep other test files in the same worker unaffected
  if (env.provider === undefined) delete process.env.STORAGE_PROVIDER; else process.env.STORAGE_PROVIDER = env.provider
  if (env.cs === undefined) delete process.env.AZURE_STORAGE_CONNECTION_STRING; else process.env.AZURE_STORAGE_CONNECTION_STRING = env.cs
  if (env.c === undefined) delete process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER; else process.env.AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER = env.c
})

describe.skipIf(!cs)('sample evidence: Super Admin writes, tenant API reads (Azurite)', () => {
  it('round-trips the exact bytes through the private master-evidence container', async () => {
    const { storeMasterEvidenceFile, deleteMasterEvidenceFile } = await import('../src/storage/master-evidence')
    // the tenant API's own store resolver - a different app, its own config module
    const { masterEvidenceStoreFor } = await import('../../tenant-api/src/storage/stores')

    const pdf = Buffer.from('%PDF-1.7\nsample evidence for MFA\n%%EOF')
    const p = path.join(os.tmpdir(), randomUUID())
    fs.writeFileSync(p, pdf)

    const actionId = randomUUID()
    const stored = await storeMasterEvidenceFile({ path: p, originalname: 'Sample MFA config.pdf', size: pdf.length }, actionId)
    expect(stored.storageProvider).toBe('azure')
    expect(stored.fileUrl).toMatch(new RegExp(`^${actionId}/[0-9a-f-]{36}\\.pdf$`)) // no "master-evidence/" prefix inside the container

    const got = await masterEvidenceStoreFor(stored.storageProvider).get(stored.fileUrl)
    const chunks: Buffer[] = []
    for await (const c of got.stream) chunks.push(c as Buffer)
    expect(Buffer.concat(chunks).equals(pdf)).toBe(true)

    await deleteMasterEvidenceFile({ fileUrl: stored.fileUrl, storageProvider: stored.storageProvider })
    await expect(masterEvidenceStoreFor('azure').get(stored.fileUrl)).rejects.toThrow(/not found/i)
    fs.rmSync(p, { force: true })
  })
})
