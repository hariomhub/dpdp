import React, { useState } from 'react';
import { TrendingDown, AlertTriangle, ChevronDown, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RISK_LEVEL = (score: number) => {
  if (score <= 20) return { label: 'Low', color: '#10B981', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' };
  if (score <= 40) return { label: 'Moderate', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  if (score <= 60) return { label: 'High', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  if (score <= 80) return { label: 'Critical', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  return { label: 'Severe', color: '#991B1B', bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-400' };
};

// Regulations — adding more here will automatically flow through heatmap, cards, trend
const REGS = [
  { key: 'DPDP', label: 'DPDP Act 2023', score: 67, trend: -3, color: '#EF4444' },
  { key: 'RBI', label: 'RBI Data Localisation', score: 48, trend: +5, color: '#10B981' },
  { key: 'SEBI', label: 'SEBI Cybersecurity', score: 31, trend: -1, color: '#8B5CF6' },
  { key: 'IT', label: 'IT Act / CERT-In', score: 42, trend: +2, color: '#F59E0B' },
];

// Departments — add more here and heatmap rows auto-grow; vertical scroll handles overflow
const DEPT_RISKS: Record<string, any>[] = [
  { dept: 'Engineering', DPDP: 81, RBI: 74, SEBI: 49, IT: 55 },
  { dept: 'Finance', DPDP: 72, RBI: 51, SEBI: 38, IT: 60 },
  { dept: 'HR', DPDP: 58, RBI: 40, SEBI: 22, IT: 30 },
  { dept: 'Marketing', DPDP: 35, RBI: 18, SEBI: 15, IT: 20 },
  { dept: 'Sales', DPDP: 44, RBI: 29, SEBI: 12, IT: 25 },
  { dept: 'Legal', DPDP: 28, RBI: 22, SEBI: 18, IT: 15 },
  { dept: 'Operations', DPDP: 50, RBI: 35, SEBI: 28, IT: 38 },
];

const TREND_DATA = [
  { date: 'Mar 27', DPDP: 74, RBI: 43, SEBI: 35, IT: 48 },
  { date: 'Apr 3', DPDP: 72, RBI: 45, SEBI: 33, IT: 46 },
  { date: 'Apr 10', DPDP: 70, RBI: 47, SEBI: 34, IT: 44 },
  { date: 'Apr 17', DPDP: 68, RBI: 46, SEBI: 32, IT: 43 },
  { date: 'Apr 24', DPDP: 67, RBI: 48, SEBI: 31, IT: 42 },
];

const TOP_DRIVERS = [
  { asset: 'Customer Database', dept: 'Engineering', reg: 'DPDP', nonCompliant: 14, overdue: 6, contribution: 23 },
  { asset: 'Payment Gateway', dept: 'Finance', reg: 'RBI', nonCompliant: 9, overdue: 4, contribution: 18 },
  { asset: 'Analytics Platform', dept: 'Marketing', reg: 'SEBI', nonCompliant: 6, overdue: 2, contribution: 12 },
  { asset: 'HR Management System', dept: 'HR', reg: 'DPDP', nonCompliant: 5, overdue: 1, contribution: 9 },
  { asset: 'CRM Portal', dept: 'Sales', reg: 'DPDP', nonCompliant: 4, overdue: 3, contribution: 7 },
];

const ASSET_REGISTER = [
  { asset: 'Customer Database', dept: 'Engineering', type: 'Database / Data Store', reg: 'DPDP', score: 72, nonCompliant: 14, openActions: 6, sensitivity: 'High' },
  { asset: 'Payment Gateway', dept: 'Finance', type: 'API / Integration Layer', reg: 'RBI', score: 81, nonCompliant: 9, openActions: 4, sensitivity: 'Critical' },
  { asset: 'AWS Cloud Infra', dept: 'Engineering', type: 'Third-Party (Cloud Hosted)', reg: 'DPDP', score: 58, nonCompliant: 7, openActions: 2, sensitivity: 'High' },
  { asset: 'CRM Portal', dept: 'Sales', type: 'SaaS (Third-Party Hosted)', reg: 'DPDP', score: 44, nonCompliant: 4, openActions: 3, sensitivity: 'Medium' },
  { asset: 'HR Management System', dept: 'HR', type: 'In-House (On-Premise)', reg: 'DPDP', score: 22, nonCompliant: 3, openActions: 1, sensitivity: 'Medium' },
  { asset: 'Consent Banner', dept: 'Marketing', type: 'SaaS (Third-Party Hosted)', reg: 'DPDP', score: 12, nonCompliant: 1, openActions: 0, sensitivity: 'Low' },
];

const OVERALL_SCORE = 67;

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

function AssetRiskTable() {
  const [page, setPage] = useState(0);
  const sorted = [...ASSET_REGISTER].sort((a, b) => b.score - a.score);
  const PAGE_SIZE = 20;
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[13px] font-bold text-slate-800">Asset Risk Register</p>
        <p className="text-[11px] text-slate-400">Sorted by risk score ↓ · {sorted.length} assets</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ minWidth: 720 }}>
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Asset', 'Dept', 'Type', 'Reg', 'Risk Score', 'Risk Level', 'Non-Compliant', 'Open Actions', 'PII Sensitivity'].map(h => (
              <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {pageData.map((row, i) => {
              const level = RISK_LEVEL(row.score);
              return (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{row.asset}</td>
                  <td className="px-3 py-2.5 text-slate-500">{row.dept}</td>
                  <td className="px-3 py-2.5 text-slate-500">{row.type}</td>
                  <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">{row.reg}</span></td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: level.color }}>{row.score}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded text-[10.5px] font-medium ${level.bg} ${level.text}`}>{level.label}</span></td>
                  <td className="px-3 py-2.5 text-slate-700">{row.nonCompliant}</td>
                  <td className="px-3 py-2.5"><span className={row.openActions > 0 ? 'text-amber-600 font-semibold' : 'text-slate-400'}>{row.openActions}</span></td>
                  <td className="px-3 py-2.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${row.sensitivity === 'Critical' ? 'bg-red-50 text-red-700' : row.sensitivity === 'High' ? 'bg-orange-50 text-orange-700' : row.sensitivity === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>{row.sensitivity}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[12px]">
          <span className="text-slate-400">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RiskPage() {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [trendRange, setTrendRange] = useState('30');
  const [drillCell, setDrillCell] = useState<{ dept: string; reg: string } | null>(null);
  const toggleDept = (dept: string) => setExpandedDepts(p => { const n = new Set(p); n.has(dept) ? n.delete(dept) : n.add(dept); return n; });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Risk Analysis</h1>
          <p className="text-[12px] text-slate-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> Last updated 2 hours ago</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md">Risk Level:</div>
          {[['Low', '#10B981'], ['Moderate', '#F59E0B'], ['High', '#F97316'], ['Critical', '#EF4444'], ['Severe', '#991B1B']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span>{l}</span></div>
          ))}
        </div>
      </div>

      {/* Section 1 — Risk Overview: gauge + regulation cards */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-start gap-8 flex-wrap">
          <div className="flex flex-col items-center flex-shrink-0">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Overall Risk Score</p>
            <RiskGauge score={OVERALL_SCORE} size="lg" />
            <p className="text-[11px] text-slate-400 mt-1">Score: {OVERALL_SCORE} — {RISK_LEVEL(OVERALL_SCORE).label}</p>
          </div>
          {/* Flex-wrap so any number of regulation cards wraps gracefully */}
          <div className="flex-1 flex flex-wrap gap-3 min-w-0">
            {REGS.map(reg => {
              const level = RISK_LEVEL(reg.score);
              return (
                <div key={reg.key} className={`p-3 rounded-lg border flex-shrink-0 min-w-[160px] ${level.bg} ${level.border}`}>
                  <p className="text-[10.5px] font-semibold text-slate-500 mb-2">{reg.label}</p>
                  <RiskGauge score={reg.score} size="sm" />
                  <div className={`flex items-center justify-center gap-1 mt-1 text-[10.5px] font-medium ${reg.trend < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    <TrendingDown className={`w-3 h-3 ${reg.trend > 0 ? 'rotate-180' : ''}`} />
                    {Math.abs(reg.trend)} vs last week
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2 — Risk Heatmap: sticky first column, scrollable horizontally */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-bold text-slate-800">Risk Heatmap</p>
          <p className="text-[11px] text-slate-400">Click any cell to drill down · Scroll horizontally for all regulations · Department column stays pinned</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: `${REGS.length * 170 + 160}px` }}>
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-2 text-slate-500 font-medium bg-white" style={{ minWidth: 140, position: 'sticky', left: 0, zIndex: 2 }}>Department</th>
                {REGS.map(r => <th key={r.key} className="px-3 py-2 text-slate-500 font-medium text-center" style={{ minWidth: 170 }}>{r.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {DEPT_RISKS.map(row => (
                <tr key={row.dept} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold text-slate-800 bg-white" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{row.dept}</td>
                  {REGS.map(reg => {
                    const score = row[reg.key] ?? 0;
                    const level = RISK_LEVEL(score);
                    const isSelected = drillCell?.dept === row.dept && drillCell?.reg === reg.key;
                    return (
                      <td key={reg.key} className="px-3 py-2 text-center">
                        <button onClick={() => setDrillCell(isSelected ? null : { dept: row.dept, reg: reg.key })}
                          className={`w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition-all ${level.bg} ${level.text} ${isSelected ? `ring-2 ring-offset-1 ring-[${level.color}]` : 'hover:opacity-80'}`}>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: level.color }} />
                          {score} — {level.label}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {drillCell && (
            <div className="m-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-[12.5px] font-semibold text-slate-800 mb-2">{drillCell.dept} · {REGS.find(r => r.key === drillCell.reg)?.label} — Risk Drivers</p>
              <div className="grid grid-cols-3 gap-3 text-[11.5px]">
                {[['Non-compliant controls', '8'], ['Open actions', '4'], ['Overdue actions', '2'], ['Missing evidence', '3'], ['PII sensitivity', 'High'], ['Assets at risk', '2']].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span></div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 3 — Department Risk Breakdown: dynamic height, scrolls with page */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-bold text-slate-800">Department Risk Breakdown</p>
          <p className="text-[11px] text-slate-400">Sorted by highest risk score · Click to expand</p>
        </div>
        <div className="p-4 space-y-2">
          {[...DEPT_RISKS].sort((a, b) => {
            const aMax = Math.max(...REGS.map(r => a[r.key] ?? 0));
            const bMax = Math.max(...REGS.map(r => b[r.key] ?? 0));
            return bMax - aMax;
          }).map(row => {
            const maxScore = Math.max(...REGS.map(r => row[r.key] ?? 0));
            const level = RISK_LEVEL(maxScore);
            const expanded = expandedDepts.has(row.dept);
            return (
              <div key={row.dept}>
                <button onClick={() => toggleDept(row.dept)} className="w-full flex items-center gap-3 py-1.5 hover:bg-slate-50 rounded-lg px-2 transition-colors">
                  {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                  <span className="text-[12.5px] font-semibold text-slate-800 w-24 text-left flex-shrink-0">{row.dept}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${maxScore}%`, background: level.color }} />
                  </div>
                  <span className="text-[12px] font-bold w-8 text-right flex-shrink-0" style={{ color: level.color }}>{maxScore}</span>
                  <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded w-20 text-center flex-shrink-0 ${level.bg} ${level.text}`}>{level.label}</span>
                </button>
                {expanded && (
                  <div className="ml-10 mt-1 mb-2 p-3 bg-slate-50 rounded-lg space-y-2">
                    {REGS.map(reg => {
                      const s = row[reg.key] ?? 0;
                      const rl = RISK_LEVEL(s);
                      return (
                        <div key={reg.key} className="flex items-center gap-3 text-[11.5px]">
                          <span className="text-slate-500 w-40 truncate flex-shrink-0">{reg.label}</span>
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${s}%`, background: rl.color }} />
                          </div>
                          <span className="font-semibold w-8 text-right flex-shrink-0" style={{ color: rl.color }}>{s}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${rl.bg} ${rl.text}`}>{rl.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4 — Asset Risk Register */}
      <AssetRiskTable />

      {/* Section 5 — Risk Trend: lines generated dynamically from REGS */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] font-bold text-slate-800">Risk Score Trend</p>
            <p className="text-[11px] text-slate-400">One line per regulation</p>
          </div>
          <div className="flex gap-1.5">
            {['30', '90', '365'].map(d => (
              <button key={d} onClick={() => setTrendRange(d)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${trendRange === d ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-500 hover:border-blue-300'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={TREND_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            {REGS.map(reg => (
              <Line key={reg.key} type="monotone" dataKey={reg.key} stroke={reg.color} strokeWidth={2} dot={{ r: 3 }} name={reg.label} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Section 6 — Top Risk Drivers */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-bold text-slate-800">Top Risk Drivers</p>
          <p className="text-[11px] text-slate-400">Ranked by contribution to overall org risk score</p>
        </div>
        <div className="divide-y divide-slate-50">
          {TOP_DRIVERS.map((d, i) => {
            const level = RISK_LEVEL(d.contribution * 3.5);
            return (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: level.color }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[12.5px] font-semibold text-slate-800">{d.asset}</p>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-medium">{d.dept}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded font-medium">{d.reg}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{d.nonCompliant} non-compliant controls · {d.overdue} overdue actions</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-bold text-red-600">{d.contribution}%</p>
                  <p className="text-[10px] text-slate-400">Risk contribution</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors flex-shrink-0">
                  View Asset <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}