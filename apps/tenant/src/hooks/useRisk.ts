import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../lib/api-client'

export interface RiskFactors {
  totalTasks: number; nonCompliantTasks: number; overdueTasks: number
  avgCriticality: number; avgPiiSensitivity: number; crossBorderTransfer: boolean
}

export interface RegulationRisk { id: string; label: string; score: number; factors: RiskFactors }
export interface DepartmentRisk { id: string; name: string; score: number; factors: RiskFactors }

export interface HeatmapCell {
  regulationId: string; regulationLabel: string; score: number; hasData: boolean
  factors: RiskFactors; assetCount: number
}
export interface HeatmapRow { departmentId: string; departmentName: string; cells: HeatmapCell[] }

export interface AssetRiskRow {
  id: string; name: string; assetType: string; departmentName: string
  criticality: string; piiSensitivity: string | null; score: number; factors: RiskFactors
}

export interface TopDriver {
  assetId: string; assetName: string; departmentName: string
  nonCompliant: number; overdue: number; contribution: number
}

export interface RiskAnalysis {
  overallScore: number
  regulationRisk: RegulationRisk[]
  departmentRisk: DepartmentRisk[]
  heatmap: HeatmapRow[]
  assetRegister: AssetRiskRow[]
  topDrivers: TopDriver[]
  regulations: { id: string; label: string }[]
}

export function useRiskAnalysis() {
  return useQuery({
    queryKey: ['risk', 'analysis'],
    queryFn:  () => apiClient.get<{ success: boolean; data: RiskAnalysis }>('/risk').then(r => r.data),
    enabled:   !!apiClient.tokens.getAccess(),
    staleTime: 30_000,
  })
}
