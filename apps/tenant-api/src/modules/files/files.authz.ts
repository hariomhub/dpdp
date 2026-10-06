/**
 * Who may open the files attached to a compliance task.
 *
 * Mirrors how the portal already scopes tasks: CEO / CO / auditors work across the whole tenant; an IT Admin
 * only works on tasks assigned to them. (Tenant isolation is enforced separately by always querying with the
 * caller's tenantId - this function only decides between roles inside one tenant.)
 */
export interface FileViewer {
  role: string
  userId: string
}

export interface TaskFileScope {
  assignedToId: string | null
  /** who submitted the evidence, when the file is evidence (null for gap-finding files) */
  submittedById?: string | null
}

export function canViewTaskFile(viewer: FileViewer, scope: TaskFileScope): boolean {
  switch (viewer.role) {
    case 'CEO':
    case 'CO':
    case 'INTERNAL_AUDITOR':
    case 'EXTERNAL_AUDITOR':
      return true
    case 'IT_ADMIN':
      return scope.assignedToId === viewer.userId || scope.submittedById === viewer.userId
    default:
      return false
  }
}
