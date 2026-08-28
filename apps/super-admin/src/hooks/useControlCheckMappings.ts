import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

const KEY = ['control-check-mappings'] as const

export interface ScannerCheckInfo {
  check_id: string
  title: string
  severity: string
  service: string
  resource_type: string
  description: string
}

export interface ControlCheckMapping {
  id: string
  predefinedActionId: string
  providerId: string
  checkId: string
  checkTitle: string
  checkSeverity: string | null
  status: 'DRAFT' | 'PUBLISHED'
  isActive: boolean
  provider: { id: string; key: string; displayName: string }
  predefinedAction: { id: string; title: string; control: { id: string; title: string } }
}

export function useBrowseChecks(providerKey: string | null) {
  return useQuery({
    queryKey: [...KEY, 'checks', providerKey],
    queryFn: () => apiClient.get<{ success: boolean; data: ScannerCheckInfo[] }>(
      `/control-check-mappings/checks?provider=${providerKey}`
    ).then(r => r.data),
    enabled: !!providerKey,
    staleTime: 5 * 60_000,
  })
}

export function useControlCheckMappings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<{ success: boolean; data: ControlCheckMapping[] }>('/control-check-mappings').then(r => r.data),
  })
}

export function useCreateCheckMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      predefinedActionId: string; providerId: string
      checkId: string; checkTitle: string; checkSeverity?: string; status?: 'DRAFT' | 'PUBLISHED'
    }) => apiClient.post('/control-check-mappings', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Mapping created') },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCheckMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: 'DRAFT' | 'PUBLISHED'; isActive?: boolean }) =>
      apiClient.patch(`/control-check-mappings/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Mapping updated') },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteCheckMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/control-check-mappings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Mapping deleted') },
    onError: (err: Error) => toast.error(err.message),
  })
}
