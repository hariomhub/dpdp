import { randomUUID } from 'crypto'

/**
 * Database-backed tests run only when scripts/test-db.js (npm run test:db) provides scratch databases.
 * Each test file works inside its own organisation id, so files do not interfere with one another.
 */
export const TEST_TENANT_URL = process.env.TEST_TENANT_DATABASE_URL
export const TEST_SA_URL = process.env.TEST_SUPER_ADMIN_DATABASE_URL
export const hasDb = !!(TEST_TENANT_URL && TEST_SA_URL)

/** Point the application's database clients at the scratch databases. Call before importing any application module. */
export function useTestDatabases(): void {
  process.env.TENANT_DATABASE_URL = TEST_TENANT_URL
  process.env.SUPER_ADMIN_DATABASE_URL = TEST_SA_URL
  process.env.NODE_ENV = 'test'
}

export const newOrgId = () => randomUUID()

type Db = any

export async function makeUser(db: Db, tenantId: string, role: string, o: Partial<{ email: string; status: string; source: string; deactivatedReason: string | null; entraObjectId: string | null; syncedGroupId: string | null }> = {}) {
  const id = randomUUID()
  return db.user.create({
    data: {
      id, tenantId, name: `${role} ${id.slice(0, 4)}`, email: o.email ?? `${role.toLowerCase()}-${id.slice(0, 8)}@example.test`,
      role, status: o.status ?? 'ACTIVE', source: o.source ?? 'MANUAL',
      deactivatedReason: (o.deactivatedReason ?? null) as any, entraObjectId: o.entraObjectId ?? null, syncedGroupId: o.syncedGroupId ?? null,
    },
  })
}

export async function makeDepartment(db: Db, tenantId: string, name = `Dept ${randomUUID().slice(0, 6)}`) {
  return db.department.create({ data: { tenantId, name } })
}

export async function makeAsset(db: Db, tenantId: string, departmentId: string, code = `AST-${randomUUID().slice(0, 6)}`) {
  return db.asset.create({
    data: { tenantId, assetCode: code, name: `Asset ${code}`, assetType: 'SYSTEM_APPLICATION', departmentId, hostingLocation: 'India', dataCategories: [] },
  })
}

export async function makeAssessment(db: Db, tenantId: string, departmentId: string, createdById: string) {
  return db.assessment.create({
    data: { tenantId, name: 'A', departmentId, createdById, startDate: new Date(), endDate: new Date(Date.now() + 864e5) },
  })
}

export async function makeTask(db: Db, o: { tenantId: string; assessmentId: string; assetId: string; assignedToId: string | null; status: string; code: string }) {
  return db.complianceTask.create({
    data: {
      tenantId: o.tenantId, taskCode: o.code, title: `Task ${o.code}`, description: 'd', assessmentId: o.assessmentId,
      controlId: randomUUID(), assetId: o.assetId, assignedToId: o.assignedToId, status: o.status as any, dueDate: new Date(Date.now() + 864e5),
      startedAt: o.status === 'IN_PROGRESS' ? new Date() : null,
    },
  })
}
