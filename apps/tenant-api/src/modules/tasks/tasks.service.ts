import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { TaskStatus, TenantRole, TenantAuditAction, Prisma } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'

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
    if (!query.status) where.status = TaskStatus.FINAL_REVIEW
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
        evidence:    { orderBy: { createdAt: 'desc' } },
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

    // Enrich control + predefined actions from super-admin
    const ctrl = await adminDb.control.findUnique({
      where:   { id: task.controlId },
      include: {
        regulationMappings: { include: { chapter: { select: { name: true, title: true } } } },
        predefinedActions: { orderBy: { orderIndex: 'asc' } },
      },
    })

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
      isOverdue:  computeIsOverdue(task.dueDate, task.status),
      regulation,
      control: ctrl ? {
        id:          ctrl.id,
        title:       ctrl.title,
        description: ctrl.description,
        chapter:     ctrl.regulationMappings?.[0]?.chapter?.name ?? null,
        actions:     ctrl.predefinedActions,
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

  // ── IA reviews (EVIDENCE_SUBMITTED → APPROVED_INTERNAL | REJECTED) ─────────
  async reviewTask(tenantId: string, taskId: string, userId: string, decision: 'approve' | 'reject', note?: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (!['EVIDENCE_SUBMITTED', 'UNDER_REVIEW'].includes(task.status)) {
      throw new Error('Task must be EVIDENCE_SUBMITTED or UNDER_REVIEW for IA review')
    }

    const newStatus = decision === 'approve' ? TaskStatus.APPROVED_INTERNAL : TaskStatus.REJECTED

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

  // ── CO final sign-off (APPROVED_INTERNAL → COMPLIANT) ──────────────────────
  async signoffTask(tenantId: string, taskId: string, userId: string) {
    const task = await db.complianceTask.findFirst({ where: { tenantId, id: taskId } })
    if (!task) throw new Error('Task not found')
    if (task.status !== TaskStatus.APPROVED_INTERNAL) throw new Error('Task must be APPROVED_INTERNAL for sign-off')

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

    await logStatusChange(taskId, TaskStatus.APPROVED_INTERNAL, TaskStatus.COMPLIANT, userId)
    await logTenantAction({ tenantId, userId, action: TenantAuditAction.TASK_APPROVED, targetType: 'task', targetId: taskId, targetName: task.title, details: { from: 'APPROVED_INTERNAL', to: 'COMPLIANT' } })
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
}