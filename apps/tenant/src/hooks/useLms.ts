import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

export interface LmsCourse {
  id: string; title: string; description: string
  category: string; difficulty: string
  estimatedHours: number; estimatedMinutes: number
  thumbnailUrl: string | null; status: string
  totalLessons: number; completedLessons: number; progress: number
  isEnrolled: boolean
  enrollment: { id: string; enrolledAt: string; isCompleted: boolean; completedAt: string | null } | null
  designations: any[]; sections: any[]
  certificateTemplate: any | null
}

export interface LmsDesignation {
  id: string; name: string; description: string | null; displayOrder: number
}

const KEYS = {
  courses:      ['lms', 'courses'] as const,
  certificates: ['lms', 'certificates'] as const,
  designations: ['lms', 'designations'] as const,
  roleDefaults: ['lms', 'role-defaults'] as const,
}

export function useLmsCourses() {
  return useQuery({
    queryKey: KEYS.courses,
    queryFn:  () => apiClient.get<{ success: boolean; data: { designation: string | null; mandatory: LmsCourse[]; recommended: LmsCourse[]; optional: LmsCourse[] } }>('/lms/courses').then(r => r.data),
    staleTime: 30_000,
  })
}

export function useLmsCertificates() {
  return useQuery({
    queryKey: KEYS.certificates,
    queryFn:  () => apiClient.get<{ success: boolean; data: any[] }>('/lms/certificates').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useLmsDesignations() {
  return useQuery({
    queryKey: KEYS.designations,
    queryFn:  () => apiClient.get<{ success: boolean; data: LmsDesignation[] }>('/lms/designations').then(r => r.data),
    staleTime: 300_000,
  })
}

export function useRoleDefaults() {
  return useQuery({
    queryKey: KEYS.roleDefaults,
    queryFn:  () => apiClient.get<{ success: boolean; data: any[] }>('/lms/role-defaults').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useEnrollCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => apiClient.post(`/lms/courses/${courseId}/enroll`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.courses }); toast.success('Enrolled successfully') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useMarkLessonComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) =>
      apiClient.patch(`/lms/enrollments/${enrollmentId}/lessons/${lessonId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.courses }),
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, quizId, answers }: { enrollmentId: string; quizId: string; answers: Record<string, string> }) =>
      apiClient.post(`/lms/enrollments/${enrollmentId}/quiz/${quizId}/submit`, { answers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.courses }),
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useSetUserDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, designation }: { userId: string; designation: string | null }) =>
      apiClient.patch(`/lms/users/${userId}/designation`, { designation }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: KEYS.courses })
      toast.success('Designation updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useBulkSetDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userIds, designation }: { userIds: string[]; designation: string }) =>
      apiClient.post('/lms/users/bulk-designation', { userIds, designation }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Designation assigned to ${res?.data?.updated ?? 0} users`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useSetRoleDefaults() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mappings: Array<{ portalRole: string; designation: string }>) =>
      apiClient.post('/lms/role-defaults', { mappings }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.roleDefaults }); toast.success('Role defaults saved') },
    onError:   (err: Error) => toast.error(err.message),
  })
}