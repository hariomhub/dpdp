export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  onboarding: {
    status: ['onboarding', 'status'] as const,
  },
  entra: {
    status:   ['entra', 'status']   as const,
    groups:   ['entra', 'groups']   as const,
    mappings: ['entra', 'mappings'] as const,
  },
  dashboard: {
    stats: ['dashboard', 'stats'] as const,
  },
  org: {
    departments: ['org', 'departments'] as const,
    piiRecords:  (assetId: string) => ['org', 'pii-records', assetId] as const,
  },
  users: {
    list:        ['users', 'list']        as const,
    invitations: ['users', 'invitations'] as const,
  },
  assessments: {
    list:        ['assessments', 'list']         as const,
    detail:      (id: string) => ['assessments', 'detail', id] as const,
    regulations: ['assessments', 'regulations']  as const,
    assets:      ['assessments', 'assets']       as const,
  },
  auditLog: {
    list: (params: Record<string, unknown>) => ['audit-log', params] as const,
  },
}