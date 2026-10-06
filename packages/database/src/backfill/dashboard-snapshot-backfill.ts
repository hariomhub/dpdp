/**
 * DEV/DEMO TOOL ONLY — do not run against production.
 *
 * The CEO dashboard's new trend chart (apps/tenant) reads from
 * DashboardMetricSnapshot / RiskSnapshot (packages/database/prisma/tenant),
 * which the real daily snapshot job (apps/tenant-api's worker, see
 * queue/processors/dashboard-snapshot.processor.ts) only starts populating
 * from the day it first runs. There is no real historical data to show
 * locally/in review until ~30 real days have accumulated.
 *
 * This script computes each active tenant's REAL current metrics once,
 * then synthesizes the preceding ~30 days via a small random-walk backward
 * from that real value — purely so the trend chart has something to render
 * during local dev/demo. These are NOT real historical values; they are
 * clearly a fabricated backward walk ending at today's real number.
 *
 * Refuses to run against a tenant that already has snapshot rows, so it
 * can't accidentally corrupt a tenant that's started accumulating real
 * daily-job data.
 *
 * The metric formulas here intentionally mirror (are a simplified, demo-
 * only copy of) computeLiveOrgMetrics / computeOrgRiskScore /
 * computeAuditReadinessScore in apps/tenant-api's dashboard.service.ts —
 * duplicated rather than imported because packages/database must not
 * depend on an app package.
 */

import { getTenantPrisma, getSuperAdminPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

const BACKFILL_DAYS = 30
const LEVEL_WEIGHT: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 }

function clamp(min: number, max: number, n: number): number {
  return Math.max(min, Math.min(max, n))
}

function riskLevelOf(score: number): string {
  return score <= 20 ? 'Low'
    : score <= 40 ? 'Moderate'
    : score <= 60 ? 'High'
    : score <= 80 ? 'Critical'
    : 'Severe'
}

async function computeTodayMetrics(tenantId: string) {
  const now = new Date()

  const [activeAssessments, allTasks, crossBorderPiiCount, suppliersWithoutDpa, assets] = await Promise.all([
    db.assessment.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { controls: { select: { complianceStatus: true } } },
    }),
    db.complianceTask.findMany({
      where: { tenantId },
      select: { status: true, priority: true, dueDate: true },
    }),
    db.piiRecord.count({ where: { tenantId, crossBorderTransfer: true } }),
    db.supplier.count({ where: { tenantId, dpaSigned: false } }),
    db.asset.findMany({
      where: { tenantId },
      select: { criticality: true, piiRecords: { select: { sensitivity: true, crossBorderTransfer: true } } },
    }),
  ])

  let totalControls = 0, compliantControls = 0
  for (const a of activeAssessments) {
    totalControls     += a.controls.length
    compliantControls += a.controls.filter(c => c.complianceStatus === 'COMPLIANT').length
  }
  const complianceScore = totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : null

  const overdueTasks = allTasks.filter(t => t.dueDate < now && !['COMPLIANT'].includes(t.status))
  const overdueByPriority = {
    CRITICAL: overdueTasks.filter(t => t.priority === 'CRITICAL').length,
    HIGH:     overdueTasks.filter(t => t.priority === 'HIGH').length,
    MEDIUM:   overdueTasks.filter(t => t.priority === 'MEDIUM').length,
    LOW:      overdueTasks.filter(t => t.priority === 'LOW').length,
  }

  // Simplified copy of risk.service.ts's computeRiskScore, org-wide.
  const total = allTasks.length
  const nonCompliant = allTasks.filter(t => t.status === 'REJECTED').length
  const overdueRatio = total > 0 ? overdueTasks.length / total : 0
  const nonCompliantRatio = total > 0 ? nonCompliant / total : 0
  const avgCriticality = assets.length > 0
    ? assets.reduce((s, a) => s + (LEVEL_WEIGHT[a.criticality] ?? 50), 0) / assets.length : 50
  const allPii = assets.flatMap(a => a.piiRecords)
  const avgSensitivity = allPii.length > 0
    ? allPii.reduce((s, p) => s + (LEVEL_WEIGHT[p.sensitivity] ?? 50), 0) / allPii.length : 0
  const crossBorder = allPii.some(p => p.crossBorderTransfer)
  const riskRaw = 0.40 * nonCompliantRatio * 100 + 0.25 * overdueRatio * 100
    + 0.20 * avgCriticality + 0.15 * avgSensitivity + (total > 0 && crossBorder ? 10 : 0)
  const riskScore = clamp(0, 100, Math.round(riskRaw))

  const auditReadinessScore = complianceScore === null ? null : clamp(0, 100,
    complianceScore
    - overdueByPriority.CRITICAL * 8 - overdueByPriority.HIGH * 4
    - overdueByPriority.MEDIUM * 2 - overdueByPriority.LOW * 1
  )

  return {
    complianceScore, totalControls, compliantControls, overdueByPriority,
    overdueTasksTotal: overdueTasks.length, crossBorderPiiCount, suppliersWithoutDpa,
    riskScore, auditReadinessScore,
  }
}

