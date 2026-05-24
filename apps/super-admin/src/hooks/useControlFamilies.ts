import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

const KEYS = {
  all:     ['control-families'] as const,
  detail:  (id: string) => ['control-families', id] as const,
}

export interface ControlFamily {
  id: string; name: string; description: string | null
  icon: string | null; color: string | null; status: string
  _count: { controls: number }
  controls: Array<{
    control: { id: string; title: string; status: string; applicableTo: string }
  }>
}

export function useControlFamilies() {
  return useQuery({
    queryKey: KEYS.all,
    queryFn:  () => apiClient.get<{ success: boolean; data: ControlFamily[] }>('/control-families').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useControlFamilyDetail(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn:  () => apiClient.get<{ success: boolean; data: ControlFamily }>(`/control-families/${id}`).then(r => r.data),
    enabled:  !!id,
  })
}

export function useCreateControlFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string; color?: string }) =>
      apiClient.post('/control-families', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Control family created') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useUpdateControlFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; icon?: string; color?: string; status?: string }) =>
      apiClient.patch(`/control-families/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Updated') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useDeleteControlFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/control-families/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Deleted') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useAddControlsToFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyId, controlIds }: { familyId: string; controlIds: string[] }) =>
      apiClient.post(`/control-families/${familyId}/controls`, { controlIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Controls added to family') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useRemoveControlFromFamily() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ familyId, controlId }: { familyId: string; controlId: string }) =>
      apiClient.delete(`/control-families/${familyId}/controls/${controlId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }); toast.success('Control removed') },
    onError:   (err: Error) => toast.error(err.message),
  })
}