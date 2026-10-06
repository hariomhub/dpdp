import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'
import toast from 'react-hot-toast'

interface Course {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  estimatedHours: number
  estimatedMinutes: number
  thumbnailUrl: string | null
  thumbnailPreviewUrl?: string | null
  status: string
  certificateTemplateId: string | null
  createdAt: string
  _count?: { sections: number }
}

interface Question {
  id: string
  questionText: string
  type: string
  marks: number
  difficulty: string
  topic: string | null
  quizId: string | null
  options: Array<{
    id: string
    optionText: string
    isCorrect: boolean
    orderIndex: number
  }>
}

interface CertificateTemplate {
  id: string
  name: string
  layout: string
  titleText: string
  bodyText: string
  signatory?: string | null
  designation?: string | null
  bgColor?: string | null
  isDefault: boolean
  createdAt: string
  _count?: { courses: number }
}

export function useCourses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lms.courses(params),
    queryFn: () => {
      const cleanParams = Object.fromEntries(Object.entries(params || {}).filter(([_, v]) => v !== undefined));
      const searchParams = new URLSearchParams(cleanParams as Record<string, string>).toString()
      const endpoint = `/lms/courses${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<{
        success: boolean
        data: Course[]
        meta: Record<string, number>
      }>(endpoint)
    },
  })
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: queryKeys.lms.course(id),
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: Course }>(`/lms/courses/${id}`)
        .then(res => res.data),
    enabled: !!id,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Course>) =>
      apiClient.post<{ success: boolean; data: Course }>('/lms/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Course created successfully'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to create course'))
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Course> & { id: string }) =>
      apiClient.patch<{ success: boolean; data: Course }>(`/lms/courses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Course updated successfully'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to update course'))
    },
  })
}

export function useSyncCourseContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, data }: { courseId: string; data: any }) =>
      apiClient.put(`/lms/courses/${courseId}/sync-content`, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'course', vars.courseId] })
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to sync content'))
    },
  })
}

export function usePublishCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/lms/courses/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Course published'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to publish course'))
    },
  })
}

// Soft delete — hides the course from every tenant catalog immediately but
// keeps it (and all its enrollment/certificate history) intact and
// reversible. This is the primary "delete" action for any course that has
// ever been published.
export function useArchiveCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/lms/courses/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Course archived'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to archive course'))
    },
  })
}

// Hard delete — permanently removes the course and its content. The backend
// only allows this for DRAFT courses with zero tenant enrollments; anything
// that's ever been live should be archived instead, never deleted.
export function useDeleteCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/lms/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'courses'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Course deleted'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to delete course'))
    },
  })
}

export function useQuestions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lms.questions(params),
    queryFn: () => {
      const cleanParams = Object.fromEntries(Object.entries(params || {}).filter(([_, v]) => v !== undefined));
      const searchParams = new URLSearchParams(cleanParams as Record<string, string>).toString()
      const endpoint = `/lms/questions${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<{
        success: boolean
        data: Question[]
        meta: Record<string, number>
      }>(endpoint)
    },
  })
}

export function useCreateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Question> & { options?: Array<{ optionText: string; isCorrect: boolean; orderIndex: number }> }) =>
      apiClient.post<{ success: boolean; data: Question }>(
        '/lms/questions',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'questions'] })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Question saved to bank'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to save question'))
    },
  })
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Question> & { id: string }) =>
      apiClient.patch<{ success: boolean; data: Question }>(`/lms/questions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'questions'] })
      toast.success('Question updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update question'),
  })
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lms/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lms', 'questions'] })
      toast.success('Question deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete question'),
  })
}

export function useUploadLmsFile() {
  return useMutation({
    mutationFn: ({ file, folder }: { file: File; folder: 'videos' | 'reading' | 'thumbnails' | 'certificate-templates' }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      // fileUrl is the stable URL to persist (in videoUrl/readingContent/
      // thumbnailUrl); previewUrl is a short-lived signed URL — use it only
      // to render the file immediately in the builder, never save it.
      return apiClient
        .postFormData<{ success: boolean; data: { fileUrl: string; previewUrl: string; fileName: string; fileSize: number; mimeType: string } }>('/lms/upload', fd)
        .then(res => res.data)
    },
    onError: (err: Error) => toast.error(err.message || 'Upload failed'),
  })
}

