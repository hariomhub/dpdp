import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'
import { queryKeys } from '../lib/query-keys'

export interface DashboardStats {
  hasData: boolean

  counts: {
    departments:       number
    assets:            number
    suppliers:         number
    activeAssessments: number
    openTasks:         number
    overdueTasks:      number
    myPendingTasks:    number
    myInProgressTasks: number
    mySubmittedTasks:  number
    myRejectedTasks:   number
    pendingReview:     number
    finalReview:       number
    pendingTasks:      number
    inProgressTasks:   number
    rejectedTasks:     number
    unassignedTasks:   number
  }

  complianceScore:   number | null
  riskScore:         number
  totalControls:     number
  compliantControls: number

  deptCompliance: Array<{
    name: string
    compliant: number; inProgress: number; nonCompliant: number; notStarted: number; total: number
  }>

  regulationCompliance: Array<{
    name: string
    compliant: number; inProgress: number; nonCompliant: number; notStarted: number; total: number
  }>

  assetHealth: {
    total: number
    fullyCompliant: number; partiallyCompliant: number; nonCompliant: number
    notStarted: number; noPiiRecords: number
  }

  riskiestAsset: { id: string; name: string; compliance: string } | null

  upcomingDeadlines: Array<{
    id: string; name: string; type: 'Assessment' | 'Task'; dueDate: string; daysLeft: number
  }>

  recentActivity: Array<{
    id: string; user: string; role: string; action: string
    details: string; module: string; time: string; createdAt: string
  }>

  assessmentProgress: Array<{
    id: string; name: string; pct: number; compliant: number; total: number
    daysLeft: number; regulations: string[]; assets: string[]
  }>

  myTasks: Array<{
    id: string; title: string; asset: string; status: string
    priority: string; dueDate: string; daysLeft: number
  }>

  reviewQueue: Array<{
    id: string; title: string; asset: string; submittedBy: string
    status: string; daysLeft: number
  }>

  finalSignOffQueue: Array<{
    id: string; title: string; asset: string; status: string; daysLeft: number
  }>

  orgName: string
  classification: string
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn:  () =>
      apiClient.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats')
        .then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
