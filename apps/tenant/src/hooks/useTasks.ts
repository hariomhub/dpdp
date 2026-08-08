import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id:          string
  taskCode:    string
  title:       string
  description: string
  status:      string
  priority:    string
  dueDate:     string
  isOverdue:   boolean
  autoAssigned: boolean
  createdAt:   string
  updatedAt:   string
  asset:       { id: string; name: string; assetType: string }
  department:  { id: string; name: string } | null
  assignedTo:  { id: string; name: string; role: string } | null
  assessment:  { id: string; name: string }
  regulation:  { id: string; shortCode: string; name: string } | null
  control:     { id: string; title: string; chapter: string | null } | null
  evidenceCount:    number
  reviewNoteCount:  number
}

export interface MasterEvidence {
  id:          string
  title:       string
  description: string | null
  fileName:    string | null
  fileUrl:     string | null
}

export interface ActionProductOption {
  id:             string
  name:           string
  vendor:         string | null
  logoUrl:        string | null
  masterEvidence: MasterEvidence | null
}

export interface ActionEvidence {
  id:          string
  title:       string
  type:        string
  description: string | null
  fileUrl:     string | null
  fileName:    string | null
  linkUrl:     string | null
  textContent: string | null
  createdAt:   string
  productId:   string | null
  productName: string | null
  otherLabel:  string | null
}

export type GapReasonCode =
  | 'INSUFFICIENT_EVIDENCE'
  | 'NON_COMPLIANT_CONFIGURATION'
  | 'MISSING_DOCUMENTATION'
  | 'INCORRECT_TOOL_USED'
  | 'OUTDATED_EVIDENCE'
  | 'OTHER'

export interface GapFindingFileRef {
  id:       string
  fileName: string
  fileUrl:  string
}

export interface GapFinding {
  id:            string
  reasonCodes:   GapReasonCode[]
  otherReason:   string | null
  remediation:   string
  createdAt:     string
  raisedByName:  string | null
  actionTitles:  string[]
  files:         GapFindingFileRef[]
}

export interface Action {
  id:               string
  title:            string
  description:      string
  evidenceTypes:    string[]
  suggestedDueDays: number
  priority:         string
  orderIndex:       number
  products:         ActionProductOption[]
  evidence:         ActionEvidence[]
  gapFindings:      GapFinding[]
}

export interface EvidenceLinkedAction {
  actionId:    string | null
  actionTitle: string | null
  productId:   string | null
  productName: string | null
  otherLabel:  string | null
}

export interface Evidence {
  id:            string
  title:         string
  type:          string
  description:   string | null
  fileUrl:       string | null
  fileName:      string | null
  linkUrl:       string | null
  textContent:   string | null
  createdAt:     string
  submittedById: string | null
  linkedActions: EvidenceLinkedAction[]
}

export interface TaskDetail extends Task {
  instructions:     string | null
  evidenceRequired: string | null
  createdBy:        { id: string; name: string } | null
  reviewedBy:       { id: string; name: string } | null
  startedAt:        string | null
  submittedAt:      string | null
  reviewedAt:       string | null
  approvedAt:       string | null
  signedOffAt:      string | null
  rejectedAt:       string | null
  evidence:         Evidence[]
  gapFindings:      GapFinding[]
  reviewNotes:      any[]
  statusHistory:    any[]
  control:          {
    id: string; title: string; description: string
    chapter: string | null; actions: Action[]
  } | null
}

const KEYS = {
  list:   (p?: Record<string, any>) => ['tasks', 'list', p] as const,
  detail: (id: string)              => ['tasks', 'detail', id] as const,
  users:  ['tasks', 'assignable-users'] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useListTasks(params?: Record<string, any>) {
  const qs = params ? '?' + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
  ).toString() : ''

  return useQuery({
    queryKey: KEYS.list(params),
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: Task[] }>(`/tasks${qs}`).then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

export function useTaskDetail(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: TaskDetail }>(`/tasks/${id}`).then(r => r.data),
    enabled:  !!id && !!apiClient.tokens.getAccess(),
    staleTime: 15_000,
  })
}

