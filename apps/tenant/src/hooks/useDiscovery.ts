import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

export interface DiscoveredAssetDraft {
  id: string
  connectionId: string
  cloudResourceUid: string
  name: string
  region: string
  service: string
  cloudResourceType: string
  suggestedAssetType: string | null
  suggestedCriticality: string | null
  internetFacing: boolean
  tags: Record<string, string> | null
  status: 'PENDING' | 'CONFIRMED' | 'DISMISSED'
  createdAt: string
  connection: { providerKey: string; alias: string }
}

export function useTriggerDiscovery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (connectionId: string) => apiClient.post(`/discovery/connections/${connectionId}/scan`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.cloudConnections.list })
      toast.success('Scan started — this can take a few minutes for a real account')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDiscoveredDrafts(connectionId?: string) {
  return useQuery({
    queryKey: queryKeys.discovery.drafts(connectionId),
    queryFn: () => apiClient.get<{ success: boolean; data: DiscoveredAssetDraft[] }>(
      connectionId ? `/discovery/drafts?connectionId=${connectionId}` : '/discovery/drafts'
    ).then(r => r.data),
  })
}

export function useConfirmDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ draftId, ...body }: {
      draftId: string; departmentId: string
      overrides?: { name?: string; assetType?: string; criticality?: string; internetFacing?: boolean; hostingLocation?: string; vendorName?: string }
    }) => apiClient.post(`/discovery/drafts/${draftId}/confirm`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovery'] })
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Asset created')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDismissDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draftId: string) => apiClient.post(`/discovery/drafts/${draftId}/dismiss`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discovery'] })
      toast.success('Dismissed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
