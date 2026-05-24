import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

interface Regulation {
  id: string
  name: string
  shortCode: string
  issuingAuthority: string
  description: string
  jurisdiction: string
  effectiveDate: string
  status: string
  createdAt: string
  _count?: { controlMappings: number }
}

interface CreateRegulationInput {
  name: string
  shortCode: string
  issuingAuthority: string
  description: string
  jurisdiction: string
  effectiveDate: string
  status: string
}

export function useRegulations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.regulations.all(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      const endpoint = `/regulations${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<{
        success: boolean
        data: Regulation[]
        meta: Record<string, number>
      }>(endpoint)
    },
  })
}

export function useRegulation(id: string) {
  return useQuery({
    queryKey: queryKeys.regulations.detail(id),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Regulation }>(`/regulations/${id}`)
        .then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateRegulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRegulationInput) =>
      apiClient.post<{ success: boolean; data: Regulation }>(
        '/regulations',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
    },
  })
}

export function useUpdateRegulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRegulationInput> }) =>
      apiClient.patch<{ success: boolean; data: Regulation }>(
        `/regulations/${id}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
    },
  })
}

export function useArchiveRegulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/regulations/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
    },
  })
}

export function useRegulationChapters(regulationId: string) {
  return useQuery({
    queryKey: ['regulations', regulationId, 'chapters'],
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: any[] }>(
          `/regulations/${regulationId}/chapters`
        )
        .then(res => res.data),
    enabled: !!regulationId,
  })
}

export function useCreateChapter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      regulationId,
      name,
      title,
    }: {
      regulationId: string
      name: string
      title?: string
    }) =>
      apiClient.post(`/regulations/${regulationId}/chapters`, {
        name,
        title,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['regulations', vars.regulationId, 'chapters'],
      })
      toast.success('Chapter created')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create chapter')
    },
  })
}
// ─── Section hooks ────────────────────────────────────────────────────────────

export function useRegulationSections(regulationId: string, chapterId: string) {
  return useQuery({
    queryKey: ['regulations', regulationId, 'chapters', chapterId, 'sections'],
    queryFn:  () =>
      apiClient
        .get<{ success: boolean; data: any[] }>(`/regulations/${regulationId}/chapters/${chapterId}/sections`)
        .then(r => r.data),
    enabled: !!chapterId && !!regulationId,
  })
}

export function useCreateSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, chapterId, name, title }: { regulationId: string; chapterId: string; name: string; title?: string }) =>
      apiClient.post(`/regulations/${regulationId}/chapters/${chapterId}/sections`, { name, title }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'chapters', vars.chapterId, 'sections'] })
      toast.success('Section created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create section'),
  })
}