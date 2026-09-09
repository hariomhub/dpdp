import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { computeOrgRiskScore } from '../dashboard/dashboard.service'

const db = getTenantPrisma()
const adminDb = getSuperAdminPrisma()

// ─── Scoring ──────────────────────────────────────────────────────────────────
// Real-time computed risk (no historical snapshot engine yet — RiskSnapshot/
// AssetRiskSnapshot stay unpopulated). Weighted from data that already exists:
// non-compliant/rejected task ratio, overdue task ratio, asset criticality, and
// PII sensitivity (with a cross-border-transfer bonus).

const LEVEL_WEIGHT: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 }

interface TaskLite { status: string; dueDate: Date }
interface AssetLite { criticality: string; piiRecords: { sensitivity: string; crossBorderTransfer: boolean }[] }

function isOverdue(t: TaskLite, now: Date): boolean {
  return !['COMPLIANT', 'REJECTED'].includes(t.status) && t.dueDate < now
}

export interface RiskFactors {
  totalTasks: number; nonCompliantTasks: number; overdueTasks: number
  avgCriticality: number; avgPiiSensitivity: number; crossBorderTransfer: boolean
}

export function computeRiskScore(tasks: TaskLite[], assets: AssetLite[], now = new Date()): { score: number; factors: RiskFactors } {
  const total = tasks.length
  const nonCompliant = tasks.filter(t => t.status === 'REJECTED').length
  const overdue = tasks.filter(t => isOverdue(t, now)).length
  const nonCompliantRatio = total > 0 ? nonCompliant / total : 0
  const overdueRatio = total > 0 ? overdue / total : 0

  const avgCriticality = assets.length > 0
    ? assets.reduce((s, a) => s + (LEVEL_WEIGHT[a.criticality] ?? 50), 0) / assets.length
    : 50

  const allPii = assets.flatMap(a => a.piiRecords)
  const avgSensitivity = allPii.length > 0
    ? allPii.reduce((s, p) => s + (LEVEL_WEIGHT[p.sensitivity] ?? 50), 0) / allPii.length
    : 0
  const crossBorderTransfer = allPii.some(p => p.crossBorderTransfer)

  const raw = 0.40 * nonCompliantRatio * 100
    + 0.25 * overdueRatio * 100
    + 0.20 * avgCriticality
    + 0.15 * avgSensitivity
    + (total > 0 && crossBorderTransfer ? 10 : 0)

  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    factors: {
      totalTasks: total, nonCompliantTasks: nonCompliant, overdueTasks: overdue,
      avgCriticality: Math.round(avgCriticality), avgPiiSensitivity: Math.round(avgSensitivity),
      crossBorderTransfer,
    },
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const riskService = {
  async getAnalysis(tenantId: string) {
    const now = new Date()

    const [departments, assets, tasks, orgRiskScore] = await Promise.all([
      db.department.findMany({ where: { tenantId }, select: { id: true, name: true } }),
      db.asset.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, assetType: true, criticality: true, departmentId: true,
          piiRecords: { select: { sensitivity: true, crossBorderTransfer: true } },
        },
      }),
      db.complianceTask.findMany({
        where: { tenantId },
        select: {
          id: true, status: true, dueDate: true, controlId: true, assetId: true,
          asset: { select: { id: true, name: true, departmentId: true, criticality: true } },
          assessment: { select: { regulations: { select: { regulationId: true } } } },
        },
      }),
      computeOrgRiskScore(tenantId),
    ])

    const deptById = new Map(departments.map(d => [d.id, d]))
    const assetById = new Map(assets.map(a => [a.id, a]))

    // Resolve regulation shortCode/name for every regulation actually in use
    const regulationIds = [...new Set(
      tasks.flatMap(t => t.assessment.regulations.map(r => r.regulationId))
    )]
    const regulations = regulationIds.length > 0
      ? await adminDb.regulation.findMany({ where: { id: { in: regulationIds } }, select: { id: true, shortCode: true, name: true } })
      : []
    const regById = new Map(regulations.map(r => [r.id, r]))

    function regIdOf(t: typeof tasks[number]): string | null {
      return t.assessment.regulations[0]?.regulationId ?? null
    }

    // ── Regulation-level risk ──────────────────────────────────────────────────
    const regulationRisk = regulations.map(reg => {
      const regTasks = tasks.filter(t => regIdOf(t) === reg.id)
      const assetIds = [...new Set(regTasks.map(t => t.assetId))]
      const regAssets = assetIds.map(id => assetById.get(id)).filter(Boolean) as typeof assets
      const { score, factors } = computeRiskScore(regTasks, regAssets, now)
      return { id: reg.id, label: reg.shortCode || reg.name, score, factors }
    }).sort((a, b) => b.score - a.score)

    // ── Department-level risk ──────────────────────────────────────────────────
    const departmentRisk = departments.map(dept => {
      const deptAssets = assets.filter(a => a.departmentId === dept.id)
      const deptAssetIds = new Set(deptAssets.map(a => a.id))
      const deptTasks = tasks.filter(t => deptAssetIds.has(t.assetId))
      const { score, factors } = computeRiskScore(deptTasks, deptAssets, now)
      return { id: dept.id, name: dept.name, score, factors }
    }).sort((a, b) => b.score - a.score)

    // ── Heatmap: department × regulation ───────────────────────────────────────
    const heatmap = departments.map(dept => {
      const deptAssetIds = new Set(assets.filter(a => a.departmentId === dept.id).map(a => a.id))
      const cells = regulations.map(reg => {
        const cellTasks = tasks.filter(t => deptAssetIds.has(t.assetId) && regIdOf(t) === reg.id)
        const cellAssetIds = [...new Set(cellTasks.map(t => t.assetId))]
        const cellAssets = cellAssetIds.map(id => assetById.get(id)).filter(Boolean) as typeof assets
        const { score, factors } = computeRiskScore(cellTasks, cellAssets, now)
        return { regulationId: reg.id, regulationLabel: reg.shortCode || reg.name, score, hasData: cellTasks.length > 0, factors, assetCount: cellAssetIds.length }
      })
      return { departmentId: dept.id, departmentName: dept.name, cells }
    })

    // ── Asset risk register (every asset, not just ones with tasks) ────────────
    const assetRegister = assets.map(asset => {
      const assetTasks = tasks.filter(t => t.assetId === asset.id)
      const { score, factors } = computeRiskScore(assetTasks, [asset], now)
      return {
        id: asset.id, name: asset.name, assetType: asset.assetType,
        departmentName: deptById.get(asset.departmentId)?.name ?? '—',
        criticality: asset.criticality,
        piiSensitivity: asset.piiRecords.length > 0
          ? asset.piiRecords.reduce((max, p) => (LEVEL_WEIGHT[p.sensitivity] ?? 0) > (LEVEL_WEIGHT[max] ?? 0) ? p.sensitivity : max, asset.piiRecords[0].sensitivity)
          : null,
        score, factors,
      }
    }).sort((a, b) => b.score - a.score)

    // ── Top risk drivers (highest-scoring assets with actual task activity) ────
    const totalRiskWeight = assetRegister.reduce((s, a) => s + a.score, 0) || 1
    const topDrivers = assetRegister
      .filter(a => a.factors.totalTasks > 0)
      .slice(0, 5)
      .map(a => ({
        assetId: a.id, assetName: a.name, departmentName: a.departmentName,
        nonCompliant: a.factors.nonCompliantTasks, overdue: a.factors.overdueTasks,
        contribution: Math.round((a.score / totalRiskWeight) * 100),
      }))

    return {
      overallScore: orgRiskScore,
      regulationRisk,
      departmentRisk,
      heatmap,
      assetRegister,
      topDrivers,
      regulations: regulations.map(r => ({ id: r.id, label: r.shortCode || r.name })),
    }
  },
}
