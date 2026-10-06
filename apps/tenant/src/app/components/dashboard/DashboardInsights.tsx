import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useDashboardHistory, type DashboardStats } from '../../../hooks/useDashboard';
import { useLmsCoverage } from '../../../hooks/useLms';
import { useRiskAnalysis } from '../../../hooks/useRisk';
import { computeDelta } from '../shared/trend';

type Severity = 'critical' | 'warning' | 'positive' | 'info';

interface Insight {
  severity: Severity;
  text: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { critical: 0, warning: 1, positive: 2, info: 3 };

const SEVERITY_STYLE: Record<Severity, { icon: typeof AlertTriangle; iconColor: string; bg: string }> = {
  critical: { icon: AlertTriangle, iconColor: '#EF4444', bg: 'bg-red-50' },
  warning:  { icon: AlertTriangle, iconColor: '#F59E0B', bg: 'bg-amber-50' },
  positive: { icon: CheckCircle2,  iconColor: '#22C55E', bg: 'bg-green-50' },
  info:     { icon: Info,          iconColor: '#3B82F6', bg: 'bg-blue-50' },
};

/**
 * Deterministic, rule-based insight generation — every line is traceable to
 * a real field, nothing is invented or LLM-generated. Same philosophy as the
 * Audit Readiness heuristic: simple, transparent, and grounded in data that
 * already exists elsewhere on the dashboard/Risk Analysis page.
 */
function generateInsights(
  stats: DashboardStats,
  risk: ReturnType<typeof useRiskAnalysis>['data'],
  lms: ReturnType<typeof useLmsCoverage>['data'],
  complianceSeries: number[],
  riskSeries: number[],
): Insight[] {
  const insights: Insight[] = [];

  const c = stats.counts;
  if (c.overdueTasks > 0 && stats.overdueByPriority.CRITICAL > 0) {
    insights.push({
      severity: 'critical',
      text: `${stats.overdueByPriority.CRITICAL} critical-priority task${stats.overdueByPriority.CRITICAL !== 1 ? 's are' : ' is'} overdue — needs immediate attention.`,
    });
  }

  const riskiestDept = risk?.departmentRisk?.[0];
  if (riskiestDept && riskiestDept.score > 60) {
    insights.push({
      severity: riskiestDept.score > 80 ? 'critical' : 'warning',
      text: `${riskiestDept.name} has the highest risk exposure in the org (${riskiestDept.score}/100).`,
    });
  }

  const complianceDelta = computeDelta(complianceSeries);
  if (complianceDelta !== undefined && Math.abs(complianceDelta) >= 2) {
    insights.push(complianceDelta > 0
      ? { severity: 'positive', text: `Compliance score improved ${complianceDelta}% over the last 7 days.` }
      : { severity: 'warning', text: `Compliance score declined ${Math.abs(complianceDelta)}% over the last 7 days.` });
  }

  const riskDelta = computeDelta(riskSeries);
  if (riskDelta !== undefined && Math.abs(riskDelta) >= 2) {
    insights.push(riskDelta > 0
      ? { severity: 'warning', text: `Risk score increased ${riskDelta} points over the last 7 days.` }
      : { severity: 'positive', text: `Risk score decreased ${Math.abs(riskDelta)} points over the last 7 days.` });
  }

  const laggingReg = stats.regulationCompliance
    .filter(r => r.total > 0)
    .map(r => ({ ...r, pct: Math.round((r.compliant / r.total) * 100) }))
    .sort((a, b) => a.pct - b.pct)[0];
  if (laggingReg && laggingReg.pct < 50) {
    insights.push({ severity: 'warning', text: `${laggingReg.name} compliance is lagging at ${laggingReg.pct}%.` });
  }

  const laggingDesignation = (lms?.certification?.perDesignation ?? [])
    .filter(d => d.mandatoryCourseCount > 0)
    .sort((a, b) => a.avgCompletionRate - b.avgCompletionRate)[0];
  if (laggingDesignation && laggingDesignation.avgCompletionRate < 50) {
    insights.push({ severity: 'warning', text: `${laggingDesignation.designation} certification completion is only ${laggingDesignation.avgCompletionRate}%.` });
  }

  if (c.suppliersWithoutDpa > 0) {
    insights.push({ severity: 'warning', text: `${c.suppliersWithoutDpa} supplier${c.suppliersWithoutDpa !== 1 ? 's are' : ' is'} missing a signed DPA.` });
  }

  const healthyDepts = stats.deptCompliance.filter(d => d.compliant >= 80).length;
  if (healthyDepts > 0) {
    insights.push({ severity: 'positive', text: `${healthyDepts} of ${stats.deptCompliance.length} department${stats.deptCompliance.length !== 1 ? 's are' : ' is'} ≥80% compliant.` });
  }

  return insights.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function DashboardInsights({ stats, limit = 3 }: { stats: DashboardStats; limit?: number }) {
  const { data: history } = useDashboardHistory('30d');
  const { data: risk } = useRiskAnalysis();
  const { data: lms } = useLmsCoverage();

  const complianceSeries = (history ?? []).map(p => p.complianceScore).filter((v): v is number => v !== null);
  const riskSeries       = (history ?? []).map(p => p.riskScore).filter((v): v is number => v !== null);

  const insights = generateInsights(stats, risk, lms, complianceSeries, riskSeries).slice(0, limit);

  if (insights.length === 0) return null;

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3">
      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Insights</p>
      <div className="space-y-1.5">
        {insights.map((insight, i) => {
          const style = SEVERITY_STYLE[insight.severity];
          const Icon = style.icon;
          return (
            <div key={i} className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 ${style.bg}`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: style.iconColor }} />
              <p className="text-[13px] text-slate-700 leading-snug">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
