import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronRight, ArrowRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRiskAnalysis, useRiskHistory, type RiskFactors, type AssetRiskRow, type RiskAnalysis, type RiskHistory } from '../../../hooks/useRisk';
import { Sparkline } from '../../components/shared/Sparkline';
import { computeDelta } from '../../components/shared/trend';

// Distinct categorical colors for a multi-line trend chart — these identify
// different departments/regulations as series, not risk-level severity, so
// intentionally NOT the RISK_LEVEL color scale (which would misleadingly
// suggest each line's color reflects how risky it is rather than which
// entity it is).
const CATEGORY_COLORS = ['#1A3E5C', '#D4AF37', '#0891B2', '#7C3AED', '#DB2777', '#059669'];

const RISK_LEVEL = (score: number) => {
  if (score <= 20) return { label: 'Low', color: '#10B981', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  if (score <= 40) return { label: 'Moderate', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  if (score <= 60) return { label: 'High', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  if (score <= 80) return { label: 'Critical', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  return { label: 'Severe', color: '#991B1B', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-400' };
};

const SENS_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

type InsightSeverity = 'critical' | 'warning' | 'positive' | 'info';
interface RiskInsight { severity: InsightSeverity; text: string }
const INSIGHT_ORDER: Record<InsightSeverity, number> = { critical: 0, warning: 1, positive: 2, info: 3 };
const INSIGHT_STYLE: Record<InsightSeverity, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: '#EF4444', bg: 'bg-red-50' },
  warning:  { icon: AlertTriangle, color: '#F59E0B', bg: 'bg-amber-50' },
  positive: { icon: CheckCircle2,  color: '#22C55E', bg: 'bg-green-50' },
  info:     { icon: Info,          color: '#3B82F6', bg: 'bg-blue-50' },
};

/**
 * Deterministic, rule-based — every line traces to a real field in the
 * already-fetched RiskAnalysis/RiskHistory data. No LLM call, no invented
 * numbers, same approach as the dashboards' Key Insights panel.
 */
function generateRiskInsights(data: RiskAnalysis, history?: RiskHistory): RiskInsight[] {
  const insights: RiskInsight[] = [];
  const { departmentRisk, regulationRisk, topDrivers } = data;

  const topDept = departmentRisk[0];
  if (topDept) {
    if (topDept.score > 40) {
      insights.push({
        severity: topDept.score > 60 ? 'critical' : 'warning',
        text: `${topDept.name} is the highest-risk department (${topDept.score}, ${RISK_LEVEL(topDept.score).label}) — driven by ${topDept.factors.nonCompliantTasks} rejected and ${topDept.factors.overdueTasks} overdue task${topDept.factors.overdueTasks !== 1 ? 's' : ''}.`,
      });
    } else if (departmentRisk.every(d => d.score <= 40)) {
      insights.push({ severity: 'positive', text: `No department is above the Moderate risk band — ${topDept.name} is the highest at ${topDept.score}.` });
    }
  }

  const emptyDepts = departmentRisk.filter(d => d.factors.totalTasks === 0);
  if (emptyDepts.length > 0) {
    insights.push({
      severity: 'info',
      text: `${emptyDepts.length} of ${departmentRisk.length} department${departmentRisk.length !== 1 ? 's' : ''} (${emptyDepts.map(d => d.name).join(', ')}) have no active compliance tasks yet — their scores reflect only asset criticality and PII sensitivity until work is assigned.`,
    });
  }

  if (regulationRisk.length > 1) {
    const topReg = regulationRisk[0];
    if (topReg.score > 40) {
      insights.push({ severity: topReg.score > 60 ? 'critical' : 'warning', text: `${topReg.label} carries the highest regulatory risk at ${topReg.score} (${RISK_LEVEL(topReg.score).label}).` });
    }
  }

  const driver = topDrivers[0];
  if (driver) {
    insights.push({
      severity: driver.contribution >= 50 ? 'critical' : 'warning',
      text: `${driver.assetName} (${driver.departmentName}) is your top risk driver, contributing ${driver.contribution}% of total risk exposure — ${driver.overdue} overdue task${driver.overdue !== 1 ? 's' : ''}.`,
    });
  }

  if (topDept && history) {
    const deptHistory = history.departments.find(d => d.id === topDept.id);
    const delta = deptHistory ? computeDelta(deptHistory.points.map(p => p.score)) : undefined;
    if (delta !== undefined && Math.abs(delta) >= 2) {
      insights.push(delta > 0
        ? { severity: 'warning', text: `${topDept.name}'s risk score increased ${delta} points over the last 7 days.` }
        : { severity: 'positive', text: `${topDept.name}'s risk score decreased ${Math.abs(delta)} points over the last 7 days.` });
    }
  }

  return insights.sort((a, b) => INSIGHT_ORDER[a.severity] - INSIGHT_ORDER[b.severity]).slice(0, 4);
}

function RiskInsightsPanel({ data, history }: { data: RiskAnalysis; history?: RiskHistory }) {
  const insights = generateRiskInsights(data, history);
  if (insights.length === 0) return null;
  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3">
      <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Key Insights</p>
      <div className="space-y-1.5">
        {insights.map((insight, i) => {
          const style = INSIGHT_STYLE[insight.severity];
          const Icon = style.icon;
          return (
            <div key={i} className={`flex items-start gap-2 rounded-md px-2.5 py-1.5 ${style.bg}`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: style.color }} />
              <p className="text-[13px] text-slate-700 leading-snug">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskGauge({ score, size = 'lg' }: { score: number; size?: 'lg' | 'sm' }) {
  const level = RISK_LEVEL(score);
  const pct = score / 100;
  const r = size === 'lg' ? 44 : 30;
  const cx = size === 'lg' ? 58 : 40;
  const cy = size === 'lg' ? 58 : 40;
  const circumference = Math.PI * r;
  const strokeDash = circumference * pct;
  return (
    <div className="flex flex-col items-center">
      <svg width={cx * 2} height={cy + (size === 'lg' ? 16 : 12)} className="overflow-visible">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth={size === 'lg' ? 8 : 6} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={level.color} strokeWidth={size === 'lg' ? 8 : 6}
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={cx} y={cy - (size === 'lg' ? 6 : 3)} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 22 : 15} fontWeight="bold">{score}</text>
        <text x={cx} y={cy + (size === 'lg' ? 11 : 8)} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 11 : 8} fontWeight="600">{level.label}</text>
      </svg>
    </div>
  );
}

function FactorsBreakdown({ factors }: { factors: RiskFactors }) {
  return (
    <div className="grid grid-cols-3 gap-2.5 text-[12.5px]">
      {[
        ['Total tasks', factors.totalTasks],
        ['Rejected (non-compliant)', factors.nonCompliantTasks],
        ['Overdue tasks', factors.overdueTasks],
        ['Avg. asset criticality', factors.avgCriticality],
        ['Avg. PII sensitivity', factors.avgPiiSensitivity],
        ['Cross-border transfer', factors.crossBorderTransfer ? 'Yes' : 'No'],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span></div>
      ))}
    </div>
  );
}

interface TrendEntity { id: string; label: string; points: { date: string; score: number }[] }

function RiskTrendChart({ departments, regulations }: { departments: TrendEntity[]; regulations: TrendEntity[] }) {
  const [view, setView] = useState<'department' | 'regulation'>('department');
  const entities = view === 'department' ? departments : regulations;

  // Cap at top 6 by current (latest) score, so the chart stays readable.
  const ranked = [...entities].sort((a, b) => (b.points[b.points.length - 1]?.score ?? 0) - (a.points[a.points.length - 1]?.score ?? 0));
  const shown = ranked.slice(0, 6);
  const truncated = ranked.length > 6;

  // Merge into one array of { date, [entityId]: score } rows for Recharts.
  const dates = Array.from(new Set(shown.flatMap(e => e.points.map(p => p.date)))).sort();
  const chartData = dates.map(date => {
    const row: Record<string, string | number> = { date };
    for (const e of shown) {
      const point = e.points.find(p => p.date === date);
      if (point) row[e.id] = point.score;
    }
    return row;
  });

  const hasData = shown.some(e => e.points.length >= 2);

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[14px] font-bold text-slate-800">Risk Trend</p>
          <p className="text-[12px] text-slate-400">
            {truncated ? `Top 6 of ${ranked.length} by current score` : 'Daily risk score history'}
          </p>
        </div>
        <div className="flex gap-1">
          {(['department', 'regulation'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 py-0.5 rounded text-[12.5px] font-medium transition-all ${view === v ? 'bg-[#1A3E5C] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              By {v === 'department' ? 'Department' : 'Regulation'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3">
        {!hasData ? (
          <div className="py-7 text-center flex flex-col items-center gap-2">
            <Info className="w-4 h-4 text-slate-400" />
            <p className="text-[13px] text-slate-400 max-w-sm">
              Trend data will appear here starting tomorrow — daily snapshots need at least two days of history to plot a line.
            </p>
          </div>
        ) : (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#D4AF37' }} />
                <Legend wrapperStyle={{ fontSize: 12.5 }} />
                {shown.map((e, i) => (
                  <Line key={e.id} type="monotone" dataKey={e.id} name={e.label} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function AssetRiskTable({ rows }: { rows: AssetRiskRow[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const pageData = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[14px] font-bold text-slate-800">Asset Risk Register</p>
        <p className="text-[12px] text-slate-400">Sorted by risk score ↓ · {rows.length} assets</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" style={{ minWidth: 720 }}>
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Asset', 'Dept', 'Type', 'Risk Score', 'Risk Level', 'Rejected', 'Overdue', 'PII Sensitivity'].map(h => (
              <th key={h} className="px-2.5 py-1.5 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pageData.map(row => {
              const level = RISK_LEVEL(row.score);
              return (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${row.id}`)}>
                  <td className="px-2.5 py-1.5 font-medium text-slate-800">{row.name}</td>
                  <td className="px-2.5 py-1.5 text-slate-500">{row.departmentName}</td>
                  <td className="px-2.5 py-1.5 text-slate-500">{row.assetType}</td>
                  <td className="px-2.5 py-1.5 font-bold" style={{ color: level.color }}>{row.score}</td>
                  <td className="px-2.5 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[11.5px] font-medium ${level.bg} ${level.text}`}>{level.label}</span></td>
                  <td className="px-2.5 py-1.5 text-slate-700">{row.factors.nonCompliantTasks}</td>
                  <td className="px-2.5 py-1.5"><span className={row.factors.overdueTasks > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{row.factors.overdueTasks}</span></td>
                  <td className="px-2.5 py-1.5">
                    {row.piiSensitivity ? (
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${row.piiSensitivity === 'CRITICAL' ? 'bg-red-50 text-red-700' : row.piiSensitivity === 'HIGH' ? 'bg-orange-50 text-orange-700' : row.piiSensitivity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{SENS_LABEL[row.piiSensitivity] ?? row.piiSensitivity}</span>
                    ) : <span className="text-slate-300">None</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-[13px]">
          <span className="text-slate-400">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2.5 py-0.5 border border-[#D4AF37]/35 rounded hover:bg-slate-50 disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2.5 py-0.5 border border-[#D4AF37]/35 rounded hover:bg-slate-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RiskPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRiskAnalysis();
  const { data: history } = useRiskHistory(30);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [drillCell, setDrillCell] = useState<{ deptId: string; regId: string } | null>(null);
  const toggleDept = (id: string) => setExpandedDepts(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (isLoading || !data) {
    return <div className="text-center py-16 text-slate-500">Computing risk analysis...</div>;
  }

  const { overallScore, regulationRisk, departmentRisk, heatmap, assetRegister, topDrivers, regulations } = data;
  const drillCellData = drillCell
    ? heatmap.find(r => r.departmentId === drillCell.deptId)?.cells.find(c => c.regulationId === drillCell.regId)
    : null;
  const drillDept = drillCell ? departmentRisk.find(d => d.id === drillCell.deptId) : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Risk Analysis</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Computed live from current assessments, tasks, and asset data</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded-md">Risk Level:</div>
          {[['Low', '#10B981'], ['Moderate', '#F59E0B'], ['High', '#F97316'], ['Critical', '#EF4444'], ['Severe', '#991B1B']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span>{l}</span></div>
          ))}
        </div>
      </div>

      {regulations.length === 0 && (
        <div className="flex items-start gap-2 p-2.5 bg-[#1A3E5C]/[0.06] border border-[#1A3E5C]/25 rounded-lg text-[13px] text-[#1A3E5C]">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          No assessments have been created yet, so there's no compliance task data to score. Risk scores below reflect only asset criticality and PII sensitivity until you create an assessment.
        </div>
      )}

      {/* Key Insights — the "so what" before the raw numbers */}
      <RiskInsightsPanel data={data} history={history} />

      {/* Section 1 — Risk Overview: gauge + regulation cards */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex flex-col items-center flex-shrink-0">
            <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Overall Risk Score</p>
            <RiskGauge score={overallScore} size="lg" />
            <p className="text-[12px] text-slate-400 mt-0.5">Score: {overallScore} — {RISK_LEVEL(overallScore).label}</p>
          </div>
          <div className="flex-1 flex flex-wrap gap-2.5 min-w-0">
            {regulationRisk.length === 0 ? (
              <p className="text-[13px] text-slate-400 italic self-center">No regulation-scoped data yet.</p>
            ) : regulationRisk.map(reg => {
              const level = RISK_LEVEL(reg.score);
              const regHistory = history?.regulations.find(r => r.id === reg.id)?.points.map(p => p.score);
              return (
                <div key={reg.id} className={`p-2.5 rounded-lg border flex-shrink-0 min-w-[140px] ${level.bg} ${level.border}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[11.5px] font-semibold text-slate-500">{reg.label}</p>
                    {regHistory && regHistory.length >= 2 && <Sparkline data={regHistory} color={level.color} width={40} height={16} />}
                  </div>
                  <RiskGauge score={reg.score} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2 — Risk Trend */}
      <RiskTrendChart
        departments={(history?.departments ?? []).map(d => ({ id: d.id, label: d.name, points: d.points }))}
        regulations={(history?.regulations ?? []).map(r => ({ id: r.id, label: r.label, points: r.points }))}
      />

      {/* Section 3 — Risk Heatmap */}
      {heatmap.length > 0 && regulations.length > 0 && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-[14px] font-bold text-slate-800">Risk Heatmap</p>
            <p className="text-[12px] text-slate-400">Click any cell to drill down · Scroll horizontally for all regulations · Department column stays pinned</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]" style={{ minWidth: `${regulations.length * 150 + 140}px` }}>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-2.5 py-1.5 text-slate-500 font-medium bg-white" style={{ minWidth: 120, position: 'sticky', left: 0, zIndex: 2 }}>Department</th>
                  {regulations.map(r => <th key={r.id} className="px-2.5 py-1.5 text-slate-500 font-medium text-center" style={{ minWidth: 150 }}>{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => (
                  <tr key={row.departmentId} className="border-t border-slate-100">
                    <td className="px-2.5 py-1.5 font-semibold text-slate-800 bg-white" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{row.departmentName}</td>
                    {row.cells.map(cell => {
                      const level = RISK_LEVEL(cell.score);
                      const isSelected = drillCell?.deptId === row.departmentId && drillCell?.regId === cell.regulationId;
                      return (
                        <td key={cell.regulationId} className="px-2.5 py-1.5 text-center">
                          {cell.hasData ? (
                            <button onClick={() => setDrillCell(isSelected ? null : { deptId: row.departmentId, regId: cell.regulationId })}
                              className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[12.5px] font-semibold transition-all ${level.bg} ${level.text} ${isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: level.color }} />
                              {cell.score} — {level.label}
                            </button>
                          ) : <span className="text-[12px] text-slate-300">No tasks</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {drillCellData && drillDept && (
              <div className="m-3 p-2.5 bg-slate-50 border border-[#D4AF37]/35 rounded-lg">
                <p className="text-[13.5px] font-semibold text-slate-800 mb-1.5">{drillDept.name} · {drillCellData.regulationLabel} — Risk Drivers</p>
                <FactorsBreakdown factors={drillCellData.factors} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 4 — Department Risk Breakdown */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Department Risk Breakdown</p>
          <p className="text-[12px] text-slate-400">Sorted by highest risk score · Click to expand</p>
        </div>
        {departmentRisk.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-[13px]">No departments registered yet.</div>
        ) : (
          <div className="p-3 space-y-1.5">
            {departmentRisk.map(dept => {
              const level = RISK_LEVEL(dept.score);
              const expanded = expandedDepts.has(dept.id);
              const deptHistory = history?.departments.find(d => d.id === dept.id)?.points.map(p => p.score);
              return (
                <div key={dept.id}>
                  <button onClick={() => toggleDept(dept.id)} className="w-full flex items-center gap-2.5 py-1 hover:bg-slate-50 rounded-lg px-1.5 transition-colors">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <span className="text-[13.5px] font-semibold text-slate-800 w-24 text-left flex-shrink-0 truncate">{dept.name}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${dept.score}%`, background: level.color }} />
                    </div>
                    {deptHistory && deptHistory.length >= 2 && <Sparkline data={deptHistory} color={level.color} width={40} height={16} />}
                    <span className="text-[13px] font-bold w-8 text-right flex-shrink-0" style={{ color: level.color }}>{dept.score}</span>
                    <span className={`text-[11.5px] font-semibold px-1.5 py-0.5 rounded w-20 text-center flex-shrink-0 ${level.bg} ${level.text}`}>{level.label}</span>
                  </button>
                  {expanded && (
                    <div className="ml-9 mt-1 mb-1.5 p-2.5 bg-slate-50 rounded-lg">
                      <FactorsBreakdown factors={dept.factors} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 5 — Asset Risk Register */}
      <AssetRiskTable rows={assetRegister} />

      {/* Section 6 — Top Risk Drivers */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">Top Risk Drivers</p>
          <p className="text-[12px] text-slate-400">Highest-scoring assets with active compliance tasks</p>
        </div>
        {topDrivers.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-[13px]">No assets with compliance tasks yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {topDrivers.map((d, i) => {
              const level = RISK_LEVEL(d.contribution * 3.5);
              return (
                <div key={d.assetId} className="flex items-center gap-3 px-3.5 py-2 hover:bg-slate-50">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11.5px] font-bold text-white flex-shrink-0" style={{ background: level.color }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[13.5px] font-semibold text-slate-800">{d.assetName}</p>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded font-medium">{d.departmentName}</span>
                    </div>
                    <p className="text-[12px] text-slate-400">{d.nonCompliant} rejected tasks · {d.overdue} overdue tasks</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-bold text-red-600">{d.contribution}%</p>
                    <p className="text-[11px] text-slate-400">Risk contribution</p>
                  </div>
                  <button onClick={() => navigate(`/org/assets/${d.assetId}`)} className="flex items-center gap-1.5 px-2.5 py-1 text-[12.5px] font-medium border border-[#D4AF37]/35 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors flex-shrink-0">
                    View Asset <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
