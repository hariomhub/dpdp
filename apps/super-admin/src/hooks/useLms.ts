import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'

interface Course {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
  estimatedHours: number
  estimatedMinutes: number
  thumbnailUrl: string | null
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
  isDefault: boolean
  createdAt: string
  _count?: { courses: number }
}

export function useCourses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lms.courses(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
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

export function useQuestions(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.lms.questions(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
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