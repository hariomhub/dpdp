import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'

const db = getTenantPrisma()
const superAdminDb = getSuperAdminPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/** Compute an overall risk score (0-100) from existing snapshot or derive from controls */
export async function computeOrgRiskScore(tenantId: string): Promise<number> {
  // Try latest org-level risk snapshot
  const snap = await db.riskSnapshot.findFirst({
    where: { tenantId, entityType: 'org' },
    orderBy: { snapshotDate: 'desc' },
  })
  if (snap) return Math.round(snap.riskScore)

  // Fallback: derive from non-compliant controls across active assessments
  const assessments = await db.assessment.findMany({
    where: { tenantId, status: 'ACTIVE' },
    include: { controls: true },
  })
  if (assessments.length === 0) return 0

  let total = 0, nonCompliant = 0
  for (const a of assessments) {
    total += a.controls.length
    nonCompliant += a.controls.filter(c => c.complianceStatus === 'NON_COMPLIANT').length
  }
  if (total === 0) return 0
  return Math.round((nonCompliant / total) * 100)
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const dashboardService = {

  async getStats(tenantId: string, userId: string) {
    const [
      departments,
      assetCount,
      supplierCount,
      activeAssessments,
      allTasks,
      auditLogs,
      assets,
      tenant,
      crossBorderPiiCount,
      suppliersWithoutDpa,
      recentEvidence,
    ] = await Promise.all([
      db.department.findMany({
        where: { tenantId },
        include: {
          assets: {
            include: { piiRecords: true },
          },
        },
      }),
      db.asset.count({ where: { tenantId } }),
      db.supplier.count({ where: { tenantId } }),
      db.assessment.findMany({
        where:   { tenantId, status: 'ACTIVE' },
        orderBy: { endDate: 'asc' },
        include: {
          controls: true,
          assets:   { include: { asset: true } },
          regulations: true,
        },
      }),
      db.complianceTask.findMany({
        where: { tenantId },
        include: {
          asset:      { select: { name: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      db.tenantAuditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { user: { select: { name: true, role: true } } },
      }),
      db.asset.findMany({
        where: { tenantId },
        select: {
          id: true, name: true, compliance: true, criticality: true,
          departmentId: true, piiRecords: { select: { id: true } },
        },
      }),
      superAdminDb.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, classification: true },
      }),
      db.piiRecord.count({ where: { tenantId, crossBorderTransfer: true } }),
      db.supplier.count({ where: { tenantId, dpaSigned: false } }),
      db.evidence.findMany({
        where: { tenantId, submittedById: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { task: { select: { status: true, asset: { select: { name: true } } } } },
      }),
    ])

    const now = new Date()

    // ── Task breakdowns ────────────────────────────────────────────────────────
    const openTasks    = allTasks.filter(t =>
      !['COMPLIANT', 'REJECTED'].includes(t.status)
    )
    const overdueTasks = allTasks.filter(t =>
      t.dueDate < now && !['COMPLIANT'].includes(t.status)
    )
    const myTasks      = allTasks.filter(t => t.assignedToId === userId)
    const pendingReviewTasks = allTasks.filter(t =>
      ['EVIDENCE_SUBMITTED', 'UNDER_REVIEW'].includes(t.status)
    )
    const finalReviewTasks = allTasks.filter(t =>
      ['APPROVED_INTERNAL', 'FINAL_REVIEW'].includes(t.status)
    )

    // ── Compliance score ───────────────────────────────────────────────────────
    let totalControls = 0, compliantControls = 0
    for (const a of activeAssessments) {
      totalControls     += a.controls.length
      compliantControls += a.controls.filter(c => c.complianceStatus === 'COMPLIANT').length
    }
    const complianceScore = totalControls > 0
      ? Math.round((compliantControls / totalControls) * 100)
      : null

    // ── Risk score ─────────────────────────────────────────────────────────────
    const riskScore = await computeOrgRiskScore(tenantId)

    // ── Overdue tasks by priority ──────────────────────────────────────────────
    const overdueByPriority = {
      CRITICAL: overdueTasks.filter(t => t.priority === 'CRITICAL').length,
      HIGH:     overdueTasks.filter(t => t.priority === 'HIGH').length,
      MEDIUM:   overdueTasks.filter(t => t.priority === 'MEDIUM').length,
      LOW:      overdueTasks.filter(t => t.priority === 'LOW').length,
    }

    // ── Internal Auditor: this user's own review activity ──────────────────────
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const myReviewed = allTasks.filter(t => t.reviewedById === userId && t.reviewedAt)
    const myReviewedToday  = myReviewed.filter(t => t.reviewedAt! >= startOfToday).length
    const myApprovedTotal  = myReviewed.filter(t => t.approvedAt).length
    const myRejectedTotal  = myReviewed.filter(t => t.status === 'REJECTED' && !t.approvedAt).length
    const myRecentlyReviewed = [...myReviewed]
      .sort((a, b) => b.reviewedAt!.getTime() - a.reviewedAt!.getTime())
      .slice(0, 5)
      .map(t => ({
        title: t.title, asset: t.asset.name,
        decision: t.approvedAt ? 'Approved' as const : 'Rejected' as const,
        time: relativeTime(t.reviewedAt!),
      }))

    // ── External Auditor: tenant-wide sign-off activity (no per-user field on the model) ──
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)
    const signedOffTasks = allTasks.filter(t => t.signedOffAt)
    const signedOffLast30Days = signedOffTasks.filter(t => t.signedOffAt! >= thirtyDaysAgo).length
    const recentSignOffs = [...signedOffTasks]
      .sort((a, b) => b.signedOffAt!.getTime() - a.signedOffAt!.getTime())
      .slice(0, 5)
      .map(t => ({ title: t.title, asset: t.asset.name, time: relativeTime(t.signedOffAt!) }))

    // ── IT Admin: this user's own recently submitted evidence ──────────────────
    const myRecentEvidence = recentEvidence.map(ev => ({
      title:  ev.title,
      asset:  ev.task.asset.name,
      type:   ev.type,
      date:   ev.createdAt.toISOString().split('T')[0],
      status: ev.task.status === 'REJECTED' ? 'Rejected' as const
        : ['COMPLIANT', 'APPROVED_INTERNAL', 'FINAL_REVIEW'].includes(ev.task.status) ? 'Approved' as const
        : 'Pending Review' as const,
    }))

    // ── Department compliance overview ─────────────────────────────────────────
    const deptCompliance = departments.map(dept => {
      const deptControls: { complianceStatus: string }[] = []
      for (const a of activeAssessments) {
        for (const aa of a.assets) {
          if (aa.asset.departmentId === dept.id) {
            deptControls.push(...a.controls)
          }
        }
      }
      const c = deptControls.filter(x => x.complianceStatus === 'COMPLIANT').length
      const p = deptControls.filter(x => x.complianceStatus === 'IN_PROGRESS').length
      const nc = deptControls.filter(x => x.complianceStatus === 'NON_COMPLIANT').length
      const ns = deptControls.filter(x => x.complianceStatus === 'NOT_STARTED').length
      const total = deptControls.length
      return {
        name:         dept.name,
        compliant:    total ? Math.round((c / total) * 100) : 0,
        inProgress:   total ? Math.round((p / total) * 100) : 0,
        nonCompliant: total ? Math.round((nc / total) * 100) : 0,
        notStarted:   total ? Math.round((ns / total) * 100) : 0,
        total,
      }
    })

    // ── Regulation donuts ──────────────────────────────────────────────────────
    // Group active assessments by regulation
    const regulationMap: Record<string, {
      name: string
      compliant: number; inProgress: number; nonCompliant: number; notStarted: number; total: number
    }> = {}

    for (const a of activeAssessments) {
      for (const reg of a.regulations) {
        if (!regulationMap[reg.regulationId]) {
          regulationMap[reg.regulationId] = {
            name: reg.regulationId,
            compliant: 0, inProgress: 0, nonCompliant: 0, notStarted: 0, total: 0,
          }
        }
        const r = regulationMap[reg.regulationId]
        for (const c of a.controls) {
          r.total++
          if      (c.complianceStatus === 'COMPLIANT')     r.compliant++
          else if (c.complianceStatus === 'IN_PROGRESS')   r.inProgress++
          else if (c.complianceStatus === 'NON_COMPLIANT') r.nonCompliant++
          else                                              r.notStarted++
        }
      }
    }

    // Resolve raw regulation UUIDs to their real shortCode/name from super-admin
    const regulationIds = Object.keys(regulationMap)
    if (regulationIds.length > 0) {
      const regulationRecords = await superAdminDb.regulation.findMany({
        where: { id: { in: regulationIds } }, select: { id: true, shortCode: true, name: true },
      })
      for (const rec of regulationRecords) {
        if (regulationMap[rec.id]) regulationMap[rec.id].name = rec.shortCode || rec.name
      }
    }

    // ── Asset health ───────────────────────────────────────────────────────────
    const assetHealth = {
      total:             assets.length,
      fullyCompliant:    assets.filter(a => a.compliance === 'FULLY_COMPLIANT').length,
      partiallyCompliant: assets.filter(a => a.compliance === 'PARTIALLY_COMPLIANT').length,
      nonCompliant:      assets.filter(a => a.compliance === 'NON_COMPLIANT').length,
      notStarted:        assets.filter(a => a.compliance === 'NOT_STARTED').length,
      noPiiRecords:      assets.filter(a => a.piiRecords.length === 0).length,
    }

    // ── Top risk driver ────────────────────────────────────────────────────────
    const riskiestAsset = assets.length > 0
      ? assets.sort((a, b) => {
          const order: Record<string, number> = {
            NON_COMPLIANT: 0, PARTIALLY_COMPLIANT: 1, NOT_STARTED: 2, FULLY_COMPLIANT: 3,
          }
          return (order[a.compliance] ?? 3) - (order[b.compliance] ?? 3)
        })[0]
      : null

    // ── Upcoming deadlines ─────────────────────────────────────────────────────
    const upcomingDeadlines = [
      ...activeAssessments.map(a => ({
        id:       a.id,
        name:     a.name,
        type:     'Assessment' as const,
        dueDate:  a.endDate.toISOString().split('T')[0],
        daysLeft: Math.round((a.endDate.getTime() - now.getTime()) / 86_400_000),
      })),
      ...allTasks
        .filter(t => !['COMPLIANT'].includes(t.status))
        .map(t => ({
          id:       t.id,
          name:     t.title,
          type:     'Task' as const,
          dueDate:  t.dueDate.toISOString().split('T')[0],
          daysLeft: Math.round((t.dueDate.getTime() - now.getTime()) / 86_400_000),
        })),
    ].sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8)

    // ── Recent activity ────────────────────────────────────────────────────────
    const recentActivity = auditLogs.map(log => ({
      id:       log.id,
      user:     log.user?.name ?? 'System',
      role:     log.user?.role?.toLowerCase().replace(/_/g, '_') ?? 'system',
      action:   log.action,
      details:  log.targetName ?? '',
      module:   log.targetType,
      time:     relativeTime(log.createdAt),
      createdAt: log.createdAt,
    }))

    // ── Active assessment progress (for CO view) ───────────────────────────────
    const assessmentProgress = activeAssessments.map(a => {
      const total   = a.controls.length
      const comp    = a.controls.filter(c => c.complianceStatus === 'COMPLIANT').length
      const pct     = total > 0 ? Math.round((comp / total) * 100) : 0
      const daysLeft = Math.round((a.endDate.getTime() - now.getTime()) / 86_400_000)
      return {
        id:       a.id,
        name:     a.name,
        pct,
        compliant: comp,
        total,
        daysLeft,
        regulations: a.regulations.map(r => r.regulationId),
        assets: a.assets.map(aa => aa.asset.name).slice(0, 3),
      }
    })

    return {
      hasData: activeAssessments.length > 0 || allTasks.length > 0,

      // Counts
      counts: {
        departments:       departments.length,
        assets:            assetCount,
        suppliers:         supplierCount,
        activeAssessments: activeAssessments.length,
        openTasks:         openTasks.length,
        overdueTasks:      overdueTasks.length,
        myPendingTasks:    myTasks.filter(t => t.status === 'PENDING').length,
        myInProgressTasks: myTasks.filter(t => t.status === 'IN_PROGRESS').length,
        mySubmittedTasks:  myTasks.filter(t => t.status === 'EVIDENCE_SUBMITTED').length,
        myRejectedTasks:   myTasks.filter(t => t.status === 'REJECTED').length,
        pendingReview:     pendingReviewTasks.length,
        finalReview:       finalReviewTasks.length,
        pendingTasks:      allTasks.filter(t => t.status === 'PENDING').length,
        inProgressTasks:   allTasks.filter(t => t.status === 'IN_PROGRESS').length,
        rejectedTasks:     allTasks.filter(t => t.status === 'REJECTED').length,
        unassignedTasks:   allTasks.filter(t => !t.assignedToId && t.status === 'PENDING').length,
        crossBorderPiiTransfers: crossBorderPiiCount,
        suppliersWithoutDpa,
        myReviewedToday,
        myApprovedTotal,
        myRejectedTotal,
        signedOffLast30Days,
      },

      complianceScore,
      riskScore,
      totalControls,
      compliantControls,
      overdueByPriority,
      myRecentlyReviewed,
      recentSignOffs,
      myRecentEvidence,

      deptCompliance,
      regulationCompliance: Object.values(regulationMap),
      assetHealth,
      riskiestAsset: riskiestAsset
        ? { id: riskiestAsset.id, name: riskiestAsset.name, compliance: riskiestAsset.compliance }
        : null,

      upcomingDeadlines,
      recentActivity,
      assessmentProgress,

      // My tasks (for IT Admin / role-specific views)
      myTasks: myTasks.slice(0, 10).map(t => ({
        id:       t.id,
        title:    t.title,
        asset:    t.asset.name,
        status:   t.status,
        priority: t.priority,
        dueDate:  t.dueDate.toISOString().split('T')[0],
        daysLeft: Math.round((t.dueDate.getTime() - now.getTime()) / 86_400_000),
      })),

      // IA review queue
      reviewQueue: pendingReviewTasks.slice(0, 10).map(t => ({
        id:          t.id,
        title:       t.title,
        asset:       t.asset.name,
        submittedBy: t.assignedTo?.name ?? 'Unknown',
        status:      t.status,
        daysLeft:    Math.round((t.dueDate.getTime() - now.getTime()) / 86_400_000),
      })),

      // EA final sign-off queue
      finalSignOffQueue: finalReviewTasks.slice(0, 10).map(t => ({
        id:      t.id,
        title:   t.title,
        asset:   t.asset.name,
        status:  t.status,
        daysLeft: Math.round((t.dueDate.getTime() - now.getTime()) / 86_400_000),
      })),

      orgName:        tenant?.name ?? '',
      classification: tenant?.classification ?? '',
    }
  },
}
