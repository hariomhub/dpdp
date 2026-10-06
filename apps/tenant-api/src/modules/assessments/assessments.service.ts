import { getTenantPrisma } from '@dpdp/database'
import { logTenantAction } from '../../utils/audit-logger'
import { TenantAuditAction } from '@prisma/tenant-client'
import { reserveCodeNumbers, formatCode } from '../../utils/code-counter'
import { validateAssessmentReferences } from './assessment-input'
import { getRegulationSummaries, listActiveRegulations, loadRegulationTree } from '../../library/regulations'
import { getControlHeads, loadAssessmentScope } from '../controls/control-directory'

const tenantDb = getTenantPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * 3-level delegation:
 *   1. asset.ownerId (active IT_ADMIN)
 *   2. department.assignedItAdminId
 *   3. null — PENDING, CO assigns manually
 */
async function resolveAssignee(tenantId: string, assetId: string): Promise<string | null> {
  const asset = await tenantDb.asset.findFirst({
    where: { tenantId, id: assetId }, include: { department: true },
  })
  if (!asset) return null

  if (asset.ownerId) {
    const owner = await tenantDb.user.findFirst({
      where: { id: asset.ownerId, tenantId, status: 'ACTIVE', role: 'IT_ADMIN' },
    })
    if (owner) return owner.id
  }

  if (asset.department?.assignedItAdminId) {
    const admin = await tenantDb.user.findFirst({
      where: { id: asset.department.assignedItAdminId, tenantId, status: 'ACTIVE' },
    })
    if (admin) return admin.id
  }

  return null
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const assessmentsService = {

  async getDeptItAdmins(tenantId: string, departmentId: string) {
    return tenantDb.user.findMany({
      where: { tenantId, status: 'ACTIVE', role: 'IT_ADMIN', departments: { some: { departmentId } } },
      select: { id: true, name: true, email: true },
    })
  },

  async listRegulations(tenantId: string) {
    // Regulations with their top-level groups ("chapters" in the portal's vocabulary) and platform controls, built from
    // the regulation node tree. `isMandatory` reflects this organisation's classification.
    const regulations = await listActiveRegulations()
    const trees = await Promise.all(regulations.map(r => loadRegulationTree(tenantId, r.id)))
    return regulations.map((reg, i) => ({
      ...reg,
      chapters: (trees[i]?.groups ?? []).map(g => ({
        id: g.id, name: g.name, title: g.title, isMandatory: g.isMandatory, orderIndex: g.orderIndex, controls: g.controls,
      })),
    }))
  },

  async listAssets(tenantId: string) {
    const [ownAssets, supplierAssets] = await Promise.all([
      tenantDb.asset.findMany({
        where:   { tenantId },
        include: { department: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      tenantDb.supplierAsset.findMany({
        where:   { tenantId },
        include: { supplier: { include: { department: { select: { id: true, name: true } } } } },
        orderBy: { name: 'asc' },
      }),
    ])

    return [
      ...ownAssets.map(a => ({
        ...a,
        _source:    'own',
        departmentId: a.departmentId,       // direct FK
      })),
      ...supplierAssets.map(a => ({
        ...a,
        _source:    'supplier',
        departmentId: a.supplier.departmentId, // via supplier
        supplierName: a.supplier.name,
      })),
    ]
  },

  async listAssessments(tenantId: string) {
    return tenantDb.assessment.findMany({
      where:   { tenantId },
      include: {
        department: true,
        assets: { include: { asset: true } },
        regulations: true,
        controls: true,
        _count: { select: { complianceTasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createAssessment(tenantId: string, userId: string, data: {
    name: string; description?: string; departmentId: string
    startDate: string; endDate: string; regulationId: string
    assetIds: string[]; exclusions?: { controlId: string; reason: string }[]
    taskAssignments?: Array<{ controlId: string; assetId: string; assigneeId: string | null }>
  }) {
    const scope = await loadAssessmentScope(tenantId, data.regulationId)
    if (!scope || scope.regulation.status !== 'ACTIVE') throw new Error('Regulation not found or not active')
    const regulation = scope.regulation

    // Every id in the request must belong to this organisation (and assignees must be able to take the work).
    const refs = await validateAssessmentReferences(tenantDb as any, tenantId, data)
    data = { ...data, assetIds: refs.assetIds }

    // The regulation's platform controls plus all of this organisation's own custom controls (always optional). A custom
    // control can also cite this regulation, so de-duplicate by id or assessmentControl.createMany below would hit its
    // @@unique([assessmentId, controlId]) constraint.
    const allControls    = Array.from(new Map(scope.controls.map(c => [c.id, c])).values())
    const exclusionsMap  = new Map(data.exclusions?.map(e => [e.controlId, e.reason]) ?? [])

    // Server-side enforcement: a control that is mandatory for this organisation (it sits under a mandatory node) can
    // never be excluded, whatever the client sends - the UI lock is just the friendly version of this rule.
    for (const controlId of exclusionsMap.keys()) {
      const where = scope.placement.get(controlId)
      if (where?.isMandatory) throw new Error(`Cannot exclude controls from mandatory chapter "${where.groupTitle ?? where.groupName}"`)
    }

    const activeControls = allControls.filter(c => !exclusionsMap.has(c.id))

    // Resolve assignees and get asset names before transaction
    const assigneeMap   = new Map<string, string | null>()
    const assetNameMap  = refs.assetNames

    for (const assetId of data.assetIds) {
      assigneeMap.set(assetId, await resolveAssignee(tenantId, assetId))
    }

    const assessment = await tenantDb.$transaction(async tx => {
      // Reserve one block of task numbers for the whole assessment, atomically in the database. Done inside the
      // transaction, so a failed creation leaves no gap, and concurrent creations queue on the counter instead of
      // computing the same "next" number.
      const taskTotal = data.assetIds.length * activeControls.length
      let taskCounter = taskTotal > 0 ? (await reserveCodeNumbers(tx, tenantId, 'TASK', taskTotal)) - 1 : 0

      const created = await tx.assessment.create({
        data: {
          tenantId, name: data.name, description: data.description,
          departmentId: data.departmentId, createdById: userId,
          startDate: new Date(data.startDate), endDate: new Date(data.endDate),
          totalControls: allControls.length, compliantControls: 0, openTasks: 0,
        },
      })

      if (data.assetIds.length > 0) {
        await tx.assessmentAsset.createMany({
          data: data.assetIds.map(assetId => ({ assessmentId: created.id, assetId })),
        })
      }

      await tx.assessmentRegulation.create({
        data: { assessmentId: created.id, regulationId: regulation.id },
      })

      if (allControls.length > 0) {
        await tx.assessmentControl.createMany({
          data: allControls.map(c => ({
            assessmentId: created.id, controlId: c.id,
            isExcluded: exclusionsMap.has(c.id),
            exclusionReason: exclusionsMap.get(c.id) ?? null,
            complianceStatus: 'NOT_STARTED',
          })),
        })
      }

      // ── Auto-create ComplianceTasks (active control × asset) ──────────────
      // Built up-front and inserted in one createMany instead of N sequential creates —
      // for a large regulation × "select all assets", N was easily in the hundreds, and
      // each awaited round-trip ate into the transaction's 60s timeout budget.
      const dueDate = new Date(data.endDate)
      const tasksToCreate = data.assetIds.flatMap(assetId => {
        const assetName = assetNameMap.get(assetId) ?? assetId
        return activeControls.map(control => {
          // Manual assignment takes priority over auto-delegation
          const manualAssignment = data.taskAssignments?.find(
            ta => ta.controlId === control.id && ta.assetId === assetId
          )
          const assignedTo = manualAssignment !== undefined
            ? manualAssignment.assigneeId   // use manual (null = intentionally unassigned)
            : assigneeMap.get(assetId) ?? null

          taskCounter++
          return {
            tenantId,
            taskCode:     formatCode('TASK', taskCounter),
            title:        `${control.title} — ${assetName}`,
            description:  control.description ?? control.title,
            assessmentId: created.id,
            controlId:    control.id,
            assetId,
            assignedToId: assignedTo,
            createdById:  userId,
            status:       'PENDING' as const,
            priority:     'HIGH' as const,
            dueDate,
            autoAssigned: !!assignedTo,
          }
        })
      })

      if (tasksToCreate.length > 0) {
        await tx.complianceTask.createMany({ data: tasksToCreate })
      }

      await tx.assessment.update({
        where: { id: created.id }, data: { openTasks: tasksToCreate.length },
      })

      return created
    }, { timeout: 60_000 })

    await logTenantAction({
      tenantId, userId,
      action:     TenantAuditAction.ASSESSMENT_CREATED,
      targetType: 'Assessment',
      targetId:   assessment.id,
      targetName: assessment.name,
      details: {
        regulationId:  data.regulationId,
        assetCount:    data.assetIds.length,
        controlCount:  allControls.length,
        taskCount:     activeControls.length * data.assetIds.length,
      },
    })

    return assessment
  },

  async getAssessment(tenantId: string, id: string) {
    const assessment = await tenantDb.assessment.findUnique({
      where:   { id, tenantId },
      include: {
        department:  true,
        assets:      { include: { asset: true } },
        regulations: true,
        controls:    true,
        complianceTasks: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            asset:      { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!assessment) throw new Error('Assessment not found')

    if (assessment.regulations.length > 0) {
      const regId = assessment.regulations[0].regulationId
      const [regulation] = await getRegulationSummaries([regId])
      if (regulation) {
        // Titles and chapter labels for every control, platform or custom, labelled by their place in THIS regulation.
        const heads = await getControlHeads(tenantId, assessment.controls.map(ac => ac.controlId), regId)
        const enriched = assessment.controls.map(ac => {
          const head = heads.get(ac.controlId)
          return { ...ac, title: head?.title ?? ac.controlId, description: head?.description ?? '', chapter: head?.chapter ?? 'Unknown Chapter' }
        });
        (assessment as any).controls        = enriched;
        (assessment as any).regulationDetails = { name: regulation.name, shortCode: regulation.shortCode }
      }
    }
    return assessment
  },
}