/** Random walk backward from `end`, staying in [0,100], `steps` points including `end` itself (last). */
function backwardWalk(end: number, steps: number): number[] {
  const series = new Array<number>(steps)
  series[steps - 1] = end
  let v = end
  for (let i = steps - 2; i >= 0; i--) {
    v = clamp(0, 100, v + Math.round((Math.random() - 0.5) * 6))
    series[i] = v
  }
  return series
}

// Simplified demo-only copy of risk.service.ts's computeDeptRegRisk — same
// reasoning as computeTodayMetrics above (packages/database can't import
// from an app package).
async function computeTodayDeptRegRisk(tenantId: string) {
  const now = new Date()
  const [departments, assets, tasks] = await Promise.all([
    db.department.findMany({ where: { tenantId }, select: { id: true, name: true } }),
    db.asset.findMany({
      where: { tenantId },
      select: { id: true, departmentId: true, criticality: true, piiRecords: { select: { sensitivity: true, crossBorderTransfer: true } } },
    }),
    db.complianceTask.findMany({
      where: { tenantId },
      select: { status: true, dueDate: true, assetId: true, assessment: { select: { regulations: { select: { regulationId: true } } } } },
    }),
  ])
  const regulationIds = Array.from(new Set(tasks.flatMap(t => t.assessment.regulations.map(r => r.regulationId))))
  const regulations = regulationIds.length > 0
    ? await superAdminDb.regulation.findMany({ where: { id: { in: regulationIds } }, select: { id: true, shortCode: true, name: true } })
    : []

  function scoreOf(taskSubset: typeof tasks, assetSubset: typeof assets) {
    const total = taskSubset.length
    const nonCompliant = taskSubset.filter(t => t.status === 'REJECTED').length
    const overdue = taskSubset.filter(t => t.dueDate < now && !['COMPLIANT', 'REJECTED'].includes(t.status)).length
    const overdueRatio = total > 0 ? overdue / total : 0
    const nonCompliantRatio = total > 0 ? nonCompliant / total : 0
    const avgCriticality = assetSubset.length > 0 ? assetSubset.reduce((s, a) => s + (LEVEL_WEIGHT[a.criticality] ?? 50), 0) / assetSubset.length : 50
    const allPii = assetSubset.flatMap(a => a.piiRecords)
    const avgSensitivity = allPii.length > 0 ? allPii.reduce((s, p) => s + (LEVEL_WEIGHT[p.sensitivity] ?? 50), 0) / allPii.length : 0
    const crossBorder = allPii.some(p => p.crossBorderTransfer)
    const raw = 0.40 * nonCompliantRatio * 100 + 0.25 * overdueRatio * 100 + 0.20 * avgCriticality + 0.15 * avgSensitivity + (total > 0 && crossBorder ? 10 : 0)
    return clamp(0, 100, Math.round(raw))
  }

  const regIdOf = (t: typeof tasks[number]) => t.assessment.regulations[0]?.regulationId ?? null
  const assetById = new Map(assets.map(a => [a.id, a]))

  const departmentScores = departments.map(dept => {
    const deptAssets = assets.filter(a => a.departmentId === dept.id)
    const deptAssetIds = new Set(deptAssets.map(a => a.id))
    const deptTasks = tasks.filter(t => deptAssetIds.has(t.assetId))
    return { id: dept.id, name: dept.name, score: scoreOf(deptTasks, deptAssets) }
  })

  const regulationScores = regulations.map(reg => {
    const regTasks = tasks.filter(t => regIdOf(t) === reg.id)
    const assetIds = Array.from(new Set(regTasks.map(t => t.assetId)))
    const regAssets = assetIds.map(id => assetById.get(id)).filter(Boolean) as typeof assets
    return { id: reg.id, name: reg.shortCode || reg.name, score: scoreOf(regTasks, regAssets) }
  })

  return { departmentScores, regulationScores }
}

