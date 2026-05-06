export const queryKeys = {
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
  organizations: {
    all: (params?: Record<string, unknown>) =>
      ['organizations', params] as const,
    detail: (id: string) => ['organizations', id] as const,
  },
  regulations: {
    all: (params?: Record<string, unknown>) =>
      ['regulations', params] as const,
    detail: (id: string) => ['regulations', id] as const,
  },
  controls: {
    all: (params?: Record<string, unknown>) =>
      ['controls', params] as const,
    detail: (id: string) => ['controls', id] as const,
  },
  lms: {
    courses: (params?: Record<string, unknown>) =>
      ['lms', 'courses', params] as const,
    course: (id: string) => ['lms', 'courses', id] as const,
    questions: (params?: Record<string, unknown>) =>
      ['lms', 'questions', params] as const,
    certificateTemplates: ['lms', 'certificate-templates'] as const,
  },
  auditLogs: {
    all: (params?: Record<string, unknown>) =>
      ['audit-logs', params] as const,
  },
}