import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import { useApp } from '../app/context/AppContext'
import toast from 'react-hot-toast'

const TENANT_CODE_KEY = 'tenant_code';
export const storedTenantCode = {
  get: (): string => localStorage.getItem(TENANT_CODE_KEY) || '',
  set: (code: string) => localStorage.setItem(TENANT_CODE_KEY, code),
  clear: () => localStorage.removeItem(TENANT_CODE_KEY),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:       string
  name:     string
  email:    string
  role:     string   // CEO | CO | IT_ADMIN | INTERNAL_AUDITOR | EXTERNAL_AUDITOR
  tenantId: string
}

export interface TenantInfo {
  id:             string
  name:           string
  tenantCode:     string
  plan:           string
  status:         string
  classification: string | null
}

interface LoginResponse {
  success: boolean
  data: {
    accessToken:  string
    refreshToken: string
    user:         AuthUser
  }
}

interface MeResponse {
  success: boolean
  data: {
    user:   AuthUser
    tenant: TenantInfo
  }
}

interface SetPasswordResponse {
  success: boolean
  data: {
    accessToken:  string
    refreshToken: string
    user:         AuthUser
    isFirstLogin: boolean
  }
}

// Maps API role (UPPER_SNAKE) to AppContext role (lower_snake)
function toContextRole(apiRole: string): import('../app/context/AppContext').TenantRole {
  const map: Record<string, import('../app/context/AppContext').TenantRole> = {
    CEO:               'ceo',
    CO:                'co',
    IT_ADMIN:          'it_admin',
    INTERNAL_AUDITOR:  'internal_auditor',
    EXTERNAL_AUDITOR:  'external_auditor',
  }
  return map[apiRole] ?? 'ceo'
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLogin() {
  const navigate    = useNavigate()
  const { setRole, setOrgName } = useApp()

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiClient.post<LoginResponse>('/auth/login', data),
    onSuccess: (res) => {
      apiClient.tokens.set(res.data.accessToken, res.data.refreshToken)
      setRole(toContextRole(res.data.user.role))
      navigate('/org/dashboard')
    },
    onError: (err: Error) => toast.error(err.message || 'Login failed'),
  })
}

export function useVerifyInvite(token: string) {
  return useQuery({
    queryKey: ['auth', 'invite', token],
    queryFn: () =>
      apiClient.get<{ success: boolean; data: any }>(`/auth/verify-invite/${token}`)
        .then(r => r.data),
    enabled: !!token,
    retry:   false,
  })
}

export function useSetPassword() {
  const navigate    = useNavigate()
  const { setRole, setOrgName } = useApp()

  return useMutation({
    mutationFn: (data: { token: string; password: string; name?: string }) =>
      apiClient.post<SetPasswordResponse>(`/auth/set-password/${data.token}`, {
        password: data.password,
        name:     data.name,
      }),
    onSuccess: (res) => {
      apiClient.tokens.set(res.data.accessToken, res.data.refreshToken)
      setRole(toContextRole(res.data.user.role))
      // Return the response so the component can decide where to navigate
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to set password'),
  })
}

export function useMe() {
  const { setRole, setOrgName, setUserName, setUserEmail } = useApp()

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () =>
      apiClient.get<MeResponse>('/auth/me').then(r => {
        setRole(toContextRole(r.data.user.role))
        setOrgName(r.data.tenant.name)
        setUserName(r.data.user.name)
        setUserEmail(r.data.user.email)
        return r.data
      }),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 5 * 60 * 1000,
    retry:     false,
  })
}

export function useLogout() {
  const navigate     = useNavigate()
  const queryClient  = useQueryClient()

  return useMutation({
    mutationFn: () => apiClient.post('/auth/logout'),
    onSettled: () => {
      apiClient.tokens.clear()
      queryClient.clear()
      navigate('/login')
      // Note: keep tenant_code in localStorage so login form stays pre-filled
    },
  })
}