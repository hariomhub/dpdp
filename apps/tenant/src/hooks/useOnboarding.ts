import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'
// ─── Input types (mirrored from onboarding.service — avoid cross-app imports) ──

export interface PiiRecordInput {
  categories:             string[]
  sensitivity:            string
  purpose:                string
  legalBasis:             string
  retention:              string
  deletionMechanism?:     string
  volume:                 string | number
  crossBorderTransfer:    boolean
  crossBorderDestination?: string
  principalType:          string
  sharedWithThirdParties: boolean
}

export interface AssetInput {
  name:            string
  assetType:       string
  description?:    string
  assetOwner?:     string
  hostingLocation: string
  vendorName?:     string
  criticality:     string
  internetFacing:  boolean
  status:          string
  piiRecords:      PiiRecordInput[]
}

export interface SupplierInput {
  name:               string
  supplierType:       string
  contactName?:       string
  contactEmail:       string
  countryOfOperation: string
  dpaSigned:          boolean
  criticality:        string
  status:             string
  assets:             AssetInput[]
}

export interface DepartmentInput {
  id:           string
  name:         string
  description?: string
  owner?:       string
  ownerEmail?:  string
  assets:       AssetInput[]
  suppliers:    SupplierInput[]
}

export interface InviteInput {
  email:          string
  role:           string
  departmentIds?: string[]
  note?:          string
}


// ─── Response types ───────────────────────────────────────────────────────────

export interface OnboardingStatus {
  steps: {
    orgDetails:    boolean
    classification: boolean
    orgStructure:  boolean
  }
  isComplete: boolean
  tenant: {
    name:           string
    industry:       string
    orgSize:        string
    address:        string
    contactEmail:   string
    dpoName:        string
    dpoEmail:       string
    classification: string
    status:         string
  }
  counts: {
    departments:    number
    assets:         number
    suppliers:      number
    users:          number
    pendingInvites: number
  }
  departments: Array<{ id: string; name: string }>
}

export interface SaveStructureResult {
  departments: Array<{ frontendId: string; dbId: string; name: string }>
  summary: { departments: number; assets: number; suppliers: number }
}

export interface InviteResult {
  invited: Array<{ email: string; role: string }>
  skipped: Array<{ email: string; reason: string }>
  total:   number
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useOnboardingStatus() {
  return useQuery({
    queryKey: queryKeys.onboarding.status,
    queryFn: () =>
      apiClient.get<{ success: boolean; data: OnboardingStatus }>('/onboarding/status')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 60_000,
  })
}

export function useSaveOrgDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name: string; industry: string; orgSize: string; address: string
      country: string; website?: string; contactEmail: string
      panNumber?: string; gstNumber?: string
      dpoName: string; dpoEmail: string; dpoPhone?: string; ceoName: string
    }) => apiClient.patch('/onboarding/org-details', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.status }) },
    onError: (err: Error) => {
      console.error('[useSaveOrgDetails] Error:', err);
      toast.error(err.message || 'Failed to save organization details. Please check your inputs.')
    },
  })
}

export function useSaveClassification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { classification: string; classUncertain: boolean }) =>
      apiClient.patch('/onboarding/classification', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.status }) },
    onError:   (err: Error) => toast.error(err.message || 'Failed to save classification'),
  })
}

export function useSaveStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { departments: DepartmentInput[] }) =>
      apiClient.post<{ success: boolean; data: SaveStructureResult }>('/onboarding/structure', data)
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.status })
      toast.success(
        `${res.summary.departments} dept(s), ${res.summary.assets} asset(s) saved`
      )
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save structure'),
  })
}

export function useInviteTeamMembers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { invites: InviteInput[] }) =>
      apiClient.post<{ success: boolean; data: InviteResult }>('/onboarding/invite', data)
        .then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: queryKeys.onboarding.status })
      if (res.total > 0) toast.success(`${res.total} invitation(s) sent`)
      if (res.skipped.length > 0)
        toast(`${res.skipped.length} skipped — already invited or active`, { icon: 'ℹ️' })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invitations'),
  })
}

export function useCompleteOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post('/onboarding/complete'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: queryKeys.onboarding.status }) },
    onError:   (err: Error) => toast.error(err.message || 'Failed to complete onboarding'),
  })
}