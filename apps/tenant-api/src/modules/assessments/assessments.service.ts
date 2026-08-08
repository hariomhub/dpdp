import { getTenantPrisma, getSuperAdminPrisma } from '@dpdp/database'
import { logTenantAction } from '../../utils/audit-logger'
import { TenantAuditAction } from '@prisma/tenant-client'

const tenantDb = getTenantPrisma()
const adminDb  = getSuperAdminPrisma()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMaxTaskCode(tenantId: string): Promise<number> {
  const codes = await tenantDb.complianceTask.findMany({
    where: { tenantId }, select: { taskCode: true },
  })
  return codes.reduce((max, { taskCode }) => {
    const n = parseInt(taskCode.replace('ACT-', ''), 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
}

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

  async listRegulations() {
    const regulations = await adminDb.regulation.findMany({
      where:   { status: 'ACTIVE' },
      include: { chapters: { include: { controlMappings: { include: { control: true }, where: { control: { status: 'PUBLISHED', isCustom: false, tenantId: { equals: null } } } } }, orderBy: { orderIndex: 'asc' } } },
      orderBy: { name: 'asc' },
    })
    
    return regulations.map((reg: any) => ({
      ...reg,
      chapters: reg.chapters.map((ch: any) => ({
        ...ch,
        controls: ch.controlMappings.map((cm: any) => cm.control)
      }))
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
    const regulation = await adminDb.regulation.findUnique({
      where:   { id: data.regulationId },
      include: { chapters: { include: { controlMappings: { include: { control: true }, where: { control: { status: 'PUBLISHED' } } } } } },
    })
    if (!regulation) throw new Error('Regulation not found or not active')

    const allControls    = regulation.chapters.flatMap(c => c.controlMappings.map(cm => cm.control))
    const exclusionsMap  = new Map(data.exclusions?.map(e => [e.controlId, e.reason]) ?? [])

    // Server-side enforcement: controls under a mandatory chapter can never be excluded,
    // regardless of what the client sends — the UI lock is just the friendly version of this rule.
    for (const chapter of regulation.chapters) {
      if (!chapter.isMandatory) continue
      const excludedInChapter = chapter.controlMappings.filter(cm => exclusionsMap.has(cm.control.id))
      if (excludedInChapter.length > 0) {
        throw new Error(`Cannot exclude controls from mandatory chapter "${chapter.title ?? chapter.name}"`)
      }
    }

    const activeControls = allControls.filter(c => !exclusionsMap.has(c.id))

    // Resolve assignees and get asset names before transaction
    let taskCounter = await getMaxTaskCode(tenantId)
    const assigneeMap   = new Map<string, string | null>()
    const assetNameMap  = new Map<string, string>()

    for (const assetId of data.assetIds) {
      assigneeMap.set(assetId, await resolveAssignee(tenantId, assetId))
    }

    const assets = await tenantDb.asset.findMany({
      where: { tenantId, id: { in: data.assetIds } }, select: { id: true, name: true },
    })
    assets.forEach(a => assetNameMap.set(a.id, a.name))

    const assessment = await tenantDb.$transaction(async tx => {
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
      let openTaskCount = 0
      const dueDate = new Date(data.endDate)

      for (const assetId of data.assetIds) {
        const assetName  = assetNameMap.get(assetId) ?? assetId

        for (const control of activeControls) {
          // Manual assignment takes priority over auto-delegation
          const manualAssignment = data.taskAssignments?.find(
            ta => ta.controlId === control.id && ta.assetId === assetId
          )
          const assignedTo = manualAssignment !== undefined
            ? manualAssignment.assigneeId   // use manual (null = intentionally unassigned)
            : assigneeMap.get(assetId) ?? null

          taskCounter++
          await tx.complianceTask.create({
            data: {
              tenantId,
              taskCode:     `ACT-${String(taskCounter).padStart(3, '0')}`,
              title:        `${control.title} — ${assetName}`,
              description:  control.description ?? control.title,
              assessmentId: created.id,
              controlId:    control.id,
              assetId,
              assignedToId: assignedTo,
              createdById:  userId,
              status:       'PENDING',
              priority:     'HIGH',
              dueDate,
              autoAssigned: !!assignedTo,
            },
          })
          openTaskCount++
        }
      }

      await tx.assessment.update({
        where: { id: created.id }, data: { openTasks: openTaskCount },
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
      const regId      = assessment.regulations[0].regulationId
      const regDetails = await adminDb.regulation.findUnique({
        where:   { id: regId },
        include: { chapters: { include: { controlMappings: { include: { control: true } } } } },
      })
      if (regDetails) {
        const enriched = assessment.controls.map(ac => {
          let superCtrl = null, chapterName = 'Unknown Chapter'
          for (const ch of regDetails.chapters) {
            const found = ch.controlMappings.find(cm => cm.control.id === ac.controlId)
            if (found) { superCtrl = found.control; chapterName = ch.name; break }
          }
          return { ...ac, title: superCtrl?.title ?? ac.controlId, description: superCtrl?.description ?? '', chapter: chapterName }
        });
        (assessment as any).controls        = enriched;
        (assessment as any).regulationDetails = { name: regDetails.name, shortCode: regDetails.shortCode }
      }
    }
    return assessment
  },
}