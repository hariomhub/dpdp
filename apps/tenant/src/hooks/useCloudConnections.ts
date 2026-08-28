import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

export interface CloudProviderOption {
  key: string
  displayName: string
  category: string
  credentialSchema: any
  logoUrl: string | null
}

export interface CloudConnection {
  id: string
  providerKey: string
  providerDisplayName: string
  alias: string
  status: 'PENDING' | 'CONNECTED' | 'FAILED' | 'DISCONNECTED'
  lastCheckedAt: string | null
  lastError: string | null
  createdAt: string
  _count: { discoveredAssets: number }
}

export function useCloudProviders() {
  return useQuery({
    queryKey: queryKeys.cloudConnections.providers,
    queryFn: () => apiClient.get<{ success: boolean; data: CloudProviderOption[] }>('/cloud-connections/providers').then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useCloudConnections() {
  return useQuery({
    queryKey: queryKeys.cloudConnections.list,
    queryFn: () => apiClient.get<{ success: boolean; data: CloudConnection[] }>('/cloud-connections').then(r => r.data),
    // Connections transition PENDING -> CONNECTED/FAILED in the background
    // (a queued job, not this request) — poll briefly so the status chip
    // updates on its own instead of requiring a manual refresh.
    refetchInterval: (query) => {
      const data = query.state.data as CloudConnection[] | undefined
      return data?.some(c => c.status === 'PENDING') ? 4000 : false
    },
  })
}

export function useCreateCloudConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { providerKey: string; alias: string; credentials: Record<string, unknown> }) =>
      apiClient.post('/cloud-connections', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cloudConnections.list })
      toast.success('Connection added — testing now')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRetestCloudConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => apiClient.post(`/cloud-connections/${connectionId}/retest`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cloudConnections.list })
      toast.success('Retesting connection')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDisconnectCloudConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => apiClient.delete(`/cloud-connections/${connectionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cloudConnections.list })
      toast.success('Connection removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
