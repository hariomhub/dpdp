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

export function useDeleteRegulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, password, confirmShortCode }: { id: string; password: string; confirmShortCode: string }) =>
      apiClient.delete<{ success: boolean; data: { nodeCount: number; categoryCount: number; controlsUnmapped: number } }>(
        `/regulations/${id}`, { password, confirmShortCode }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regulations'] })
      queryClient.invalidateQueries({ queryKey: ['controls'] })
      toast.success('Regulation deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete regulation'),
  })
}

// ─── Regulation Node tree (generic — any depth, any regulation) ──────────────

export interface RegNode {
  id: string
  regulationId: string
  parentId: string | null
  nodeType: string
  code: string
  title?: string | null
  content?: string | null
  orderIndex: number
  depth: number
  path: string
  _count?: { children: number; controlLinks: number }
}

export function useRegulationNodes(regulationId: string) {
  return useQuery({
    queryKey: ['regulations', regulationId, 'nodes'],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: RegNode[] }>(`/regulations/${regulationId}/nodes`).then(r => r.data),
    enabled: !!regulationId,
  })
}

export function useCreateNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, ...body }: { regulationId: string; parentId?: string | null; nodeType: string; code: string; title?: string; content?: string; orderIndex?: number }) =>
      apiClient.post<{ success: boolean; data: RegNode }>(`/regulations/${regulationId}/nodes`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'nodes'] })
      toast.success('Node created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create node'),
  })
}

export function useUpdateNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, nodeId, data }: { regulationId: string; nodeId: string; data: Partial<{ nodeType: string; code: string; title: string; content: string; orderIndex: number }> }) =>
      apiClient.patch(`/regulations/${regulationId}/nodes/${nodeId}`, data),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'nodes'] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to update node'),
  })
}

export function useDeleteNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, nodeId }: { regulationId: string; nodeId: string }) =>
      apiClient.delete(`/regulations/${regulationId}/nodes/${nodeId}`),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'nodes'] }); toast.success('Node deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete node'),
  })
}

export function useMoveNode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, nodeId, newParentId }: { regulationId: string; nodeId: string; newParentId: string | null }) =>
      apiClient.post(`/regulations/${regulationId}/nodes/${nodeId}/move`, { newParentId }),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'nodes'] }); toast.success('Node moved') },
    onError: (err: Error) => toast.error(err.message || 'Failed to move node'),
  })
}

// ─── Applicability categories + node applicability ───────────────────────────

export interface ApplicabilityCategory {
  id: string
  regulationId: string
  code: string
  label: string
  criteriaSummary?: string | null
  orderIndex: number
}

export function useApplicabilityCategories(regulationId: string) {
  return useQuery({
    queryKey: ['regulations', regulationId, 'applicability-categories'],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: ApplicabilityCategory[] }>(`/regulations/${regulationId}/applicability-categories`).then(r => r.data),
    enabled: !!regulationId,
  })
}

export function useCreateApplicabilityCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, ...body }: { regulationId: string; code: string; label: string; criteriaSummary?: string }) =>
      apiClient.post<{ success: boolean; data: ApplicabilityCategory }>(`/regulations/${regulationId}/applicability-categories`, body),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'applicability-categories'] })
      toast.success('Category created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create category'),
  })
}

export function useDeleteApplicabilityCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, categoryId }: { regulationId: string; categoryId: string }) =>
      apiClient.delete(`/regulations/${regulationId}/applicability-categories/${categoryId}`),
    onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'applicability-categories'] }); toast.success('Category deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete category'),
  })
}

export function useNodeApplicabilities(regulationId: string, nodeId: string) {
  return useQuery({
    queryKey: ['regulations', regulationId, 'nodes', nodeId, 'applicability'],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: any[] }>(`/regulations/${regulationId}/nodes/${nodeId}/applicability`).then(r => r.data),
    enabled: !!regulationId && !!nodeId,
  })
}

export function useSetNodeApplicability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ regulationId, nodeId, applicabilityCategoryId, status, note }: { regulationId: string; nodeId: string; applicabilityCategoryId: string; status: 'MANDATORY' | 'APPLICABLE' | 'EXEMPT'; note?: string }) =>
      apiClient.post(`/regulations/${regulationId}/nodes/${nodeId}/applicability`, { applicabilityCategoryId, status, note }),
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ['regulations', vars.regulationId, 'nodes', vars.nodeId, 'applicability'] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to set applicability'),
  })
}