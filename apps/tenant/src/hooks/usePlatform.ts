import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '../lib/api-client'

export type LicenceState = 'UNLICENSED' | 'ACTIVE' | 'GRACE' | 'RESTRICTED'

export interface LicenceView {
  state: LicenceState
  reason: 'expired' | 'revoked' | 'clock' | 'not-yet-valid' | 'none' | null
  /** 'off' = licences are not enforced (development builds only) */
  mode: 'enforce' | 'off'
  validUntil: string | null
  graceUntil: string | null
  daysLeft: number | null
  plan: string | null
  limits: { maxUsers: number; maxAssessments: number; storageGb: number } | null
}

export interface ActivationResult {
  organization: { id: string; name: string }
  firstActivation: boolean
  ceoInvite?: { email: string; url: string; expiresAt: string }
}

/** Is this a fresh install still waiting for its licence? (public) */
export function usePlatformStatus() {
  return useQuery({
    queryKey: ['platform', 'status'],
    queryFn: () => apiClient.get<{ success: boolean; data: { activated: boolean; licenceMode: string } }>('/platform/status').then(r => r.data),
    staleTime: 60_000,
    retry: false,
  })
}

/** The signed-in organisation's licence. Refreshed every few minutes so the banner follows a renewal or an expiry. */
export function useLicence() {
  return useQuery({
    queryKey: ['platform', 'licence'],
    queryFn: () => apiClient.get<{ success: boolean; data: LicenceView }>('/platform/licence').then(r => r.data),
    enabled: !!apiClient.tokens.getAccess(),
    staleTime: 5 * 60_000,
    refetchInterval: 15 * 60_000,
    retry: false,
  })
}

/** First activation of a fresh deployment (no sign-in needed). */
export function useActivate() {
  return useMutation({
    mutationFn: (licence: string) =>
      apiClient.post<{ success: boolean; data: ActivationResult }>('/platform/activate', { licence }).then(r => r.data),
    onError: (err: Error) => toast.error(err.message || 'Activation failed'),
  })
}

/** Renewal (CEO / Compliance Officer). Works while the portal is read-only. */
export function useInstallLicence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (licence: string) =>
      apiClient.post<{ success: boolean; data: ActivationResult & { licence: LicenceView } }>('/platform/licence', { licence }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform'] })
      toast.success('Licence installed')
    },
    onError: (err: Error) => toast.error(err.message || 'Could not install the licence'),
  })
}
