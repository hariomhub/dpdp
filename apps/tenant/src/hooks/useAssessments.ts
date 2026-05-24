import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

export function useAvailableRegulations() {
  return useQuery({
    queryKey: ['assessments', 'regulations'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/assessments/regulations')
      return res.data
    }
  })
}

export function useAvailableAssets() {
  return useQuery({
    queryKey: ['assessments', 'assets'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/assessments/assets')
      return res.data
    }
  })
}

export function useAssessmentsList() {
  return useQuery({
    queryKey: ['assessments', 'list'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/assessments')
      return res.data
    }
  })
}

export function useAssessmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['assessments', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID provided')
      const res = await apiClient.get<any>(`/assessments/${id}`)
      return res.data
    },
    enabled: !!id
  })
}

export function useCreateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      departmentId: string;
      startDate: string;
      endDate: string;
      regulationId: string;
      assetIds: string[];
      exclusions?: { controlId: string, reason: string }[];
      taskAssignments?: Array<{ controlId: string; assetId: string; assigneeId: string | null }>;
    }) => {
      const res = await apiClient.post<any>('/assessments', data)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] }) // update counts
      toast.success('Assessment created successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to create assessment')
    }
  })
}

// ─── Dept IT Admins (for assessment task assignment) ─────────────────────────

export function useDeptItAdmins(deptId: string) {
  return useQuery({
    queryKey: ['assessments', 'it-admins', deptId],
    queryFn:  () =>
      apiClient
        .get<{ success: boolean; data: Array<{ id: string; name: string; email: string }> }>(
          `/assessments/it-admins?deptId=${deptId}`
        )
        .then(r => r.data),
    enabled:  !!deptId,
    staleTime: 60_000,
  })
}