import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

export interface MasterControlAction {
  id: string
  masterControlId: string
  title: string
  description: string
  evidenceTypes: string[]
  suggestedDueDays: number
  priority: string
  orderIndex: number
}

export interface MasterControlLinkedControl {
  id: string
  title: string
  description: string
  status: string
  regulationId: string | null
  regulation: { id: string; shortCode: string; name: string } | null
  predefinedActions: Array<{ id: string; masterActionId: string | null }>
}

export interface MasterControl {
  id: string
  code: string
  title: string
  description: string
  status: string
  createdAt: string
  _count?: { actions: number; controls: number }
  controls?: Array<{ id: string; regulation: { shortCode: string } | null }>
  actions?: MasterControlAction[]
}

export interface MasterControlDetail extends MasterControl {
  actions: MasterControlAction[]
  controls: MasterControlLinkedControl[]
}

export function useMasterControls(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['master-controls', params],
    queryFn: () => {
      const searchParams = new URLSearchParams(params as Record<string, string>).toString()
      return apiClient.get<{ success: boolean; data: MasterControl[]; meta: Record<string, number> }>(
        `/master-controls${searchParams ? `?${searchParams}` : ''}`
      )
    },
  })
}

export function useMasterControl(id: string) {
  return useQuery({
    queryKey: ['master-controls', id],
    queryFn: () => apiClient.get<{ success: boolean; data: MasterControlDetail }>(`/master-controls/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreateMasterControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      apiClient.post<{ success: boolean; data: MasterControl }>('/master-controls', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-controls'] })
      toast.success('Master control created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create master control'),
  })
}

export function useUpdateMasterControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<{ title: string; description: string; status: string }> }) =>
      apiClient.patch(`/master-controls/${id}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-controls'] })
      queryClient.invalidateQueries({ queryKey: ['master-controls', vars.id] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update master control'),
  })
}

export function useDeleteMasterControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/master-controls/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-controls'] })
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Master control deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete master control'),
  })
}

export function useCreateMasterAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ masterControlId, ...body }: {
      masterControlId: string; title: string; description: string; evidenceTypes: string[]
      suggestedDueDays?: number; priority?: string
    }) => apiClient.post(`/master-controls/${masterControlId}/actions`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-controls', vars.masterControlId] })
      toast.success('Master action added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add master action'),
  })
}

export function useUpdateMasterAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ masterControlId, actionId, data }: {
      masterControlId: string; actionId: string
      data: Partial<{ title: string; description: string; evidenceTypes: string[]; suggestedDueDays: number; priority: string }>
    }) => apiClient.patch(`/master-controls/${masterControlId}/actions/${actionId}`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-controls', vars.masterControlId] })
      toast.success('Master action updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update master action'),
  })
}

export function useDeleteMasterAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ masterControlId, actionId }: { masterControlId: string; actionId: string }) =>
      apiClient.delete(`/master-controls/${masterControlId}/actions/${actionId}`),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['master-controls', vars.masterControlId] })
      toast.success('Master action removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove master action'),
  })
}

// Links/unlinks an existing regulation-specific control to a master control —
// goes through the regular control-update endpoint since masterControlId is
// just a normal (nullable) field on Control, not a separate junction.
export function useSetControlMasterLink() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, masterControlId }: { controlId: string; masterControlId: string | null }) =>
      apiClient.patch(`/controls/${controlId}`, { masterControlId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-controls'] })
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Control link updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update control link'),
  })
}
