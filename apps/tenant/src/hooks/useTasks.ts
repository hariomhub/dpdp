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
  evidence:         any[]
  reviewNotes:      any[]
  statusHistory:    any[]
  control:          {
    id: string; title: string; description: string
    chapter: string | null; actions: any[]
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

function useTaskMutation(
  mutationFn: (id: string, body?: any) => Promise<any>,
  successMsg: string
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(successMsg)
    },
    onError: (err: Error) => toast.error(err.message || 'Action failed'),
  })
}

export function useStartTask() {
  return useTaskMutation(
    (id) => apiClient.patch(`/tasks/${id}/start`),
    'Task started'
  )
}

export function useSubmitTask() {
  return useTaskMutation(
    (id, body) => apiClient.patch(`/tasks/${id}/submit`, body),
    'Submitted for IA review'
  )
}

export function useReviewTask() {
  return useTaskMutation(
    (id, body) => apiClient.patch(`/tasks/${id}/review`, body),
    'Review saved'
  )
}

export function useSignoffTask() {
  return useTaskMutation(
    (id) => apiClient.patch(`/tasks/${id}/signoff`),
    '✅ Task marked Compliant'
  )
}

export function useRejectFinalTask() {
  return useTaskMutation(
    (id, body) => apiClient.patch(`/tasks/${id}/reject-final`, body),
    'Task rejected'
  )
}

export function useAssignTask() {
  return useTaskMutation(
    (id, body) => apiClient.patch(`/tasks/${id}/assign`, body),
    'Task assigned'
  )
}