export function useCertificateTemplates() {
  return useQuery({
    queryKey: queryKeys.lms.certificateTemplates,
    queryFn: () =>
      apiClient
        .get<{ success: boolean; data: CertificateTemplate[] }>(
          '/lms/certificate-templates'
        )
        .then(res => res.data),
  })
}

export function useCreateCertificateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CertificateTemplate>) =>
      apiClient.post<{ success: boolean; data: CertificateTemplate }>(
        '/lms/certificate-templates',
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lms.certificateTemplates,
      })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Certificate template created'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to create template'))
    },
  })
}

export function useUpdateCertificateTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CertificateTemplate> }) =>
      apiClient.patch<{ success: boolean; data: CertificateTemplate }>(
        `/lms/certificate-templates/${id}`,
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.lms.certificateTemplates,
      })
      import('react-hot-toast').then(({ default: toast }) => toast.success('Certificate template updated'))
    },
    onError: (err: Error) => {
      import('react-hot-toast').then(({ default: toast }) => toast.error(err.message || 'Failed to update template'))
    },
  })
}
// ─── Designation hooks ────────────────────────────────────────────────────────

export function useDesignations() {
  return useQuery({
    queryKey: ['lms', 'designations'],
    queryFn:  () => apiClient.get<{ success: boolean; data: any[] }>('/lms/designations').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useCreateDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; displayOrder?: number }) =>
      apiClient.post('/lms/designations', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'designations'] }); toast.success('Designation created') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string; displayOrder?: number; isActive?: boolean }) =>
      apiClient.patch(`/lms/designations/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'designations'] }); toast.success('Updated') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDesignation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/lms/designations/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lms', 'designations'] }); toast.success('Deleted') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useCourseDesignations(courseId: string) {
  return useQuery({
    queryKey: ['lms', 'courses', courseId, 'designations'],
    queryFn:  () => apiClient.get<{ success: boolean; data: any[] }>(`/lms/courses/${courseId}/designations`).then(r => r.data),
    enabled:  !!courseId,
  })
}

// ─── Analytics & Certificate Log ──────────────────────────────────────────────

export function useLmsAnalytics() {
  return useQuery({
    queryKey: ['lms', 'analytics'],
    queryFn:  () => apiClient.get<{ success: boolean; data: {
      totals: { enrollments: number; completions: number; avgQuizScore: number }
      trend: Array<{ month: string; enrollments: number }>
      perCourse: Array<{ courseId: string; title: string; duration: string; enrollments: number; completions: number }>
    } }>('/lms/analytics').then(r => r.data),
    staleTime: 60_000,
  })
}

export function useIssuedCertificates() {
  return useQuery({
    queryKey: ['lms', 'certificates', 'issued'],
    queryFn:  () => apiClient.get<{ success: boolean; data: Array<{
      id: string; certificateCode: string; learnerName: string; organizationName: string
      courseTitle: string; issuedAt: string; isRevoked: boolean
    }> }>('/lms/certificates/issued').then(r => r.data),
    staleTime: 30_000,
  })
}

export function useRevokeCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post(`/lms/certificates/${id}/revoke`, { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lms', 'certificates', 'issued'] })
      toast.success('Certificate revoked')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to revoke certificate'),
  })
}

export function useSetCourseDesignations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, targets }: { courseId: string; targets: Array<{ designationId: string; isMandatory: boolean }> }) =>
      apiClient.put(`/lms/courses/${courseId}/designations`, { targets }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lms', 'courses', vars.courseId, 'designations'] })
      toast.success('Course targeting saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

// ─── Course ↔ Portal Role targeting ───────────────────────────────────────────
// Independent axis from designations — targets a course at the platform's own
// permission role (CEO/CO/IT_ADMIN/INTERNAL_AUDITOR/EXTERNAL_AUDITOR).

export function useCoursePortalRoles(courseId: string) {
  return useQuery({
    queryKey: ['lms', 'courses', courseId, 'portal-roles'],
    queryFn:  () => apiClient.get<{ success: boolean; data: Array<{ courseId: string; portalRole: string; isMandatory: boolean }> }>(`/lms/courses/${courseId}/portal-roles`).then(r => r.data),
    enabled:  !!courseId,
  })
}

export function useSetCoursePortalRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, targets }: { courseId: string; targets: Array<{ portalRole: string; isMandatory: boolean }> }) =>
      apiClient.put(`/lms/courses/${courseId}/portal-roles`, { targets }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lms', 'courses', vars.courseId, 'portal-roles'] })
      toast.success('Course targeting saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}