import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamUser {
  id:           string
  name:         string
  email:        string
  initials:     string
  role:         string
  roleLabel:    string
  status:       'ACTIVE' | 'INACTIVE' | 'PENDING_INVITE'
  source:       'MANUAL' | 'ENTRA_ID'
  entraObjectId: string | null
  lastLoginAt:  string
  joinedAt:     string | null
  departments:    Array<{ id: string; name: string }>
  lmsDesignation: string | null
}

export interface PendingInvitation {
  id:           string
  email:        string
  role:         string
  roleLabel:    string
  note:         string | null
  createdAt:    string
  expiresAt:    string
  expired:      boolean
  expiresInHours: number
  invitedBy:    string | null
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useListUsers() {
  return useQuery({
    queryKey: queryKeys.users.list,
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: TeamUser[] }>('/users').then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

export function useListInvitations() {
  return useQuery({
    queryKey: queryKeys.users.invitations,
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: PendingInvitation[] }>('/users/invitations')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      email: string; role: string; departmentIds?: string[]; note?: string
    }) => apiClient.post('/users/invite', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      qc.invalidateQueries({ queryKey: queryKeys.users.invitations })
      toast.success('Invitation sent')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invitation'),
  })
}

export function useResendInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/users/invitations/${id}/resend`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.invitations })
      toast.success('Invitation resent — new 48h window')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to resend'),
  })
}

export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/users/invitations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.invitations })
      toast.success('Invitation cancelled')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to cancel'),
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiClient.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success('Role updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update role'),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/deactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success('User deactivated — tasks unassigned')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to deactivate'),
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/users/${id}/reactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success('User reactivated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reactivate'),
  })
}

export function useUpdateUserDepartments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, departmentIds }: { id: string; departmentIds: string[] }) =>
      apiClient.patch(`/users/${id}/departments`, { departmentIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.users.list })
      toast.success('Department assignments updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update departments'),
  })
}