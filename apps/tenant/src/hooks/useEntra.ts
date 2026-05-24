import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EntraStatus {
  connected:    boolean
  tenantDomain: string | null
  lastSyncAt:   string | null
  connectedAt:  string | null
}

export interface EntraGroup {
  id:          string
  name:        string
  description: string | null
  mail:        string | null
}

export interface EntraMapping {
  id?:             string
  entraGroupId:   string
  entraGroupName: string
  role:           string
  departmentId?:  string
  departmentName?: string
  userCount?:      number
}

export interface SyncResult {
  synced:  number
  created: number
  updated: number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useEntraStatus() {
  return useQuery({
    queryKey: queryKeys.entra.status,
    queryFn:  () =>
      apiClient
        .get<{ success: boolean; data: EntraStatus }>('/entra/status')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

export function useEntraGroups(enabled = true) {
  return useQuery({
    queryKey: queryKeys.entra.groups,
    queryFn:  () =>
      apiClient
        .get<{ success: boolean; data: EntraGroup[] }>('/entra/groups')
        .then(r => r.data),
    enabled: !!apiClient.tokens.getAccess() && enabled,
    retry:   false,
  })
}

export function useEntraMappings() {
  return useQuery({
    queryKey: queryKeys.entra.mappings,
    queryFn:  () =>
      apiClient
        .get<{ success: boolean; data: EntraMapping[] }>('/entra/mappings')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

export function useConnectEntra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      tenantDomain:  string
      clientId:      string
      clientSecret:  string
      azureTenantId: string
    }) =>
      apiClient
        .post<{ success: boolean; data: { connected: boolean; message: string } }>(
          '/entra/connect',
          data
        )
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.status })
      qc.invalidateQueries({ queryKey: queryKeys.entra.mappings })
      toast.success(res.message || 'Entra ID connected successfully')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to connect Entra ID'),
  })
}

export function useSaveEntraMappings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { mappings: EntraMapping[] }) =>
      apiClient
        .post<{ success: boolean; data: EntraMapping[] }>('/entra/mappings', data)
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.status })
      qc.invalidateQueries({ queryKey: queryKeys.entra.mappings })
      toast.success(`${res.length} mapping(s) saved`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save mappings'),
  })
}

export function useSyncEntraUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient
        .post<{ success: boolean; data: SyncResult }>('/entra/sync')
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.status })
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success(
        `Sync complete — ${res.created} created, ${res.updated} updated`
      )
    },
    onError: (err: Error) => toast.error(err.message || 'Sync failed'),
  })
}

export function useDisconnectEntra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.delete<{ success: boolean; message: string; deactivatedUsers?: number }>('/entra/disconnect'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.status })
      qc.removeQueries({ queryKey: queryKeys.entra.groups })
      qc.removeQueries({ queryKey: queryKeys.entra.mappings })
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success(res.message || 'Entra ID disconnected')
      if (res.deactivatedUsers) {
        toast(`Deactivated ${res.deactivatedUsers} synced users`, { icon: 'ℹ️' })
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to disconnect'),
  })
}

export function useRemoveGroupMapping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mappingId: string) => 
      apiClient.delete<{ success: boolean; data: { removed: string; deactivatedUsers: number } }>(`/entra/mappings/${mappingId}`)
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.mappings })
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success(`Removed mapping for ${res.removed}`)
      if (res.deactivatedUsers > 0) {
        toast(`Deactivated ${res.deactivatedUsers} users`, { icon: 'ℹ️' })
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove mapping'),
  })
}

export function useReconnectEntra() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      tenantDomain:  string
      clientId:      string
      clientSecret:  string
      azureTenantId: string
    }) =>
      apiClient
        .post<{ success: boolean; data: { reconnected: boolean; message: string } }>(
          '/entra/reconnect',
          data
        )
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.entra.status })
      toast.success(res.message || 'Entra ID reconnected')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reconnect Entra ID'),
  })
}

export function useEntraLogin() {
  return useMutation({
    mutationFn: (data: { code: string; tenantId: string; redirectUri: string }) =>
      apiClient
        .post<{
          success: boolean
          data: {
            accessToken:  string
            refreshToken: string
            user: { id: string; name: string; email: string; role: string; tenantId: string }
          }
        }>('/entra/login', data)
        .then(r => r.data),
    onError: (err: Error) => toast.error(err.message || 'Microsoft login failed'),
  })
}