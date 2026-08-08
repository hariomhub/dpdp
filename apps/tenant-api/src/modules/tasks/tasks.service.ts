import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TaskStatus, TenantRole, TenantAuditAction, EvidenceType, GapReasonCode, Prisma } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { deleteFile } from '../../utils/storage'

const db      = getTenantPrisma()
const adminDb = getSuperAdminPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeIsOverdue(dueDate: Date, status: string): boolean {
  const terminal = ['COMPLIANT', 'REJECTED']
  return !terminal.includes(status) && new Date() > dueDate
}

async function logStatusChange(
  taskId: string, fromStatus: string, toStatus: string,
  changedById: string, note?: string
) {
  await db.taskStatusHistory.create({
    data: { taskId, fromStatus: fromStatus as TaskStatus, toStatus: toStatus as TaskStatus, changedById, notes: note ?? null },
  })
}

function buildTaskWhere(
  tenantId: string, role: string, userId: string,
  query: Record<string, any>
): Prisma.ComplianceTaskWhereInput {
  const where: Prisma.ComplianceTaskWhereInput = { tenantId }

  // Role-based base filter
  if (role === TenantRole.IT_ADMIN) {
    where.assignedToId = userId
  } else if (role === TenantRole.INTERNAL_AUDITOR) {
    if (!query.status) {
      where.status = { in: ['EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL'] as TaskStatus[] }
    }
  } else if (role === TenantRole.EXTERNAL_AUDITOR) {
    // Include APPROVED_INTERNAL too, so tasks approved before the FINAL_REVIEW
    // hand-off was wired up (or otherwise left in that legacy state) aren't invisible here.
    if (!query.status) {
      where.status = { in: ['APPROVED_INTERNAL', 'FINAL_REVIEW'] as TaskStatus[] }
    }
  }
  // CEO / CO see everything

  // Query overrides
  if (query.status)       where.status       = query.status as TaskStatus
  if (query.assessmentId) where.assessmentId = query.assessmentId
  if (query.assetId)      where.assetId      = query.assetId
  if (query.assignedToId) where.assignedToId = query.assignedToId
  if (query.priority)     where.priority     = query.priority
  if (query.search) {
    where.title = { contains: String(query.search), mode: 'insensitive' }
  }

  return where
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const tasksService = {

  // ── List tasks ──────────────────────────────────────────────────────────────
  async listTasks(tenantId: string, userId: string, role: string, query: Record<string, any> = {}) {
    const where = buildTaskWhere(tenantId, role, userId, query)

    const tasks = await db.complianceTask.findMany({
      where,
      include: {
        asset:      { include: { department: { select: { id: true, name: true } } } },
        assignedTo: { select: { id: true, name: true, role: true } },
        assessment: {
          select: {
            id: true, name: true,
            regulations: { select: { regulationId: true } },
          },
        },
        _count: { select: { evidence: true, reviewNotes: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    })

    // Enrich with regulation shortCode from super-admin
    const regulationIds = [...new Set(
      tasks.flatMap(t => t.assessment.regulations.map(r => r.regulationId))
    )]
    const regulations = regulationIds.length > 0
      ? await adminDb.regulation.findMany({
          where: { id: { in: regulationIds } }, select: { id: true, shortCode: true, name: true },
        })
      : []
    const regMap = new Map(regulations.map(r => [r.id, r]))

    // Enrich with control titles from super-admin
    const controlIds = [...new Set(tasks.map(t => t.controlId))]
    const controls = controlIds.length > 0
      ? await adminDb.control.findMany({
          where: { id: { in: controlIds } },
          select: { id: true, title: true, regulationMappings: { select: { chapter: { select: { name: true } } } } },
        })
      : []
    const ctrlMap = new Map(controls.map(c => [c.id, c]))

    return tasks.map(t => {
      const regId  = t.assessment.regulations[0]?.regulationId
      const reg    = regId ? regMap.get(regId) : null
      const ctrl   = ctrlMap.get(t.controlId)
      return {
        id:           t.id,
        taskCode:     t.taskCode,
        title:        t.title,
        description:  t.description,
        status:       t.status,
        priority:     t.priority,
        dueDate:      t.dueDate.toISOString(),
        isOverdue:    computeIsOverdue(t.dueDate, t.status),
        autoAssigned: t.autoAssigned,
        createdAt:    t.createdAt.toISOString(),
        updatedAt:    t.updatedAt.toISOString(),
        asset:        { id: t.asset.id, name: t.asset.name, assetType: t.asset.assetType },
        department:   t.asset.department,
        assignedTo:   t.assignedTo,
        assessment:   { id: t.assessment.id, name: t.assessment.name },
        regulation:   reg ? { id: regId, shortCode: reg.shortCode, name: reg.name } : null,
        control:      ctrl ? { id: ctrl.id, title: ctrl.title, chapter: ctrl.regulationMappings?.[0]?.chapter?.name ?? null } : null,
        evidenceCount: t._count.evidence,
        reviewNoteCount: t._count.reviewNotes,
      }
    })
  },

  // ── Get task detail ─────────────────────────────────────────────────────────
  async getTask(tenantId: string, taskId: string) {
    const task = await db.complianceTask.findFirst({
      where:   { tenantId, id: taskId },
      include: {
        asset:       { include: { department: true } },
        assignedTo:  { select: { id: true, name: true, email: true, role: true } },
        createdBy:   { select: { id: true, name: true } },
        reviewedBy:  { select: { id: true, name: true } },
        assessment:  { include: { regulations: true } },
        evidence:    { orderBy: { createdAt: 'desc' }, include: { actionLinks: true } },
        reviewNotes: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!task) throw new Error('Task not found')

    const userIds = [
      ...task.reviewNotes.map((n: any) => n.authorId),
      ...task.statusHistory.map((h: any) => h.changedById)
    ].filter(Boolean) as string[];

    const users = userIds.length > 0
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, role: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const reviewNotes = task.reviewNotes.map((n: any) => ({
      ...n,
      author: n.authorId ? userMap.get(n.authorId) : null
    }));
    const statusHistory = task.statusHistory.map((h: any) => ({
      ...h,
      changedBy: h.changedById ? userMap.get(h.changedById) : null
    }));

    const taskWithUsers = {
      ...task,
      reviewNotes,
      statusHistory
    };

    // Enrich control + predefined actions (with their mapped products + master evidence) from super-admin
    const ctrl = await adminDb.control.findUnique({
      where:   { id: task.controlId },
      include: {
        regulationMappings: { include: { chapter: { select: { name: true, title: true } } } },
        predefinedActions: {
          orderBy: { orderIndex: 'asc' },
          include: { products: { include: { product: true, masterEvidences: true } } },
        },
      },
    })

    // This task's own per-action tracking rows (only exist for actions with at least one evidence upload or gap finding)
    const taskActions = await db.taskAction.findMany({
      where:   { taskId },
      include: {
        evidenceLinks:   { include: { evidence: true }, orderBy: { createdAt: 'desc' } },
        gapFindingLinks: { include: { gapFinding: { include: { files: true } } }, orderBy: { createdAt: 'desc' } },
      },
    })
    const taskActionByPredefinedId = new Map(taskActions.map(ta => [ta.predefinedActionId, ta]))
    const predefinedIdByTaskActionId = new Map(taskActions.map(ta => [ta.id, ta.predefinedActionId]))
    const actionTitleByPredefinedId = new Map((ctrl?.predefinedActions ?? []).map(a => [a.id, a.title]))

    // Resolve product names for anything tagged via evidence (may not be a "suggested" product for that action)
    const linkedProductIds = [...new Set(
      taskActions.flatMap(ta => ta.evidenceLinks.map(el => el.productId).filter(Boolean))
    )] as string[]
    const linkedProducts = linkedProductIds.length > 0
      ? await adminDb.product.findMany({ where: { id: { in: linkedProductIds } }, select: { id: true, name: true } })
      : []
    const productNameById = new Map(linkedProducts.map(p => [p.id, p.name]))

    // Resolve who raised each gap finding
    const gapFindingRaiserIds = [...new Set(
      taskActions.flatMap(ta => ta.gapFindingLinks.map(gl => gl.gapFinding.raisedById).filter(Boolean))
    )] as string[]
    const gapFindingRaisers = gapFindingRaiserIds.length > 0
      ? await db.user.findMany({ where: { id: { in: gapFindingRaiserIds } }, select: { id: true, name: true } })
      : []
    const raiserNameById = new Map(gapFindingRaisers.map(u => [u.id, u.name]))

    function formatGapFinding(gf: typeof taskActions[number]['gapFindingLinks'][number]['gapFinding'], actionTitles: string[]) {
      return {
        id:          gf.id,
        reasonCodes: gf.reasonCodes,
        otherReason: gf.otherReason,
        remediation: gf.remediation,
        createdAt:   gf.createdAt,
        raisedByName: gf.raisedById ? raiserNameById.get(gf.raisedById) ?? null : null,
        actionTitles,
        files: gf.files.map(f => ({ id: f.id, fileName: f.fileName, fileUrl: f.fileUrl })),
      }
    }

    const actions = (ctrl?.predefinedActions ?? []).map(action => {
      const ta = taskActionByPredefinedId.get(action.id)
      return {
        id:               action.id,
        title:            action.title,
        description:      action.description,
        evidenceTypes:    action.evidenceTypes,
        suggestedDueDays: action.suggestedDueDays,
        priority:         action.priority,
        orderIndex:       action.orderIndex,
        products: action.products.map(ap => ({
          id:             ap.product.id,
          name:           ap.product.name,
          vendor:         ap.product.vendor,
          logoUrl:        ap.product.logoUrl,
          masterEvidence: ap.masterEvidences[0] ?? null,
        })),
        evidence: (ta?.evidenceLinks ?? []).map(el => ({
          id:          el.evidence.id,
          title:       el.evidence.title,
          type:        el.evidence.type,
          description: el.evidence.description,
          fileUrl:     el.evidence.fileUrl,
          fileName:    el.evidence.fileName,
          linkUrl:     el.evidence.linkUrl,
          textContent: el.evidence.textContent,
          createdAt:   el.evidence.createdAt,
          productId:   el.productId,
          productName: el.productId ? productNameById.get(el.productId) ?? null : null,
          otherLabel:  el.otherLabel,
        })),
        gapFindings: (ta?.gapFindingLinks ?? []).map(gl => formatGapFinding(gl.gapFinding, [action.title])),
      }
    })

    // Flattened, de-duplicated top-level list (one GapFinding can tag multiple actions)
    const gapFindingsById = new Map<string, { gf: typeof taskActions[number]['gapFindingLinks'][number]['gapFinding']; actionTitles: Set<string> }>()
    for (const ta of taskActions) {
      const actionTitle = actionTitleByPredefinedId.get(ta.predefinedActionId) ?? null
      for (const gl of ta.gapFindingLinks) {
        const entry = gapFindingsById.get(gl.gapFinding.id) ?? { gf: gl.gapFinding, actionTitles: new Set<string>() }
        if (actionTitle) entry.actionTitles.add(actionTitle)
        gapFindingsById.set(gl.gapFinding.id, entry)
      }
    }
    const gapFindings = [...gapFindingsById.values()]
      .sort((a, b) => b.gf.createdAt.getTime() - a.gf.createdAt.getTime())
      .map(({ gf, actionTitles }) => formatGapFinding(gf, [...actionTitles]))

    const evidenceWithLinks = taskWithUsers.evidence.map((ev: any) => ({
      ...ev,
      linkedActions: (ev.actionLinks ?? []).map((al: any) => {
        const predefinedId = predefinedIdByTaskActionId.get(al.taskActionId) ?? null
        return {
          actionId:    predefinedId,
          actionTitle: predefinedId ? actionTitleByPredefinedId.get(predefinedId) ?? null : null,
          productId:   al.productId,
          productName: al.productId ? productNameById.get(al.productId) ?? null : null,
          otherLabel:  al.otherLabel,
        }
      }),
    }))

    // Regulation info
    let regulation = null
    if (task.assessment.regulations.length > 0) {
      const regId = task.assessment.regulations[0].regulationId
      regulation  = await adminDb.regulation.findUnique({
        where:  { id: regId },
        select: { id: true, name: true, shortCode: true },
      })
    }

    return {
      ...taskWithUsers,
      evidence:   evidenceWithLinks,
      gapFindings,
      isOverdue:  computeIsOverdue(task.dueDate, task.status),
      regulation,
      control: ctrl ? {
        id:          ctrl.id,
        title:       ctrl.title,
        description: ctrl.description,
        chapter:     ctrl.regulationMappings?.[0]?.chapter?.name ?? null,
        actions,
      } : null,
    }
  },

  // ── Start task (PENDING → IN_PROGRESS) ─────────────────────────────────────
  async startTask(tenantId: string, taskId: string, userId: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (task.assignedToId !== userId) throw new Error('Only the assigned IT Admin can start this task')
    if (task.status !== TaskStatus.PENDING) throw new Error('Only PENDING tasks can be started')

    await db.complianceTask.update({
      where: { id: taskId },
      data:  { status: TaskStatus.IN_PROGRESS, startedAt: new Date() },
    })
    await logStatusChange(taskId, TaskStatus.PENDING, TaskStatus.IN_PROGRESS, userId)
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.TASK_STARTED, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: 'PENDING', to: 'IN_PROGRESS' } })
    return { success: true }
  },

  // ── Submit for review (IN_PROGRESS → EVIDENCE_SUBMITTED) ───────────────────
  async submitTask(tenantId: string, taskId: string, userId: string, note?: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (task.assignedToId !== userId) throw new Error('Only the assigned IT Admin can submit this task')
    if (task.status !== TaskStatus.IN_PROGRESS) throw new Error('Task must be IN_PROGRESS to submit')

    await db.complianceTask.update({
      where: { id: taskId },
      data:  { status: TaskStatus.EVIDENCE_SUBMITTED, submittedAt: new Date() },
    })
    await logStatusChange(taskId, TaskStatus.IN_PROGRESS, TaskStatus.EVIDENCE_SUBMITTED, userId, note)
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.TASK_SUBMITTED, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: 'IN_PROGRESS', to: 'EVIDENCE_SUBMITTED' } })
    return { success: true }
  },

  // ── IA reviews (EVIDENCE_SUBMITTED → FINAL_REVIEW | REJECTED) ──────────────
  // Approval hands the task straight to the External Auditor's queue (buildTaskWhere
  // filters EA's default list to FINAL_REVIEW) for final sign-off.
  async reviewTask(tenantId: string, taskId: string, userId: string, decision: 'approve' | 'reject', note?: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (!['EVIDENCE_SUBMITTED', 'UNDER_REVIEW'].includes(task.status)) {
      throw new Error('Task must be EVIDENCE_SUBMITTED or UNDER_REVIEW for IA review')
    }

    const newStatus = decision === 'approve' ? TaskStatus.FINAL_REVIEW : TaskStatus.REJECTED

    await db.complianceTask.update({
      where: { id: taskId },
      data: {
        status:       newStatus,
        reviewedById: userId,
        reviewedAt:   new Date(),
        ...(decision === 'approve' ? { approvedAt: new Date() } : { rejectedAt: new Date() }),
      },
    })

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (note && user) {
      await db.taskReviewNote.create({
        data: { taskId, authorId: userId, role: user.role, note },
      })
    }

    await logStatusChange(taskId, task.status, newStatus, userId, note)
    const actionType = decision === 'approve' ? TenantAuditAction.TASK_APPROVED : TenantAuditAction.TASK_REJECTED
    await logTenantAction({ tenantId, userId, action: actionType, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: task.status, to: newStatus, decision, note } })
    return { success: true }
  },

  // ── Final sign-off, normally by the External Auditor (FINAL_REVIEW → COMPLIANT) ──
  // APPROVED_INTERNAL is also accepted so any task already sitting there from
  // before this workflow change isn't stuck.
  async signoffTask(tenantId: string, taskId: string, userId: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (!['APPROVED_INTERNAL', 'FINAL_REVIEW'].includes(task.status)) {
      throw new Error('Task must be APPROVED_INTERNAL or FINAL_REVIEW for sign-off')
    }

    await db.complianceTask.update({
      where: { id: taskId },
      data:  { status: TaskStatus.COMPLIANT, signedOffAt: new Date() },
    })

    // Update assessment counters
    const compliantCount = await db.complianceTask.count({
      where: { assessmentId: task.assessmentId, status: TaskStatus.COMPLIANT },
    })
    await db.assessment.update({
      where: { id: task.assessmentId },
      data:  { compliantControls: compliantCount + 1 },
    })

    await logStatusChange(taskId, task.status, TaskStatus.COMPLIANT, userId)
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.TASK_APPROVED, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: task.status, to: 'COMPLIANT' } })
    return { success: true }
  },

  // ── CO rejects at final stage (sends back to IT Admin) ──────────────────────
  async rejectFinal(tenantId: string, taskId: string, userId: string, note?: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (!['APPROVED_INTERNAL', 'FINAL_REVIEW'].includes(task.status)) {
      throw new Error('Task must be at APPROVED_INTERNAL or FINAL_REVIEW stage')
    }

    await db.complianceTask.update({
      where: { id: taskId },
      data:  { status: TaskStatus.REJECTED, rejectedAt: new Date() },
    })

    const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (note && user) {
      await db.taskReviewNote.create({ data: { taskId, authorId: userId, role: user.role, note } })
    }

    await logStatusChange(taskId, task.status, TaskStatus.REJECTED, userId, note)
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.TASK_REJECTED, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: task.status, to: 'REJECTED', note } })
    return { success: true }
  },

  // ── Reassign task ───────────────────────────────────────────────────────────
  async assignTask(tenantId: string, taskId: string, actorId: string, newAssigneeId: string | null) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')

    if (newAssigneeId) {
      const user = await db.user.findFirst({
        where: { tenantId, id: newAssigneeId, status: 'ACTIVE', role: 'IT_ADMIN' },
      })
      if (!user) throw new Error('Assignee must be an active IT Admin')
    }

    await db.complianceTask.update({
      where: { id: taskId },
      data:  { assignedToId: newAssigneeId, status: newAssigneeId ? (task.status === 'PENDING' ? 'PENDING' : task.status) : TaskStatus.PENDING },
    })

    await logTenantAction({ tenantId, userId: actorId, action: TenantAuditAction.TASK_ASSIGNED, targetType: 'task', targetId: taskId, targetName: task.title, details: { reassigned: true, newAssigneeId } })
    return { success: true }
  },

  // ── Get users for assignment dropdown ───────────────────────────────────────
  async getAssignableUsers(tenantId: string) {
    return db.user.findMany({
      where:   { tenantId, status: 'ACTIVE', role: 'IT_ADMIN' },
      select:  { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })
  },

  // ── Add evidence, tagged to one or more of this task's actions ─────────────
  async addEvidence(params: {
    tenantId: string; taskId: string; userId: string
    data: {
      title: string
      type: EvidenceType
      description?: string
      linkUrl?: string
      textContent?: string
      file?: { fileName: string; fileSize: number; fileUrl: string; storageProvider: string }
      actions: { actionId: string; productId?: string; otherLabel?: string }[]
    }
  }) {
    const task = await db.complianceTask.findFirst({ where: { tenantId: params.tenantId, id: params.taskId } })
    if (!task) throw new Error('Task not found')
    if (task.assignedToId !== params.userId) throw new Error('Only the assigned IT Admin can add evidence')
    if (!['IN_PROGRESS', 'REJECTED'].includes(task.status)) throw new Error('Task must be IN_PROGRESS or REJECTED to add evidence')
    if (!params.data.actions || params.data.actions.length === 0) throw new Error('At least one action must be tagged')

    const evidence = await db.$transaction(async (tx) => {
      const ev = await tx.evidence.create({
        data: {
          tenantId:      params.tenantId,
          taskId:        params.taskId,
          title:         params.data.title,
          type:          params.data.type,
          description:   params.data.description ?? null,
          fileUrl:       params.data.file?.fileUrl ?? null,
          fileName:      params.data.file?.fileName ?? null,
          fileSize:      params.data.file?.fileSize ?? null,
          linkUrl:       params.data.linkUrl ?? null,
          textContent:   params.data.textContent ?? null,
          submittedById: params.userId,
        },
      })

      for (const tag of params.data.actions) {
        const taskAction = await tx.taskAction.upsert({
          where:  { taskId_predefinedActionId: { taskId: params.taskId, predefinedActionId: tag.actionId } },
          update: {},
          create: { taskId: params.taskId, predefinedActionId: tag.actionId },
        })
        await tx.evidenceAction.create({
          data: {
            evidenceId:   ev.id,
            taskActionId: taskAction.id,
            productId:    tag.productId ?? null,
            otherLabel:   tag.otherLabel ?? null,
          },
        })
      }

      return ev
    })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId,
      action: TenantAuditAction.EVIDENCE_UPLOADED, targetType: 'evidence', targetId: evidence.id,
      targetName: evidence.title,
      details: { taskId: params.taskId, actionIds: params.data.actions.map(a => a.actionId) },
    })

    return evidence
  },

  // ── Delete evidence (uploader only, while task is still editable) ──────────
  async deleteEvidence(tenantId: string, taskId: string, evidenceId: string, userId: string) {
    const evidence = await db.evidence.findFirst({ where: { id: evidenceId, taskId, tenantId } })
    if (!evidence) throw new Error('Evidence not found')
    if (evidence.submittedById !== userId) throw new Error('Only the uploader can delete this evidence')

    const task = await db.complianceTask.findFirst({ where: { id: taskId, tenantId } })
    if (!task || !['IN_PROGRESS', 'REJECTED'].includes(task.status)) {
      throw new Error('Task must be IN_PROGRESS or REJECTED to delete evidence')
    }

    if (evidence.fileUrl) {
      await deleteFile(evidence.fileUrl, 'local').catch(() => {})
    }
    await db.evidence.delete({ where: { id: evidenceId } })

    await logTenantAction({
      tenantId, userId, action: TenantAuditAction.EVIDENCE_UPDATED, targetType: 'evidence', targetId: evidenceId,
      targetName: evidence.title, details: { deleted: true, taskId },
    })

    return { success: true }
  },

  // ── Edit evidence metadata / replace file (uploader only, while task is editable) ──
  async updateEvidence(params: {
    tenantId: string; taskId: string; evidenceId: string; userId: string
    data: {
      title?: string
      description?: string
      linkUrl?: string
      textContent?: string
      file?: { fileName: string; fileSize: number; fileUrl: string }
    }
  }) {
    const evidence = await db.evidence.findFirst({ where: { id: params.evidenceId, taskId: params.taskId, tenantId: params.tenantId } })
    if (!evidence) throw new Error('Evidence not found')
    if (evidence.submittedById !== params.userId) throw new Error('Only the uploader can edit this evidence')

    const task = await db.complianceTask.findFirst({ where: { id: params.taskId, tenantId: params.tenantId } })
    if (!task || !['IN_PROGRESS', 'REJECTED'].includes(task.status)) {
      throw new Error('Task must be IN_PROGRESS or REJECTED to edit evidence')
    }

    if (params.data.file && evidence.fileUrl) {
      await deleteFile(evidence.fileUrl, 'local').catch(() => {})
    }

    const updated = await db.evidence.update({
      where: { id: params.evidenceId },
      data: {
        title:       params.data.title ?? evidence.title,
        description: params.data.description !== undefined ? params.data.description : evidence.description,
        linkUrl:     params.data.linkUrl ?? evidence.linkUrl,
        textContent: params.data.textContent ?? evidence.textContent,
        ...(params.data.file ? {
          fileUrl:  params.data.file.fileUrl,
          fileName: params.data.file.fileName,
          fileSize: params.data.file.fileSize,
        } : {}),
      },
    })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId, action: TenantAuditAction.EVIDENCE_UPDATED,
      targetType: 'evidence', targetId: params.evidenceId, targetName: updated.title,
      details: { taskId: params.taskId, replacedFile: !!params.data.file },
    })

    return updated
  },

  // ── Record a gap finding when rejecting a task ──────────────────────────────
  async addGapFinding(params: {
    tenantId: string; taskId: string; userId: string
    data: {
      reasonCodes: GapReasonCode[]
      otherReason?: string
      remediation: string
      actionIds: string[]
      files: { fileName: string; fileSize: number; fileUrl: string }[]
    }
  }) {
    const task = await db.complianceTask.findFirst({ where: { tenantId: params.tenantId, id: params.taskId } })
    if (!task) throw new Error('Task not found')

    const user = await db.user.findUnique({ where: { id: params.userId }, select: { role: true } })
    if (!user) throw new Error('User not found')

    const finding = await db.$transaction(async (tx) => {
      const gf = await tx.gapFinding.create({
        data: {
          tenantId:    params.tenantId,
          taskId:      params.taskId,
          raisedById:  params.userId,
          role:        user.role,
          reasonCodes: params.data.reasonCodes,
          otherReason: params.data.otherReason ?? null,
          remediation: params.data.remediation,
        },
      })

      for (const actionId of params.data.actionIds) {
        const taskAction = await tx.taskAction.upsert({
          where:  { taskId_predefinedActionId: { taskId: params.taskId, predefinedActionId: actionId } },
          update: {},
          create: { taskId: params.taskId, predefinedActionId: actionId },
        })
        await tx.gapFindingAction.create({
          data: { gapFindingId: gf.id, taskActionId: taskAction.id },
        })
      }

      if (params.data.files.length > 0) {
        await tx.gapFindingFile.createMany({
          data: params.data.files.map(f => ({
            gapFindingId: gf.id, fileUrl: f.fileUrl, fileName: f.fileName, fileSize: f.fileSize,
          })),
        })
      }

      return gf
    })

    await logTenantAction({
      tenantId: params.tenantId, userId: params.userId, action: TenantAuditAction.GAP_FINDING_CREATED,
      targetType: 'task', targetId: params.taskId, targetName: task.title,
      details: { gapFindingId: finding.id, actionIds: params.data.actionIds, reasonCodes: params.data.reasonCodes },
    })

    return finding
  },
}