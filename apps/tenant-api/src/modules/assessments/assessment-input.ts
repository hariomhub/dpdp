import { HttpError } from '../../utils/http-error'

/**
 * An assessment names a department, a set of assets and (optionally) people to hand tasks to. The request body only
 * carries ids, so every one of them is checked against this organisation before anything is written - otherwise a
 * crafted request (or a stale browser tab) could attach another record's id, or give work to someone who is
 * deactivated or not an IT Admin, and the database would only complain half-way through the transaction.
 */
export interface AssessmentRefDb {
  department: { findFirst(args: any): Promise<{ id: string } | null> }
  asset: { findMany(args: any): Promise<Array<{ id: string; name: string }>> }
  user: { findMany(args: any): Promise<Array<{ id: string }>> }
}

export interface AssessmentRefInput {
  departmentId: string
  assetIds: string[]
  taskAssignments?: Array<{ controlId: string; assetId: string; assigneeId: string | null }>
}

export async function validateAssessmentReferences(
  db: AssessmentRefDb,
  tenantId: string,
  input: AssessmentRefInput,
): Promise<{ assetIds: string[]; assetNames: Map<string, string> }> {
  const department = await db.department.findFirst({ where: { tenantId, id: input.departmentId }, select: { id: true } })
  if (!department) throw HttpError.badRequest('Department not found in your organization')

  // The same asset ticked twice would violate the (assessment, asset) uniqueness; treat it as one.
  const assetIds = [...new Set(input.assetIds)]
  const assets = await db.asset.findMany({ where: { tenantId, id: { in: assetIds } }, select: { id: true, name: true } })
  if (assets.length !== assetIds.length) {
    throw HttpError.badRequest('One or more selected assets were not found in your organization. Reload the page and try again.')
  }

  // Same rule as re-assigning a task later (tasks.service assignTask): an active IT Admin of this organisation.
  const assigneeIds = [...new Set((input.taskAssignments ?? []).map(t => t.assigneeId).filter((id): id is string => !!id))]
  if (assigneeIds.length > 0) {
    const valid = await db.user.findMany({
      where: { tenantId, id: { in: assigneeIds }, status: 'ACTIVE', role: 'IT_ADMIN' },
      select: { id: true },
    })
    if (valid.length !== assigneeIds.length) {
      throw HttpError.badRequest('One or more selected assignees are not active IT Admins of your organization.')
    }
  }

  return { assetIds, assetNames: new Map(assets.map(a => [a.id, a.name])) }
}