export function useAssignableUsers() {
  return useQuery({
    queryKey: KEYS.users,
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: any[] }>('/tasks/assignable-users').then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 60_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// `useMutation`'s mutate()/mutateAsync() pass exactly ONE `variables` value to
// mutationFn — so every hook here takes a single { id, body? } object, never
// separate positional args (a previous `(id, body)` shape silently broke: callers
// invoked it as mutate([id, body] as any), which bound the whole array to `id`
// and left `body` undefined).
function useTaskMutation<TBody = any>(
  mutationFn: (vars: { id: string; body?: TBody }) => Promise<any>,
  successMsg: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(successMsg)
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  })
}

export function useStartTask() {
  return useTaskMutation(
    ({ id }) => apiClient.patch(`/tasks/${id}/start`),
    'Task started'
  )
}

export function useSubmitTask() {
  return useTaskMutation<{ note?: string }>(
    ({ id, body }) => apiClient.patch(`/tasks/${id}/submit`, body),
    'Submitted for IA review'
  )
}

export function useReviewTask() {
  return useTaskMutation<{ decision: 'approve' | 'reject'; note?: string }>(
    ({ id, body }) => apiClient.patch(`/tasks/${id}/review`, body),
    'Review saved'
  )
}

export function useSignoffTask() {
  return useTaskMutation(
    ({ id }) => apiClient.patch(`/tasks/${id}/signoff`),
    '✅ Task marked Compliant'
  )
}

export function useRejectFinalTask() {
  return useTaskMutation<{ note?: string }>(
    ({ id, body }) => apiClient.patch(`/tasks/${id}/reject-final`, body),
    'Task rejected'
  )
}

export function useAssignTask() {
  return useTaskMutation<{ assigneeId: string | null }>(
    ({ id, body }) => apiClient.patch(`/tasks/${id}/assign`, body),
    'Task assigned'
  )
}

export interface EvidenceActionTag {
  actionId:   string
  productId?: string
  otherLabel?: string
}

export interface AddEvidenceInput {
  title:        string
  type:         string
  description?: string
  linkUrl?:     string
  textContent?: string
  file?:        File
  actions:      EvidenceActionTag[]
}

export function useUploadEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: AddEvidenceInput }) => {
      const fd = new FormData()
      fd.append('title', input.title)
      fd.append('type', input.type)
      if (input.description) fd.append('description', input.description)
      if (input.linkUrl) fd.append('linkUrl', input.linkUrl)
      if (input.textContent) fd.append('textContent', input.textContent)
      if (input.file) fd.append('file', input.file)
      fd.append('actions', JSON.stringify(input.actions))
      return apiClient.upload(`/tasks/${taskId}/evidence`, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Evidence uploaded')
    },
    onError: (err: Error) => toast.error(err.message || 'Upload failed'),
  })
}

export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, evidenceId }: { taskId: string; evidenceId: string }) =>
      apiClient.delete(`/tasks/${taskId}/evidence/${evidenceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Evidence deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  })
}

export interface UpdateEvidenceInput {
  title?:       string
  description?: string
  linkUrl?:     string
  textContent?: string
  file?:        File
}

export function useUpdateEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, evidenceId, input }: { taskId: string; evidenceId: string; input: UpdateEvidenceInput }) => {
      const fd = new FormData()
      if (input.title !== undefined) fd.append('title', input.title)
      if (input.description !== undefined) fd.append('description', input.description)
      if (input.linkUrl !== undefined) fd.append('linkUrl', input.linkUrl)
      if (input.textContent !== undefined) fd.append('textContent', input.textContent)
      if (input.file) fd.append('file', input.file)
      return apiClient.upload(`/tasks/${taskId}/evidence/${evidenceId}`, fd, 'PATCH')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Evidence updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Update failed'),
  })
}

export interface AddGapFindingInput {
  reasonCodes:  GapReasonCode[]
  otherReason?: string
  remediation:  string
  actionIds:    string[]
  files:        File[]
}

export function useAddGapFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, input }: { taskId: string; input: AddGapFindingInput }) => {
      const fd = new FormData()
      fd.append('reasonCodes', JSON.stringify(input.reasonCodes))
      if (input.otherReason) fd.append('otherReason', input.otherReason)
      fd.append('remediation', input.remediation)
      fd.append('actionIds', JSON.stringify(input.actionIds))
      input.files.forEach(f => fd.append('files', f))
      return apiClient.upload(`/tasks/${taskId}/gap-findings`, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Gap finding recorded')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to record gap finding'),
  })
}