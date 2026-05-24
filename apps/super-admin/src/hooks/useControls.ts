import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

interface PredefinedAction {
  id: string
  title: string
  description: string
  evidenceTypes: string[]
  suggestedDueDays: number
  priority: string
  orderIndex: number
}

interface Control {
  id: string
  title: string
  description: string
  applicableTo: string
  status: string
  isCustom: boolean
  createdAt: string
  regulationMappings: Array<{
    regulation: { id: string; name: string; shortCode: string }
    chapter?: { id: string; name: string; title?: string }
    sectionId?: string
  }>
  predefinedActions: PredefinedAction[]
  _count?: { predefinedActions: number }
}

interface CreateControlInput {
  title: string
  description: string
  applicableTo: string
  status: string
  regulationMappings: Array<{
    regulationId: string
    chapterId?: string
    sectionId?: string
  }>
  predefinedActions: Array<{
    title: string
    description: string
    evidenceTypes: string[]
    suggestedDueDays: number
    priority: string
    orderIndex?: number
    productIds?: string[]
  }>
}

export function useControls(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.controls.all(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      const endpoint = `/controls${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<{
        success: boolean
        data: Control[]
        meta: Record<string, number>
      }>(endpoint)
    },
  })
}

export function useControl(id: string) {
  return useQuery({
    queryKey: queryKeys.controls.detail(id),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Control }>(`/controls/${id}`)
        .then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateControlInput) =>
      apiClient.post<{ success: boolean; data: Control }>('/controls', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Control created successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create control')
    },
  })
}

export function usePublishControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/controls/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Control published')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to publish control')
    },
  })
}
// ─── Management hooks ─────────────────────────────────────────────────────────

export function useDeleteControl() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/controls/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['controls'] }); toast.success('Control deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete'),
  })
}

export function useUpdateAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, actionId, data }: { controlId: string; actionId: string; data: any }) =>
      apiClient.patch(`/controls/${controlId}/actions/${actionId}`, data),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['controls', vars.controlId] }); toast.success('Action updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update action'),
  })
}

export function useRemovePredefinedAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, actionId }: { controlId: string; actionId: string }) =>
      apiClient.delete(`/controls/${controlId}/actions/${actionId}`),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['controls', vars.controlId] }); toast.success('Action removed') },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove action'),
  })
}

export function useSetActionProducts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, actionId, productIds }: { controlId: string; actionId: string; productIds: string[] }) =>
      apiClient.put(`/controls/${controlId}/actions/${actionId}/products`, { productIds }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['controls', vars.controlId] }); toast.success('Products updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update products'),
  })
}

export function useCreateMasterEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, actionId, productId, title, description, file }: {
      controlId: string; actionId: string; productId: string
      title: string; description?: string; file?: File
    }) => {
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('title', title)
        if (description) fd.append('description', description)
        return (apiClient as any).postFormData(
          `/controls/${controlId}/actions/${actionId}/products/${productId}/master-evidence`, fd
        )
      }
      return apiClient.post(
        `/controls/${controlId}/actions/${actionId}/products/${productId}/master-evidence`,
        { title, description }
      )
    },
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['controls', vars.controlId] }); toast.success('Evidence added') },
    onError: (err: Error) => toast.error(err.message || 'Failed to add evidence'),
  })
}

export function useDeleteMasterEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ controlId, actionId, productId, evidenceId }: { controlId: string; actionId: string; productId: string; evidenceId: string }) =>
      apiClient.delete(`/controls/${controlId}/actions/${actionId}/products/${productId}/master-evidence/${evidenceId}`),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['controls', vars.controlId] }); toast.success('Evidence removed') },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove evidence'),
  })
}