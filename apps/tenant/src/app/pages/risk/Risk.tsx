import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, ChevronRight, ArrowRight, Info } from 'lucide-react';
import { useRiskAnalysis, type RiskFactors, type AssetRiskRow } from '../../../hooks/useRisk';

const RISK_LEVEL = (score: number) => {
  if (score <= 20) return { label: 'Low', color: '#10B981', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  if (score <= 40) return { label: 'Moderate', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  if (score <= 60) return { label: 'High', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  if (score <= 80) return { label: 'Critical', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  return { label: 'Severe', color: '#991B1B', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-400' };
};

const SENS_LABEL: Record<string, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

function RiskGauge({ score, size = 'lg' }: { score: number; size?: 'lg' | 'sm' }) {
  const level = RISK_LEVEL(score);
  const pct = score / 100;
  const r = size === 'lg' ? 54 : 36;
  const cx = size === 'lg' ? 70 : 46;
  const cy = size === 'lg' ? 70 : 46;
  const circumference = Math.PI * r;
  const strokeDash = circumference * pct;
  return (
    <div className="flex flex-col items-center">
      <svg width={cx * 2} height={cy + (size === 'lg' ? 20 : 14)} className="overflow-visible">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth={size === 'lg' ? 10 : 7} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={level.color} strokeWidth={size === 'lg' ? 10 : 7}
          strokeDasharray={`${strokeDash} ${circumference}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x={cx} y={cy - (size === 'lg' ? 8 : 4)} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 28 : 18} fontWeight="bold">{score}</text>
        <text x={cx} y={cy + (size === 'lg' ? 14 : 10)} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 12 : 9} fontWeight="600">{level.label}</text>
      </svg>
    </div>
  );
}

function FactorsBreakdown({ factors }: { factors: RiskFactors }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-[13.5px]">
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

function AssetRiskTable({ rows }: { rows: AssetRiskRow[] }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const pageData = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[15px] font-bold text-slate-800">Asset Risk Register</p>
        <p className="text-[13px] text-slate-400">Sorted by risk score ↓ · {rows.length} assets</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]" style={{ minWidth: 720 }}>
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Asset', 'Dept', 'Type', 'Risk Score', 'Risk Level', 'Rejected', 'Overdue', 'PII Sensitivity'].map(h => (
              <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pageData.map(row => {
              const level = RISK_LEVEL(row.score);
              return (
                <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/org/assets/${row.id}`)}>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{row.name}</td>
                  <td className="px-3 py-2.5 text-slate-500">{row.departmentName}</td>
                  <td className="px-3 py-2.5 text-slate-500">{row.assetType}</td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: level.color }}>{row.score}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[12.5px] font-medium ${level.bg} ${level.text}`}>{level.label}</span></td>
                  <td className="px-3 py-2.5 text-slate-700">{row.factors.nonCompliantTasks}</td>
                  <td className="px-3 py-2.5"><span className={row.factors.overdueTasks > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{row.factors.overdueTasks}</span></td>
                  <td className="px-3 py-2.5">
                    {row.piiSensitivity ? (
                      <span className={`px-1.5 py-0.5 rounded text-[12px] font-medium ${row.piiSensitivity === 'CRITICAL' ? 'bg-red-50 text-red-700' : row.piiSensitivity === 'HIGH' ? 'bg-orange-50 text-orange-700' : row.piiSensitivity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{SENS_LABEL[row.piiSensitivity] ?? row.piiSensitivity}</span>
                    ) : <span className="text-slate-300">None</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[14px]">
          <span className="text-slate-400">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, rows.length)} of {rows.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-[#D4AF37]/35 rounded hover:bg-slate-50 disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border border-[#D4AF37]/35 rounded hover:bg-slate-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RiskPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useRiskAnalysis();
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Risk Analysis</h1>
          <p className="text-[14px] text-slate-400 mt-0.5">Computed live from current assessments, tasks, and asset data</p>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md">Risk Level:</div>
          {[['Low', '#10B981'], ['Moderate', '#F59E0B'], ['High', '#F97316'], ['Critical', '#EF4444'], ['Severe', '#991B1B']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span>{l}</span></div>
          ))}
        </div>
      </div>

      {regulations.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-[#1A3E5C]/[0.06] border border-[#1A3E5C]/25 rounded-lg text-[14px] text-[#1A3E5C]">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          No assessments have been created yet, so there's no compliance task data to score. Risk scores below reflect only asset criticality and PII sensitivity until you create an assessment.
        </div>
      )}

      {/* Section 1 — Risk Overview: gauge + regulation cards */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-5">
        <div className="flex items-start gap-8 flex-wrap">
          <div className="flex flex-col items-center flex-shrink-0">
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Overall Risk Score</p>
            <RiskGauge score={overallScore} size="lg" />
            <p className="text-[13px] text-slate-400 mt-1">Score: {overallScore} — {RISK_LEVEL(overallScore).label}</p>
          </div>
          <div className="flex-1 flex flex-wrap gap-3 min-w-0">
            {regulationRisk.length === 0 ? (
              <p className="text-[14px] text-slate-400 italic self-center">No regulation-scoped data yet.</p>
            ) : regulationRisk.map(reg => {
              const level = RISK_LEVEL(reg.score);
              return (
                <div key={reg.id} className={`p-3 rounded-lg border flex-shrink-0 min-w-[160px] ${level.bg} ${level.border}`}>
                  <p className="text-[12.5px] font-semibold text-slate-500 mb-2">{reg.label}</p>
                  <RiskGauge score={reg.score} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2 — Risk Heatmap */}
      {heatmap.length > 0 && regulations.length > 0 && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[15px] font-bold text-slate-800">Risk Heatmap</p>
            <p className="text-[13px] text-slate-400">Click any cell to drill down · Scroll horizontally for all regulations · Department column stays pinned</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]" style={{ minWidth: `${regulations.length * 170 + 160}px` }}>
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-3 py-2 text-slate-500 font-medium bg-white" style={{ minWidth: 140, position: 'sticky', left: 0, zIndex: 2 }}>Department</th>
                  {regulations.map(r => <th key={r.id} className="px-3 py-2 text-slate-500 font-medium text-center" style={{ minWidth: 170 }}>{r.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => (
                  <tr key={row.departmentId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800 bg-white" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{row.departmentName}</td>
                    {row.cells.map(cell => {
                      const level = RISK_LEVEL(cell.score);
                      const isSelected = drillCell?.deptId === row.departmentId && drillCell?.regId === cell.regulationId;
                      return (
                        <td key={cell.regulationId} className="px-3 py-2 text-center">
                          {cell.hasData ? (
                            <button onClick={() => setDrillCell(isSelected ? null : { deptId: row.departmentId, regId: cell.regulationId })}
                              className={`w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[13.5px] font-semibold transition-all ${level.bg} ${level.text} ${isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}`}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: level.color }} />
                              {cell.score} — {level.label}
                            </button>
                          ) : <span className="text-[13px] text-slate-300">No tasks</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {drillCellData && drillDept && (
              <div className="m-4 p-3 bg-slate-50 border border-[#D4AF37]/35 rounded-lg">
                <p className="text-[14.5px] font-semibold text-slate-800 mb-2">{drillDept.name} · {drillCellData.regulationLabel} — Risk Drivers</p>
                <FactorsBreakdown factors={drillCellData.factors} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3 — Department Risk Breakdown */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[15px] font-bold text-slate-800">Department Risk Breakdown</p>
          <p className="text-[13px] text-slate-400">Sorted by highest risk score · Click to expand</p>
        </div>
        {departmentRisk.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-[14px]">No departments registered yet.</div>
        ) : (
          <div className="p-4 space-y-2">
            {departmentRisk.map(dept => {
              const level = RISK_LEVEL(dept.score);
              const expanded = expandedDepts.has(dept.id);
              return (
                <div key={dept.id}>
                  <button onClick={() => toggleDept(dept.id)} className="w-full flex items-center gap-3 py-1.5 hover:bg-slate-50 rounded-lg px-2 transition-colors">
                    {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                    <span className="text-[14.5px] font-semibold text-slate-800 w-24 text-left flex-shrink-0 truncate">{dept.name}</span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${dept.score}%`, background: level.color }} />
                    </div>
                    <span className="text-[14px] font-bold w-8 text-right flex-shrink-0" style={{ color: level.color }}>{dept.score}</span>
                    <span className={`text-[12.5px] font-semibold px-2 py-0.5 rounded w-20 text-center flex-shrink-0 ${level.bg} ${level.text}`}>{level.label}</span>
                  </button>
                  {expanded && (
                    <div className="ml-10 mt-1 mb-2 p-3 bg-slate-50 rounded-lg">
                      <FactorsBreakdown factors={dept.factors} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 4 — Asset Risk Register */}
      <AssetRiskTable rows={assetRegister} />

      {/* Section 5 — Trend (deferred: needs historical snapshots) */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[14.5px] font-semibold text-slate-700">Risk trend over time isn't available yet</p>
          <p className="text-[13.5px] text-slate-400 mt-0.5">All scores above are computed live from current data. A daily scoring history would be needed to show trend charts — that's a planned follow-up, not built yet.</p>
        </div>
      </div>

      {/* Section 6 — Top Risk Drivers */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[15px] font-bold text-slate-800">Top Risk Drivers</p>
          <p className="text-[13px] text-slate-400">Highest-scoring assets with active compliance tasks</p>
        </div>
        {topDrivers.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-[14px]">No assets with compliance tasks yet.</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {topDrivers.map((d, i) => {
              const level = RISK_LEVEL(d.contribution * 3.5);
              return (
                <div key={d.assetId} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0" style={{ background: level.color }}>{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[14.5px] font-semibold text-slate-800">{d.assetName}</p>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[12px] rounded font-medium">{d.departmentName}</span>
                    </div>
                    <p className="text-[13px] text-slate-400">{d.nonCompliant} rejected tasks · {d.overdue} overdue tasks</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-bold text-red-600">{d.contribution}%</p>
                    <p className="text-[12px] text-slate-400">Risk contribution</p>
                  </div>
                  <button onClick={() => navigate(`/org/assets/${d.assetId}`)} className="flex items-center gap-1.5 px-3 py-1.5 text-[13.5px] font-medium border border-[#D4AF37]/35 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors flex-shrink-0">
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
