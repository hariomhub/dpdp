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
  enrollment: {
    id: string; enrolledAt: string; isCompleted: boolean; completedAt: string | null
    lessonProgress: any[]; quizAttempts: any[]; assignmentSubmissions: any[]
  } | null
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

export interface MyPerformance {
  required: { completed: number; total: number }
  recommended: { completed: number; total: number }
  optional: { completed: number; total: number }
  certification: { completed: number; total: number }
  guide: { completed: number; total: number }
  certificatesEarned: number
  avgQuizScore: number
  totalQuizAttempts: number
  quizScoreHistory: Array<{ date: string; score: number; passed: boolean; quizTitle: string; courseTitle: string }>
  recentActivity: Array<{ type: 'quiz' | 'certificate'; date: string; title: string; courseTitle: string }>
}

export function useMyPerformance() {
  return useQuery({
    queryKey: ['lms', 'my-performance'],
    queryFn:  () => apiClient.get<{ success: boolean; data: MyPerformance }>('/lms/my-performance').then(r => r.data),
    staleTime: 30_000,
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

export function useUnenrollCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (courseId: string) => apiClient.delete(`/lms/courses/${courseId}/enroll`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.courses }); toast.success('Unenrolled from course') },
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

export interface QuizReviewQuestion {
  questionId: string; questionText: string; type: string; marks: number
  marksAwarded: number | null; isCorrect: boolean | null
  yourAnswerText: string | null; correctAnswerText: string | null; modelAnswer: string | null
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, quizId, answers }: { enrollmentId: string; quizId: string; answers: Record<string, string> }) =>
      apiClient.post<{ success: boolean; data: {
        score: number; passed: boolean; correct: number; total: number; review: QuizReviewQuestion[]
      } }>(`/lms/enrollments/${enrollmentId}/quiz/${quizId}/submit`, { answers }).then(r => r.data),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.courses })
      qc.invalidateQueries({ queryKey: KEYS.certificates })
      qc.invalidateQueries({ queryKey: ['lms', 'quiz-review', vars.enrollmentId, vars.quizId] })
      if (data.passed) toast.success(`Passed with ${data.score}%!`)
      else toast.error(`Scored ${data.score}% — below the pass threshold`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useQuizReview(enrollmentId: string | undefined, quizId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['lms', 'quiz-review', enrollmentId, quizId],
    queryFn:  () => apiClient.get<{ success: boolean; data: {
      score: number; passed: boolean; attemptNumber: number; completedAt: string | null; review: QuizReviewQuestion[]
    } }>(`/lms/enrollments/${enrollmentId}/quiz/${quizId}/review`).then(r => r.data),
    enabled: enabled && !!enrollmentId && !!quizId,
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ enrollmentId, lessonId, textAnswer, file }: {
      enrollmentId: string; lessonId: string; textAnswer?: string; file?: File
    }) => {
      const fd = new FormData()
      if (textAnswer) fd.append('textAnswer', textAnswer)
      if (file) fd.append('file', file)
      return apiClient.upload(`/lms/enrollments/${enrollmentId}/lessons/${lessonId}/submit`, fd)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.courses }); toast.success('Assignment submitted') },
    onError:   (err: Error) => toast.error(err.message),
  })
}

export function useCertificateByCode(code: string) {
  return useQuery({
    queryKey: ['lms', 'certificates', code],
    queryFn:  () => apiClient.get<{ success: boolean; data: any }>(`/lms/certificates/${code}`).then(r => r.data),
    enabled:  !!code,
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

export interface LmsCoverageSection {
  totalUsers: number
  usersWithMandatory: number
  orgCompletionRate: number
  perDesignation: Array<{ designation: string; userCount: number; mandatoryCourseCount: number; avgCompletionRate: number }>
  behindUsers: Array<{ userId: string; name: string; role: string; designation: string | null; mandatoryCount: number; completedCount: number; missingCourses: string[]; completionRate: number }>
}

export function useLmsCoverage() {
  return useQuery({
    queryKey: ['lms', 'coverage'],
    queryFn:  () => apiClient.get<{ success: boolean; data: {
      certification: LmsCoverageSection
      guides: LmsCoverageSection
    } }>('/lms/coverage').then(r => r.data),
    staleTime: 60_000,
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

export function useApplyRoleDefaultToExisting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (portalRole: string) =>
      apiClient.post<{ success: boolean; data: { usersUpdated: number }; message: string }>(`/lms/role-defaults/${portalRole}/apply-existing`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: KEYS.courses })
      toast.success(res.message)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}