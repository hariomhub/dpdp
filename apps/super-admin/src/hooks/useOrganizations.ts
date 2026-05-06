import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'
import { queryKeys } from '../lib/query-keys'

interface Organization {
  id: string
  tenantCode: string
  name: string
  industry: string
  plan: string
  status: string
  ceoName: string
  ceoEmail: string
  country: string
  onboardedAt: string | null
  createdAt: string
  updatedAt: string
  licenseKey: {
    status: string
    expiresAt: string
  } | null
}

interface OrgsResponse {
  success: boolean
  data: Organization[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface CreateOrgInput {
  name: string
  industry: string
  country: string
  plan: string
  ceoName: string
  ceoEmail: string
  internalNotes?: string
  tenantPortalUrl?: string
}

export function useOrganizations(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.organizations.all(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      const endpoint = `/organizations${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<OrgsResponse>(endpoint)
    },
  })
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Organization }>(`/organizations/${id}`)
        .then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrgInput) =>
      apiClient.post<{ success: boolean; data: Organization }>('/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats })
      toast.success('Organization created and invitation sent')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create organization')
    },
  })
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/organizations/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization suspended')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to suspend organization')
    },
  })
}

export function useActivateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/organizations/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Organization activated')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to activate organization')
    },
  })
}

export function useResendInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/organizations/${id}/resend-invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success('Invitation resent successfully')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to resend invitation')
    },
  })
}