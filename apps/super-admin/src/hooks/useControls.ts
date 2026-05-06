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
  chapterId: string | null
  chapterReference: string | null
  chapter: { id: string; name: string; title?: string } | null
  sectionReference: string | null
  applicableTo: string
  status: string
  isCustom: boolean
  createdAt: string
  regulationMappings: Array<{
    regulation: { id: string; name: string; shortCode: string }
  }>
  predefinedActions: PredefinedAction[]
  _count?: { predefinedActions: number }
}

interface CreateControlInput {
  title: string
  description: string
  chapterId?: string
  sectionReference?: string
  applicableTo: string
  status: string
  regulationIds: string[]
  predefinedActions: Array<{
    title: string
    description: string
    evidenceTypes: string[]
    suggestedDueDays: number
    priority: string
    orderIndex?: number
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