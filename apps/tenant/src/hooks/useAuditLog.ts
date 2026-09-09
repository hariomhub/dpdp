import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'

export interface AuditLogRow {
  id: string; timestamp: string; user: string; email: string
  role: string | null; action: string; rawAction: string
  module: string; targetName: string; details: unknown; ipAddress: string | null
}

export interface AuditLogResult {
  rows: AuditLogRow[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export function useAuditLog(params: {
  page?: number; limit?: number; module?: string; action?: string; from?: string; to?: string; targetId?: string
}) {
  return useQuery({
    queryKey: queryKeys.auditLog.list(params as Record<string, unknown>),
    queryFn:  () => {
      const q = new URLSearchParams()
      if (params.page)   q.set('page',   String(params.page))
      if (params.limit)  q.set('limit',  String(params.limit))
      if (params.module && params.module !== 'All') q.set('module', params.module)
      if (params.action && params.action !== 'All') q.set('action', params.action)
      if (params.from)   q.set('from', params.from)
      if (params.to)     q.set('to',   params.to)
      if (params.targetId) q.set('targetId', params.targetId)
      return apiClient.get<{ success: boolean; data: AuditLogResult }>(`/audit-log?${q.toString()}`)
        .then(r => r.data)
    },
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 60_000,
  })
}
