import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PiiRecordSummary {
  id: string; categories: string[]; sensitivity: string; purpose: string
  legalBasis: string; retention: string; volume: string | number
  deletionMechanism?: string; crossBorderDestination?: string
  crossBorderTransfer: boolean; principalType: string; sharedWithThirdParties: boolean
}

export interface AssetSummary {
  id: string; name: string; assetType: string; criticality: string
  status: string; compliance: string
  piiRecords: PiiRecordSummary[]
}

export interface SupplierAssetSummary {
  id: string; name: string; assetType: string; criticality: string
  piiRecords: PiiRecordSummary[]
}

export interface SupplierSummary {
  id: string; name: string; supplierType: string; contactEmail: string
  countryOfOperation: string; dpaSigned: boolean; criticality: string; status: string
  supplierAssets: SupplierAssetSummary[]
}

export interface DepartmentFull {
  id: string; name: string; description: string | null
  createdAt: string; updatedAt: string
  assets: AssetSummary[]
  suppliers: SupplierSummary[]
}

// ─── Departments ─────────────────────────────────────────────────────────────

export function useListDepartments() {
  return useQuery({
    queryKey: queryKeys.org.departments,
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: DepartmentFull[] }>('/org/departments')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiClient.post('/org/departments', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Department created')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create department'),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      apiClient.patch(`/org/departments/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Department updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update department'),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/departments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Department deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete department'),
  })
}

// ─── Own Assets ──────────────────────────────────────────────────────────────

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, ...data }: {
      deptId: string; name: string; assetType: string; description?: string
      hostingLocation: string; criticality: string; internetFacing: boolean; status: string
    }) => apiClient.post(`/org/departments/${deptId}/assets`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Asset added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add asset'),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [k: string]: unknown }) =>
      apiClient.patch(`/org/assets/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Asset updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update asset'),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Asset removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete asset'),
  })
}

// ─── PII Records ─────────────────────────────────────────────────────────────

export function useCreatePiiRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId, ...data }: { assetId: string; [k: string]: unknown }) =>
      apiClient.post(`/org/assets/${assetId}/pii-records`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('PII record added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add PII record'),
  })
}

export function useUpdatePiiRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; categories?: string[]; sensitivity?: string; purpose?: string; legalBasis?: string; retention?: string; deletionMechanism?: string; volume?: string | number; crossBorderTransfer?: boolean; crossBorderDestination?: string; principalType?: string; sharedWithThirdParties?: boolean; }) => {
      const { id, ...rest } = data;
      return apiClient.patch(`/org/pii-records/${id}`, rest);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('PII record updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update PII record'),
  })
}

export function useDeletePiiRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/pii-records/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('PII record removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove PII record'),
  })
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

export function useCreateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deptId, ...data }: {
      deptId: string; name: string; supplierType: string; contactEmail: string
      countryOfOperation: string; dpaSigned: boolean; criticality: string; status: string
      contactName?: string
    }) => apiClient.post(`/org/departments/${deptId}/suppliers`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Supplier added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add supplier'),
  })
}

export function useUpdateSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; [k: string]: unknown }) =>
      apiClient.patch(`/org/suppliers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Supplier updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update supplier'),
  })
}

export function useDeleteSupplier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/suppliers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Supplier removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete supplier'),
  })
}

// ─── Supplier Assets ─────────────────────────────────────────────────────────

export function useCreateSupplierAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, ...data }: { supplierId: string; [k: string]: unknown }) =>
      apiClient.post(`/org/suppliers/${supplierId}/assets`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Supplier asset added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add supplier asset'),
  })
}

export function useDeleteSupplierAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/org/supplier-assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.org.departments })
      toast.success('Supplier asset removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove supplier asset'),
  })
}
