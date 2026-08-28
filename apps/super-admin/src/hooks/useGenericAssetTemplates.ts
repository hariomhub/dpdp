import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

const KEY = ['generic-asset-templates'] as const

export const ASSET_TYPES = [
  'DATABASE_DATA_STORE', 'SYSTEM_APPLICATION', 'DATA_FLOW', 'THIRD_PARTY_VENDOR',
  'CONSENT_MECHANISM', 'PHYSICAL_HARDWARE', 'API_INTEGRATION', 'MOBILE_APPLICATION',
  'LEGACY_SYSTEM', 'SAAS_THIRD_PARTY', 'OUTSOURCED_MANAGED', 'IN_HOUSE_CLOUD',
  'IN_HOUSE_ON_PREMISE', 'THIRD_PARTY_CLOUD',
] as const

export const ASSET_TYPE_LABELS: Record<string, string> = {
  DATABASE_DATA_STORE: 'Database / Data Store',
  SYSTEM_APPLICATION:  'System / Application',
  DATA_FLOW:           'Data Flow',
  THIRD_PARTY_VENDOR:  'Third-Party Vendor',
  CONSENT_MECHANISM:   'Consent Mechanism',
  PHYSICAL_HARDWARE:   'Physical / Hardware',
  API_INTEGRATION:     'API / Integration Layer',
  MOBILE_APPLICATION:  'Mobile Application',
  LEGACY_SYSTEM:       'Legacy System',
  SAAS_THIRD_PARTY:    'SaaS (Third-Party Hosted)',
  OUTSOURCED_MANAGED:  'Outsourced / Managed Service',
  IN_HOUSE_CLOUD:      'In-House (Cloud Hosted)',
  IN_HOUSE_ON_PREMISE: 'In-House (On-Premise)',
  THIRD_PARTY_CLOUD:   'Third-Party (Cloud Hosted)',
}

export interface GenericAssetTemplate {
  id: string; providerId: string; cloudResourceType: string; displayName: string
  assetType: string; defaultCriticality: string; suggestedDataCategories: string[]
  status: 'DRAFT' | 'PUBLISHED'; isActive: boolean
  provider: { id: string; key: string; displayName: string; category: string }
}

export function useGenericAssetTemplates(providerId?: string) {
  return useQuery({
    queryKey: [...KEY, providerId ?? 'all'],
    queryFn:  () => apiClient.get<{ success: boolean; data: GenericAssetTemplate[] }>(
      providerId ? `/generic-asset-templates?providerId=${providerId}` : '/generic-asset-templates'
    ).then(r => r.data),
    staleTime: 60_000,
  })
}

export function useCreateGenericAssetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      providerId: string; cloudResourceType: string; displayName: string; assetType: string
      defaultCriticality?: string; suggestedDataCategories?: string[]; status?: 'DRAFT' | 'PUBLISHED'
    }) => apiClient.post('/generic-asset-templates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Asset template created') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useUpdateGenericAssetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: string; displayName?: string; assetType?: string; defaultCriticality?: string
      suggestedDataCategories?: string[]; status?: 'DRAFT' | 'PUBLISHED'; isActive?: boolean
    }) => apiClient.patch(`/generic-asset-templates/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Asset template updated') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useDeleteGenericAssetTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/generic-asset-templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success('Asset template deleted') },
    onError:   (err: Error) => toast.error(err.message),
  })
}
