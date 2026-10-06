import { releaseWorkingTasks, HandoverDb, HandoverResult } from './task-handover'

/**
 * One definition of "deactivate a person", used by the administrator's Deactivate button and by directory sync, so the
 * two can never drift apart:
 *   - the account is switched off and the reason recorded (a directory sync only re-enables what IT switched off);
 *   - the work they were doing goes back to the pool (work already in review is left alone - see task-handover.ts);
 *   - they stop being a department's primary IT Admin / Auditor and leave their departments.
 * Runs inside the caller's transaction.
 */
export interface DeactivationDb extends HandoverDb {
  user: { update(args: any): Promise<unknown> }
  department: { updateMany(args: any): Promise<unknown> }
  departmentUser: { deleteMany(args: any): Promise<unknown> }
}

export type DeactivationReasonCode = 'ADMIN' | 'ENTRA_SYNC'

export async function deactivateWithinTransaction(
  tx: DeactivationDb,
  tenantId: string,
  userId: string,
  reason: DeactivationReasonCode,
  actorId?: string,
): Promise<HandoverResult> {
  await tx.user.update({ where: { id: userId }, data: { status: 'INACTIVE', deactivatedReason: reason } })

  const handover = await releaseWorkingTasks(
    tx, tenantId, userId,
    reason === 'ENTRA_SYNC' ? 'removed from the directory group' : 'user deactivated',
    actorId,
  )

  await tx.department.updateMany({ where: { tenantId, assignedItAdminId: userId }, data: { assignedItAdminId: null } })
  await tx.department.updateMany({ where: { tenantId, assignedAuditorId: userId }, data: { assignedAuditorId: null } })
  await tx.departmentUser.deleteMany({ where: { userId } })

  return handover
}
