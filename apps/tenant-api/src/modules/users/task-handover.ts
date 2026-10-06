/**
 * What happens to a person's tasks when they can no longer do them (deactivated, or no longer an IT Admin).
 *
 * Rule (agreed with the product owner): only the work they were DOING goes back to the pool. Work that has been
 * submitted, is under review, or is approved has left their hands and must not be reopened - reopening it would throw
 * away a review that took place and make the audit trail unreliable.
 *
 *   PENDING, IN_PROGRESS, OVERDUE  -> unassigned, back to PENDING (a status-history entry records why)
 *   EVIDENCE_SUBMITTED, UNDER_REVIEW, APPROVED_INTERNAL, FINAL_REVIEW, COMPLIANT, REJECTED -> untouched
 *
 * The evidence they already attached to a reopened task stays on it; the next person sees it.
 */

export const WORKING_STATUSES = ['PENDING', 'IN_PROGRESS', 'OVERDUE'] as const
export const IN_REVIEW_STATUSES = ['EVIDENCE_SUBMITTED', 'UNDER_REVIEW', 'APPROVED_INTERNAL', 'FINAL_REVIEW'] as const

/** The part of a Prisma client (or transaction client) this needs - keeps it testable with a fake. */
export interface HandoverDb {
  complianceTask: {
    findMany(args: any): Promise<Array<{ id: string; status: string }>>
    updateMany(args: any): Promise<{ count: number }>
    count(args: any): Promise<number>
  }
  taskStatusHistory: { createMany(args: any): Promise<unknown> }
}

export interface HandoverResult {
  /** tasks put back in the pool */
  released: number
  /** tasks left as they were because they are already submitted / under review / approved */
  inReview: number
}

export async function releaseWorkingTasks(
  db: HandoverDb,
  tenantId: string,
  userId: string,
  reason: string,
  actorId?: string,
): Promise<HandoverResult> {
  const working = await db.complianceTask.findMany({
    where: { tenantId, assignedToId: userId, status: { in: [...WORKING_STATUSES] } },
    select: { id: true, status: true },
  })

  if (working.length > 0) {
    await db.complianceTask.updateMany({
      where: { id: { in: working.map(t => t.id) }, tenantId, assignedToId: userId, status: { in: [...WORKING_STATUSES] } },
      data: { assignedToId: null, status: 'PENDING', startedAt: null, autoAssigned: false },
    })
    await db.taskStatusHistory.createMany({
      data: working.map(t => ({
        taskId: t.id,
        fromStatus: t.status,
        toStatus: 'PENDING',
        changedById: actorId ?? null,
        notes: `Unassigned: ${reason}`,
      })),
    })
  }

  const inReview = await db.complianceTask.count({
    where: { tenantId, assignedToId: userId, status: { in: [...IN_REVIEW_STATUSES] } },
  })

  return { released: working.length, inReview }
}
