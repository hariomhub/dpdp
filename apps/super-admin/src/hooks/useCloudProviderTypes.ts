import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

const KEY = ['cloud-provider-types'] as const

export type ProviderCategory =
  | 'CLOUD_INFRASTRUCTURE' | 'IDENTITY_SAAS' | 'DEVOPS_SOURCE'
  | 'DATABASE_SERVICE' | 'EDGE_PLATFORM' | 'CONTAINER_ORCHESTRATION' | 'EMERGING'

export interface CloudProviderType {
  id: string; key: string; displayName: string; category: ProviderCategory
  isActive: boolean; credentialSchema: Record<string, unknown>
  logoUrl: string | null; docsUrl: string | null
  _count: { assetTemplates: number }
}

export function useCloudProviderTypes() {
  return useQuery({
    queryKey: KEY,
    queryFn:  () => apiClient.get<{ success: boolean; data: CloudProviderType[] }>('/cloud-provider-types').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useCreateCloudProviderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { key: string; displayName: string; category: ProviderCategory; credentialSchema: object; logoUrl?: string; docsUrl?: string }) =>
      apiClient.post('/cloud-provider-types', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Provider added') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useUpdateCloudProviderType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; displayName?: string; category?: ProviderCategory; credentialSchema?: object; logoUrl?: string; docsUrl?: string }) =>
      apiClient.patch(`/cloud-provider-types/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Provider updated') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useToggleCloudProviderActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/cloud-provider-types/${id}/active`, { isActive }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEY })
      toast.success(vars.isActive ? 'Provider activated' : 'Provider deactivated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
