import { getTenantPrisma } from '@dpdp/database'
import { listActiveOrgs } from '../../platform/tenant-profile'
import { computeLiveOrgMetrics, riskLevelOf, computeAuditReadinessScore } from '../../modules/dashboard/dashboard.service'
import { computeDepartmentAndRegulationRisk } from '../../modules/risk/risk.service'
import { todaySnapshotDate } from '../../utils/snapshot-date'

const db = getTenantPrisma()

/**
 * Captures one DashboardMetricSnapshot + one org-level RiskSnapshot row
 * per active tenant, for today. Upserts (keyed on tenantId+date), so it's
 * safe to re-run manually without creating duplicates.
 */
export async function processCaptureDailySnapshot(): Promise<void> {
  const tenants = await listActiveOrgs()

  const snapshotDate = todaySnapshotDate()
  let succeeded = 0, failed = 0

  for (const tenant of tenants) {
    try {
      const metrics = await computeLiveOrgMetrics(tenant.id)
      const auditReadinessScore = computeAuditReadinessScore(metrics.complianceScore, metrics.overdueByPriority)

      await db.dashboardMetricSnapshot.upsert({
        where: { tenantId_snapshotDate: { tenantId: tenant.id, snapshotDate } },
        update: {
          complianceScore:     metrics.complianceScore,
          totalControls:       metrics.totalControls,
          compliantControls:   metrics.compliantControls,
          overdueTasksTotal:   metrics.overdueTasksTotal,
          overdueCritical:     metrics.overdueByPriority.CRITICAL,
          overdueHigh:         metrics.overdueByPriority.HIGH,
          overdueMedium:       metrics.overdueByPriority.MEDIUM,
          overdueLow:          metrics.overdueByPriority.LOW,
          crossBorderPiiCount: metrics.crossBorderPiiCount,
          suppliersWithoutDpa: metrics.suppliersWithoutDpa,
          auditReadinessScore,
        },
        create: {
          tenantId: tenant.id, snapshotDate,
          complianceScore:     metrics.complianceScore,
          totalControls:       metrics.totalControls,
          compliantControls:   metrics.compliantControls,
          overdueTasksTotal:   metrics.overdueTasksTotal,
          overdueCritical:     metrics.overdueByPriority.CRITICAL,
          overdueHigh:         metrics.overdueByPriority.HIGH,
          overdueMedium:       metrics.overdueByPriority.MEDIUM,
          overdueLow:          metrics.overdueByPriority.LOW,
          crossBorderPiiCount: metrics.crossBorderPiiCount,
          suppliersWithoutDpa: metrics.suppliersWithoutDpa,
          auditReadinessScore,
        },
      })

      await db.riskSnapshot.upsert({
        where: {
          tenantId_entityType_entityId_snapshotDate: {
            tenantId: tenant.id, entityType: 'org', entityId: tenant.id, snapshotDate,
          },
        },
        update: {
          riskScore: metrics.riskScore,
          riskLevel: riskLevelOf(metrics.riskScore),
          factors: {
            nonCompliantControls: metrics.totalControls - metrics.compliantControls,
            overdueTasks: metrics.overdueTasksTotal,
            piiSensitivity: null,
            assetCriticality: null,
          },
        },
        create: {
          tenantId: tenant.id, entityType: 'org', entityId: tenant.id, entityName: tenant.name,
          snapshotDate,
          riskScore: metrics.riskScore,
          riskLevel: riskLevelOf(metrics.riskScore),
          factors: {
            nonCompliantControls: metrics.totalControls - metrics.compliantControls,
            overdueTasks: metrics.overdueTasksTotal,
            piiSensitivity: null,
            assetCriticality: null,
          },
        },
      })

      const { departmentRisk, regulationRisk } = await computeDepartmentAndRegulationRisk(tenant.id)

      // Fresh object literal (not the RiskFactors-typed value directly) — Prisma's
      // Json input type wants a plain indexable object, not a named interface.
      const factorsJson = (f: typeof departmentRisk[number]['factors']) => ({
        totalTasks: f.totalTasks, nonCompliantTasks: f.nonCompliantTasks, overdueTasks: f.overdueTasks,
        avgCriticality: f.avgCriticality, avgPiiSensitivity: f.avgPiiSensitivity, crossBorderTransfer: f.crossBorderTransfer,
      })

      for (const dept of departmentRisk) {
        await db.riskSnapshot.upsert({
          where: { tenantId_entityType_entityId_snapshotDate: { tenantId: tenant.id, entityType: 'department', entityId: dept.id, snapshotDate } },
          update: { riskScore: dept.score, riskLevel: riskLevelOf(dept.score), factors: factorsJson(dept.factors) },
          create: { tenantId: tenant.id, entityType: 'department', entityId: dept.id, entityName: dept.name, snapshotDate, riskScore: dept.score, riskLevel: riskLevelOf(dept.score), factors: factorsJson(dept.factors) },
        })
      }

      for (const reg of regulationRisk) {
        await db.riskSnapshot.upsert({
          where: { tenantId_entityType_entityId_snapshotDate: { tenantId: tenant.id, entityType: 'regulation', entityId: reg.id, snapshotDate } },
          update: { riskScore: reg.score, riskLevel: riskLevelOf(reg.score), factors: factorsJson(reg.factors) },
          create: { tenantId: tenant.id, entityType: 'regulation', entityId: reg.id, entityName: reg.label, snapshotDate, riskScore: reg.score, riskLevel: riskLevelOf(reg.score), factors: factorsJson(reg.factors) },
        })
      }

      succeeded++
    } catch (err) {
      failed++
      console.error(`[dashboard-snapshot] Failed for tenant ${tenant.id}:`, err)
    }
  }

  console.log(`[dashboard-snapshot] Captured ${succeeded}/${tenants.length} tenants (${failed} failed)`)
}
