import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'

interface AuditLog {
  id: string
  action: string
  targetType: string
  targetId: string | null
  targetName: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
  superAdmin: { name: string; email: string } | null
  tenant: { name: string; tenantCode: string } | null
}

export function useAuditLogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.auditLogs.all(params),
    queryFn: () => {
      const searchParams = new URLSearchParams(
        params as Record<string, string>
      ).toString()
      const endpoint = `/audit-logs${searchParams ? `?${searchParams}` : ''}`
      return apiClient.get<{
        success: boolean
        data: AuditLog[]
        meta: Record<string, number>
      }>(endpoint)
    },
  })
}