import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'

interface DashboardStats {
  orgs: {
    total: number
    active: number
    onboarding: number
    suspended: number
    inactive: number
  }
  regulations: { total: number; active: number }
  controls: { total: number; published: number; draft: number }
  courses: { total: number; published: number; draft: number }
  recentActivity: Array<{
    id: string
    action: string
    targetType: string
    targetName: string
    createdAt: string
    superAdmin: { name: string } | null
    tenant: { name: string } | null
  }>
  recentOrgs: Array<{
    id: string
    name: string
    industry: string
    plan: string
    status: string
    createdAt: string
  }>
  onboardingTrend: Array<{ month: string; orgs: number }>
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () =>
      apiClient.get<{ success: boolean; data: DashboardStats }>(
        '/dashboard/stats'
      ).then(res => res.data),
  })
}