async function backfillTenant(tenantId: string, tenantName: string) {
  const existing = await db.dashboardMetricSnapshot.count({ where: { tenantId } })
  if (existing > 0) {
    console.log(`  Skipping ${tenantName} — already has ${existing} snapshot row(s).`)
    return
  }

  const today = await computeTodayMetrics(tenantId)
  const complianceSeries = backwardWalk(today.complianceScore ?? 50, BACKFILL_DAYS)
  const riskSeries       = backwardWalk(today.riskScore, BACKFILL_DAYS)
  const readinessSeries  = backwardWalk(today.auditReadinessScore ?? 50, BACKFILL_DAYS)

  const { departmentScores, regulationScores } = await computeTodayDeptRegRisk(tenantId)
  const deptSeries = departmentScores.map(d => ({ ...d, series: backwardWalk(d.score, BACKFILL_DAYS) }))
  const regSeries  = regulationScores.map(r => ({ ...r, series: backwardWalk(r.score, BACKFILL_DAYS) }))

  // UTC midnight of today's LOCAL calendar date — see the matching comment
  // in dashboard-snapshot.processor.ts for why (avoids a Postgres @db.Date
  // UTC-normalization shift under IST).
  const now = new Date()
  const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))

  for (let i = 0; i < BACKFILL_DAYS; i++) {
    const daysAgo = BACKFILL_DAYS - 1 - i
    const snapshotDate = new Date(todayDate)
    snapshotDate.setUTCDate(snapshotDate.getUTCDate() - daysAgo)

    const complianceScore     = today.complianceScore === null ? null : complianceSeries[i]
    const riskScore           = riskSeries[i]
    const auditReadinessScore = today.auditReadinessScore === null ? null : readinessSeries[i]

    await db.dashboardMetricSnapshot.create({
      data: {
        tenantId, snapshotDate,
        complianceScore,
        totalControls:       today.totalControls,
        compliantControls:   today.compliantControls,
        overdueTasksTotal:   today.overdueTasksTotal,
        overdueCritical:     today.overdueByPriority.CRITICAL,
        overdueHigh:         today.overdueByPriority.HIGH,
        overdueMedium:       today.overdueByPriority.MEDIUM,
        overdueLow:          today.overdueByPriority.LOW,
        crossBorderPiiCount: today.crossBorderPiiCount,
        suppliersWithoutDpa: today.suppliersWithoutDpa,
        auditReadinessScore,
      },
    })

    await db.riskSnapshot.upsert({
      where: { tenantId_entityType_entityId_snapshotDate: { tenantId, entityType: 'org', entityId: tenantId, snapshotDate } },
      update: { riskScore, riskLevel: riskLevelOf(riskScore) },
      create: {
        tenantId, entityType: 'org', entityId: tenantId, entityName: tenantName, snapshotDate,
        riskScore, riskLevel: riskLevelOf(riskScore),
        factors: { nonCompliantControls: today.totalControls - today.compliantControls, overdueTasks: today.overdueTasksTotal, piiSensitivity: null, assetCriticality: null },
      },
    })

    for (const dept of deptSeries) {
      const score = dept.series[i]
      await db.riskSnapshot.upsert({
        where: { tenantId_entityType_entityId_snapshotDate: { tenantId, entityType: 'department', entityId: dept.id, snapshotDate } },
        update: { riskScore: score, riskLevel: riskLevelOf(score) },
        create: { tenantId, entityType: 'department', entityId: dept.id, entityName: dept.name, snapshotDate, riskScore: score, riskLevel: riskLevelOf(score) },
      })
    }

    for (const reg of regSeries) {
      const score = reg.series[i]
      await db.riskSnapshot.upsert({
        where: { tenantId_entityType_entityId_snapshotDate: { tenantId, entityType: 'regulation', entityId: reg.id, snapshotDate } },
        update: { riskScore: score, riskLevel: riskLevelOf(score) },
        create: { tenantId, entityType: 'regulation', entityId: reg.id, entityName: reg.name, snapshotDate, riskScore: score, riskLevel: riskLevelOf(score) },
      })
    }
  }

  console.log(`  Backfilled ${BACKFILL_DAYS} days for ${tenantName} (today's real values: compliance=${today.complianceScore}, risk=${today.riskScore}, auditReadiness=${today.auditReadinessScore}).`)
}

async function main() {
  console.log('Dashboard snapshot backfill — DEV/DEMO ONLY, not for production.\n')
  const tenants = await superAdminDb.tenant.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } })
  console.log(`Found ${tenants.length} active tenant(s).`)
  for (const t of tenants) {
    await backfillTenant(t.id, t.name)
  }
  console.log('\nDone.')
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => process.exit(0))
