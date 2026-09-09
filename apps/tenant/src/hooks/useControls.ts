import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ControlRegulationMapping {
  regulationId: string
  chapterId: string | null
  sectionId: string | null
  regulation: { id: string; name: string; shortCode: string }
  chapter: { id: string; name: string; title: string | null } | null
  section: { id: string; name: string; title: string | null } | null
}

export interface ControlPredefinedAction {
  id: string
  title: string
  description: string
  evidenceTypes: string[]
  suggestedDueDays: number
  priority: string
  orderIndex: number
}

export interface Control {
  id: string
  title: string
  description: string
  applicableTo: 'DATA_FIDUCIARY' | 'SIGNIFICANT_DF' | 'BOTH'
  status: 'DRAFT' | 'PUBLISHED'
  isCustom: boolean
  tenantId: string | null
  createdAt: string
  updatedAt: string
  regulationMappings: ControlRegulationMapping[]
  predefinedActions: ControlPredefinedAction[]
}

const KEYS = {
  list:   ['controls', 'list']       as const,
  detail: (id: string) => ['controls', 'detail', id] as const,
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useListControls() {
  return useQuery({
    queryKey: KEYS.list,
    queryFn:  () => apiClient.get<{ success: boolean; data: Control[] }>('/controls').then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 60_000,
  })
}

export function useControl(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ''),
    queryFn:  () => apiClient.get<{ success: boolean; data: Control }>(`/controls/${id}`).then(r => r.data),
    enabled:  !!id && !!apiClient.tokens.getAccess(),
    staleTime: 60_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateCustomControlInput {
  title: string
  description: string
  applicableTo: 'DATA_FIDUCIARY' | 'SIGNIFICANT_DF' | 'BOTH'
  regulationMappings?: { regulationId: string; chapterId?: string; sectionId?: string }[]
  predefinedActions: {
    title: string; description: string; evidenceTypes: string[]
    suggestedDueDays: number; priority: string
  }[]
}

export function useCreateCustomControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCustomControlInput) => apiClient.post('/controls', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list })
      toast.success('Custom control created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create custom control'),
  })
}
