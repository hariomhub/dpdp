import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowUpRight, ArrowDownRight, ArrowRight, CheckCircle2,
  AlertTriangle, Database, Users, Loader2, BarChart2, XCircle,
  Shield, Zap, Plus
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { useApp, ROLE_COLORS, ROLE_LABELS } from '../../context/AppContext';
import { useDashboardStats, type DashboardStats } from '../../../hooks/useDashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RISK_LEVEL = (s: number) =>
  s <= 20 ? { label: 'Low', color: '#22C55E' }
  : s <= 40 ? { label: 'Moderate', color: '#EAB308' }
  : s <= 60 ? { label: 'High', color: '#F97316' }
  : s <= 80 ? { label: 'Critical', color: '#EF4444' }
  : { label: 'Severe', color: '#7F1D1D' };

const ROLE_MAP: Record<string, string> = {
  CEO: 'ceo', CO: 'co', IT_ADMIN: 'it_admin',
  INTERNAL_AUDITOR: 'internal_auditor', EXTERNAL_AUDITOR: 'external_auditor',
};

// ─── Shared components ────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, trend, extraClass = '' }: {
  label: string; value: string | number; sub?: string; color: string; trend?: string; extraClass?: string;
}) {
  return (
    <div className={`bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden ${extraClass}`}>
      <div className="h-0.5 w-full" style={{ background: color }} />
      <div className="p-4">
        <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
        <p className="text-[36px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{value}</p>
        {sub && <p className="text-[13px] text-slate-400 mt-1">{sub}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-[12.5px] text-slate-400">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DonutChart({ data, label, total }: { data: { name: string; value: number; color: string }[]; label: string; total: number }) {
  const navigate = useNavigate();
  const pct = Math.round((data[0].value / total) * 100);
  return (
    <div className="flex-1 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/org/assessments')}>
      <p className="text-[15px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>{label}</p>
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 80, height: 80 }}>
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie data={data} cx={35} cy={35} innerRadius={26} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                {data.map((d: { name: string; value: number; color: string }, i: number) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[18px] font-bold text-slate-800" style={{ fontFamily: 'Cinzel, serif' }}>{pct}%</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.map((d: { name: string; value: number; color: string }) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[13px] text-slate-600">{d.value} {d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskGauge({ score, size = 'md' }: { score: number; size?: 'lg' | 'md' }) {
  const level = RISK_LEVEL(score);
  const r = size === 'lg' ? 60 : 44;
  const cx = size === 'lg' ? 78 : 58;
  const cy = size === 'lg' ? 78 : 58;
  const circ = Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={cx * 2} height={cy + 16} className="overflow-visible">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth={size === 'lg' ? 10 : 8} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={level.color} strokeWidth={size === 'lg' ? 10 : 8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 32 : 24} fontWeight="bold" fontFamily="Cinzel">{score}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize={12}>{level.label}</text>
      </svg>
    </div>
  );
}

function ActivityFeed({ items = [] }: { items?: DashboardStats['recentActivity'] }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0" style={{ background: `${ROLE_COLORS[item.role as keyof typeof ROLE_COLORS]}20`, color: ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] }}>
            {item.user.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-slate-700">
              <span className="font-semibold">{item.user}</span>
              <span className="text-slate-400 text-[12.5px] ml-1">({ROLE_LABELS[item.role as keyof typeof ROLE_LABELS]})</span>
              {' '}{item.action} <span className="font-medium text-slate-800">{item.details}</span>
            </p>
            <p className="text-[12.5px] text-slate-400 mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
      <button className="text-[13.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium">View Full Activity →</button>
    </div>
  );
}

function UpcomingDeadlines({ items = [] }: { items?: DashboardStats['upcomingDeadlines'] }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-[14px] text-slate-400 italic">No upcoming deadlines.</p>}
      {[...items].sort((a, b) => a.daysLeft - b.daysLeft).map((d, i) => {
        const overdue = d.daysLeft < 0;
        const urgent = d.daysLeft >= 0 && d.daysLeft < 7;
        const warn = d.daysLeft >= 7 && d.daysLeft <= 14;
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 border border-[#D4AF37]/20 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[14.5px] font-semibold text-slate-800 truncate">{d.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[12px] px-1.5 py-0.5 rounded font-semibold ${d.type === 'Assessment' ? 'bg-violet-50 text-violet-700' : 'bg-[#1A3E5C]/8 text-[#1A3E5C]'}`}>{d.type}</span>
                <span className="text-[12.5px] text-slate-400">{d.dueDate}</span>
              </div>
            </div>
            {overdue
              ? <span className="text-[12.5px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">OVERDUE</span>
              : <span className={`text-[12.5px] font-semibold flex-shrink-0 ${urgent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600'}`}>{d.daysLeft}d left</span>
            }
          </div>
        );
      })}
      <button onClick={() => navigate('/org/compliance-tasks')}
        className="w-full text-center text-[13.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium pt-1.5 border-t border-slate-100 mt-1">
        View All Upcoming Deadlines →
      </button>
    </div>
  );
}

// ─── CEO Dashboard ─────────────────────────────────────────────────────────────
function CEODashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const score = stats?.complianceScore ?? null;
  const risk  = stats?.riskScore ?? 0;
  const c     = stats?.counts;
  const depts = stats?.deptCompliance ?? [];
  const regs  = stats?.regulationCompliance ?? [];
  const ah    = stats?.assetHealth;
  const scoreDisplay = score !== null ? `${score}%` : 'N/A';

  return (
    <div className="space-y-5">
      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Overall Compliance Score" value={scoreDisplay} sub="across all active assessments" color="#22C55E" />
        <MetricCard label="Active Assessments" value={c?.activeAssessments ?? 0} sub={`${c?.activeAssessments ?? 0} active`} color="#3B82F6" />
        <MetricCard label="Open Compliance Tasks" value={c?.openTasks ?? 0} sub={`${c?.pendingTasks ?? 0} pending · ${c?.inProgressTasks ?? 0} in progress`} color="#F97316" />
        <MetricCard label="Overdue Actions" value={c?.overdueTasks ?? 0} sub="Require immediate attention" color="#EF4444" />
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(risk).color }} />
          <div className="p-4">
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</p>
            <RiskGauge score={risk} size="md" />
          </div>
        </div>
      </div>

      {/* Row 1b: Additional risk signals */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Overdue by Priority</p>
          {(c?.overdueTasks ?? 0) === 0 ? (
            <p className="text-[13.5px] text-slate-400">No overdue tasks</p>
          ) : (
            <div className="space-y-1">
              {stats?.overdueByPriority && (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).filter(p => stats.overdueByPriority[p] > 0).map(p => (
                <div key={p} className="flex items-center justify-between text-[13px]">
                  <span style={{ color: p === 'CRITICAL' ? '#EF4444' : p === 'HIGH' ? '#F97316' : p === 'MEDIUM' ? '#EAB308' : '#22C55E' }} className="font-medium">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                  <span className="font-semibold text-slate-700">{stats.overdueByPriority[p]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/org/assets')}>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Cross-Border PII Transfers</p>
          <p className="text-[26px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{c?.crossBorderPiiTransfers ?? 0}</p>
          <p className="text-[12.5px] text-slate-400 mt-0.5">PII records transferred outside India</p>
        </div>
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/org/assets')}>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Suppliers Without DPA</p>
          <p className={`text-[26px] font-bold ${(c?.suppliersWithoutDpa ?? 0) > 0 ? 'text-red-600' : 'text-slate-900'}`} style={{ fontFamily: 'Cinzel, serif' }}>{c?.suppliersWithoutDpa ?? 0}</p>
          <p className="text-[12.5px] text-slate-400 mt-0.5">of {c?.suppliers ?? 0} total suppliers</p>
        </div>
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/org/assets')}>
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Assets Without PII Review</p>
          <p className="text-[26px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{ah?.noPiiRecords ?? 0}</p>
          <p className="text-[12.5px] text-slate-400 mt-0.5">of {ah?.total ?? 0} registered assets</p>
        </div>
      </div>

      {/* Row 2: Compliance by Regulation */}
      <div>
        <p className="text-[16px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Compliance by Regulation</p>
        {regs.length > 0 ? (
          <div className="flex gap-3">
            {regs.slice(0, 3).map(r => {
              const data = [
                { name: 'Compliant', value: r.compliant, color: '#22C55E' },
                { name: 'In Progress', value: r.inProgress, color: '#3B82F6' },
                { name: 'Non-Compliant', value: r.nonCompliant, color: '#F87171' },
                { name: 'Not Started', value: r.notStarted, color: '#94A3B8' },
              ];
              return <DonutChart key={r.name} data={data} label={r.name} total={r.total || 1} />;
            })}
          </div>
        ) : (
          <p className="text-[14px] text-slate-400 italic p-4 bg-slate-50 rounded-lg">No assessments yet — create one to see regulation compliance.</p>
        )}
      </div>

      {/* Row 3: Dept Compliance + Risk Gauge */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Department Compliance Overview</p>
          {depts.length > 0 ? (
            <div className="space-y-2">
              {depts.sort((a, b) => a.compliant - b.compliant).map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <p className="text-[13.5px] text-slate-600 w-20 flex-shrink-0">{d.name}</p>
                  <div className="flex-1 h-5 bg-slate-100 rounded flex overflow-hidden cursor-pointer hover:opacity-80" onClick={() => navigate('/org/assets')}>
                    <div className="h-full" style={{ width: `${d.compliant}%`, background: '#22C55E' }} />
                    <div className="h-full" style={{ width: `${d.inProgress}%`, background: '#3B82F6' }} />
                    <div className="h-full" style={{ width: `${d.nonCompliant}%`, background: '#F87171' }} />
                    <div className="h-full" style={{ width: `${d.notStarted}%`, background: '#94A3B8' }} />
                  </div>
                  <span className="text-[13.5px] font-semibold text-slate-700 w-8 text-right flex-shrink-0">{d.compliant}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 italic">No assessment data yet.</p>
          )}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Risk Score</p>
          <div className="flex flex-col items-center py-2">
            <RiskGauge score={risk} size="lg" />
            <p className="text-[13px] text-slate-400 mt-2">Overall Risk: {RISK_LEVEL(risk).label}</p>
          </div>
          {stats?.riskiestAsset && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[13px] font-semibold text-slate-600 mb-1.5">Top Risk Driver</p>
              <p className="text-[14px] font-semibold text-slate-800">{stats.riskiestAsset.name}</p>
              <button className="text-[13.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium mt-1.5" onClick={() => navigate('/org/assets')}>View Asset →</button>
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Asset Health + Activity */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Asset Health Summary</p>
          <p className="text-[36px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>{ah?.total ?? 0}</p>
          {(ah?.total ?? 0) > 0 && (
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
              {ah && [{ w: ah.fullyCompliant, c: '#22C55E' }, { w: ah.partiallyCompliant, c: '#3B82F6' }, { w: ah.nonCompliant, c: '#F87171' }, { w: ah.notStarted, c: '#94A3B8' }].map((s, i) => (
                <div key={i} className="h-full" style={{ width: `${Math.round((s.w / (ah.total || 1)) * 100)}%`, background: s.c }} />
              ))}
            </div>
          )}
          <div className="space-y-1 text-[13px]">
            {ah && [['#22C55E', `${ah.fullyCompliant} Fully Compliant`], ['#3B82F6', `${ah.partiallyCompliant} Partially Compliant`], ['#F87171', `${ah.nonCompliant} Non-Compliant`], ['#94A3B8', `${ah.notStarted} Not Started`]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} /><span className="text-slate-600">{label}</span></div>
            ))}
          </div>
          {(ah?.noPiiRecords ?? 0) > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-[13px] text-amber-700">⚠ {ah!.noPiiRecords} asset(s) have no PII records. Controls cannot be accurately mapped.</p>
              <button className="text-[13px] text-amber-700 font-medium mt-0.5" onClick={() => navigate('/org/assets')}>Review Assets →</button>
            </div>
          )}
        </div>
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Recent Activity</p>
          <ActivityFeed items={stats?.recentActivity} />
        </div>
      </div>
      {/* Row 5: Deadlines */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
        <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Deadlines</p>
        <UpcomingDeadlines items={stats?.upcomingDeadlines} />
      </div>
    </div>
  );
}

// ─── CO Dashboard ─────────────────────────────────────────────────────────────
function CODashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const c = stats?.counts;
  const score = stats?.complianceScore ?? null;
  const nonCompliantAssets = stats?.assetHealth?.nonCompliant ?? 0;
  const hasAttentionItems = (c?.rejectedTasks ?? 0) > 0 || (c?.unassignedTasks ?? 0) > 0 || nonCompliantAssets > 0;
  return (
    <div className="space-y-5">
      {/* Attention Banner */}
      {hasAttentionItems && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-[15px] font-semibold text-amber-800">⚠ Requires Your Attention</p>
          </div>
          <div className="space-y-1.5">
            {(c?.rejectedTasks ?? 0) > 0 && (
              <div className="flex items-center justify-between text-[14px] text-amber-700">
                <span>{c!.rejectedTasks} task{c!.rejectedTasks !== 1 ? 's' : ''} rejected — awaiting decision</span>
                <button onClick={() => navigate('/org/compliance-tasks')} className="font-medium hover:text-amber-900">Review Now →</button>
              </div>
            )}
            {(c?.unassignedTasks ?? 0) > 0 && (
              <div className="flex items-center justify-between text-[14px] text-amber-700">
                <span>{c!.unassignedTasks} task{c!.unassignedTasks !== 1 ? 's are' : ' is'} unassigned</span>
                <button onClick={() => navigate('/org/compliance-tasks')} className="font-medium hover:text-amber-900">Assign Now →</button>
              </div>
            )}
            {nonCompliantAssets > 0 && (
              <div className="flex items-center justify-between text-[14px] text-amber-700">
                <span>{nonCompliantAssets} asset{nonCompliantAssets !== 1 ? 's have' : ' has'} non-compliant controls</span>
                <button onClick={() => navigate('/org/assets')} className="font-medium hover:text-amber-900">Review →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Same KPI row as CEO */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Overall Compliance Score" value={score !== null ? `${score}%` : 'N/A'} sub="across all active assessments" color="#22C55E" />
        <MetricCard label="Active Assessments" value={c?.activeAssessments ?? 0} sub={`${c?.activeAssessments ?? 0} active`} color="#3B82F6" />
        <MetricCard label="Open Compliance Tasks" value={c?.openTasks ?? 0} sub={`${c?.pendingTasks ?? 0} pending · ${c?.inProgressTasks ?? 0} in progress`} color="#F97316" />
        <MetricCard label="Overdue Actions" value={c?.overdueTasks ?? 0} sub="Require immediate attention" color="#EF4444" />
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(stats?.riskScore ?? 0).color }} />
          <div className="p-4"><p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</p><RiskGauge score={stats?.riskScore ?? 0} size="md" /></div>
        </div>
      </div>

      {/* Action Queue */}
      <div>
        <p className="text-[16px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>My Action Queue</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Rejected Tasks', value: c?.rejectedTasks ?? 0, color: '#EF4444', sub: 'Awaiting your decision', cta: 'Review →' },
            { label: 'Unassigned Tasks', value: c?.unassignedTasks ?? 0, color: '#F59E0B', sub: 'No IT Admin assigned', cta: 'Assign →' },
            { label: 'Under Review', value: c?.pendingReview ?? 0, color: '#3B82F6', sub: 'With Internal Auditor', cta: '' },
            { label: 'Pending Final Sign-Off', value: c?.finalReview ?? 0, color: '#8B5CF6', sub: 'With External Auditor', cta: '' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
              <div className="h-0.5 w-full" style={{ background: c.color }} />
              <div className="p-3.5">
                <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{c.label}</p>
                <p className="text-[32px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif', color: c.color }}>{c.value}</p>
                <p className="text-[13px] text-slate-400">{c.sub}</p>
                {c.cta && <button className="mt-1.5 text-[13px] font-semibold text-[#1A3E5C] hover:text-[#D4AF37]" onClick={() => navigate('/org/compliance-tasks')}>{c.cta}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment Progress */}
      <div>
        <p className="text-[16px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Active Assessment Progress</p>
        {(stats?.assessmentProgress ?? []).length === 0 ? (
          <p className="text-[14px] text-slate-400 italic p-4 bg-slate-50 rounded-lg">No active assessments right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stats!.assessmentProgress.map(a => (
              <div key={a.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[15px] font-bold text-slate-800">{a.name}</p>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {a.assets.map(as => <span key={as} className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{as}</span>)}
                    </div>
                  </div>
                  <span className={`text-[12.5px] font-bold px-2 py-0.5 rounded flex-shrink-0 ${a.daysLeft < 7 ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {a.daysLeft < 0 ? `${Math.abs(a.daysLeft)}d overdue` : `${a.daysLeft}d left`}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.pct}%` }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-slate-500">{a.compliant}/{a.total} controls compliant</p>
                  <button className="text-[13px] text-[#1A3E5C] font-medium hover:text-[#D4AF37]" onClick={() => navigate(`/org/assessments/${a.id}`)}>View →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gaps + Activity */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-slate-800">Controls With No Action Assigned</p>
            <span className="text-[13px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">{c?.unassignedTasks ?? 0} gaps</span>
          </div>
          {(c?.unassignedTasks ?? 0) === 0 ? (
            <div className="py-8 text-center"><p className="text-[14px] text-slate-400">No unassigned controls — great work!</p></div>
          ) : (
            <div className="py-4 px-4"><p className="text-[14px] text-slate-500">View compliance tasks to assign team members to open controls.</p><button onClick={() => navigate('/org/compliance-tasks')} className="mt-2 text-[14px] text-[#1A3E5C] font-medium">Go to Tasks →</button></div>
          )}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Deadlines</p>
          <UpcomingDeadlines items={stats?.upcomingDeadlines} />
        </div>
      </div>
    </div>
  );
}

// ─── IT Admin Dashboard ────────────────────────────────────────────────────────
function ITAdminDashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const c = stats?.counts;
  const tasks = stats?.myTasks ?? [];
  const PRIORITY_COLORS: Record<string, string> = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E', Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
  const STATUS_COLORS: Record<string, string> = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', REJECTED: '#EF4444', COMPLIANT: '#22C55E', EVIDENCE_SUBMITTED: '#06B6D4', Pending: '#F59E0B', 'In Progress': '#3B82F6', Rejected: '#EF4444' };
  const rejected = tasks.filter(t => t.status === 'REJECTED' || t.status === 'Rejected');

  return (
    <div className="space-y-5">
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Tasks" value={c?.myPendingTasks ?? 0} color="#F59E0B" sub="Assigned, not started" />
        <MetricCard label="In Progress" value={c?.myInProgressTasks ?? 0} color="#3B82F6" sub="Currently working on" />
        <MetricCard label="Submitted" value={c?.mySubmittedTasks ?? 0} color="#06B6D4" sub="Awaiting review" />
        <MetricCard label="Rejected" value={c?.myRejectedTasks ?? 0} color="#EF4444" sub="Need rework" />
      </div>

      {/* Rejected section */}
      {rejected.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-[14.5px] font-bold text-red-800">⚠ Requires Attention — Rejected Tasks</p>
          </div>
          {rejected.map(t => (
            <div key={t.id} className="p-3 bg-white border border-red-200 rounded-lg mt-2">
              <p className="text-[14.5px] font-semibold text-slate-800 mb-1">{t.title}</p>
              <p className="text-[13px] text-amber-700 bg-amber-50 p-2 rounded mb-2">IA Feedback: Evidence does not sufficiently demonstrate compliance. Please provide complete configuration export.</p>
              <button onClick={() => navigate('/org/compliance-tasks')} className="text-[13.5px] font-semibold text-[#1A3E5C] hover:text-[#D4AF37]">View Feedback and Resubmit →</button>
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Task List */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[15px] font-semibold text-slate-800">My Compliance Tasks</p>
          <div className="flex gap-1">
            {['All', 'Pending', 'In Progress', 'Rejected', 'Completed'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[13.5px] font-medium transition-all ${activeTab === tab ? 'bg-[#1A3E5C] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.filter(t => activeTab === 'All' || t.status === activeTab).map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[t.priority]}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-bold text-slate-800">{t.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Database className="w-3 h-3 text-slate-400" />
                  <p className="text-[13.5px] font-semibold text-slate-600">Work on: {t.asset}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[13px] text-slate-400">Due: {t.dueDate}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block text-[12.5px] px-2 py-0.5 rounded font-semibold mb-1" style={{ background: `${STATUS_COLORS[t.status]}20`, color: STATUS_COLORS[t.status] }}>{t.status}</span>
                <p className={`text-[12.5px] font-medium ${t.daysLeft < 0 ? 'text-red-600' : t.daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {t.daysLeft < 0 ? `${Math.abs(t.daysLeft)}d overdue` : `${t.daysLeft}d left`}
                </p>
              </div>
              <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1 px-2.5 py-1.5 text-[13.5px] font-medium border border-[#D4AF37]/35 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0">
                Open <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Due Dates — Next 7 Days</p>
          {(() => {
            const upcoming = tasks.filter(t => t.daysLeft >= 0 && t.daysLeft <= 7).sort((a, b) => a.daysLeft - b.daysLeft);
            if (upcoming.length === 0) return <p className="text-[14px] text-slate-400 italic">Nothing due in the next 7 days.</p>;
            const dayLabel = (d: number) => d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;
            const groups = new Map<number, typeof upcoming>();
            upcoming.forEach(t => groups.set(t.daysLeft, [...(groups.get(t.daysLeft) ?? []), t]));
            return [...groups.entries()].map(([days, items]) => (
              <div key={days} className="mb-3">
                <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-1">{dayLabel(days)}</p>
                {items.map(t => <p key={t.id} className="text-[14px] text-slate-700 pl-2 border-l-2 border-[#1A3E5C]/30">{t.title}</p>)}
              </div>
            ));
          })()}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Evidence Submission Status</p>
          {(stats?.myRecentEvidence ?? []).length === 0 ? (
            <p className="text-[14px] text-slate-400 italic">No evidence submitted yet.</p>
          ) : stats!.myRecentEvidence.map((ev, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1">
                <p className="text-[14px] font-medium text-slate-800 truncate">{ev.title}</p>
                <p className="text-[12.5px] text-slate-400">{ev.asset} · {ev.date}</p>
              </div>
              <span className={`text-[12px] px-2 py-0.5 rounded font-semibold flex-shrink-0 ${ev.status === 'Approved' ? 'bg-green-50 text-green-700' : ev.status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Internal Auditor Dashboard ────────────────────────────────────────────────
function IADashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const c = stats?.counts;
  const queue = stats?.reviewQueue ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Review" value={c?.pendingReview ?? 0} color="#3B82F6" sub="Evidence awaiting your review" />
        <MetricCard label="Reviewed Today" value={c?.myReviewedToday ?? 0} color="#22C55E" sub="Processed today" />
        <MetricCard label="Approved Total" value={c?.myApprovedTotal ?? 0} color="#10B981" sub="All-time, by you" />
        <MetricCard label="Rejected Total" value={c?.myRejectedTotal ?? 0} color="#EF4444" sub="Sent back for rework" />
      </div>

      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-slate-800">Evidence Awaiting Your Review</p>
          <p className="text-[13px] text-slate-400">Oldest first — review in order of submission</p>
        </div>
        {queue.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-[16px] font-semibold text-slate-600">All caught up!</p>
            <p className="text-[14px] text-slate-400">No evidence pending review.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {queue.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-bold text-slate-800 mb-0.5">{item.title}</p>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Database className="w-3 h-3 text-[#1A3E5C]/50" />
                    <span className="text-[13.5px] font-semibold text-[#1A3E5C]">{item.asset}</span>
                  </div>
                  <span className="text-[12.5px] text-slate-400">Submitted by: <span className="font-medium text-slate-600">{item.submittedBy}</span></span>
                </div>
                <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white bg-[#1A3E5C] rounded-lg hover:bg-[#15324a] transition-colors flex-shrink-0">
                  Review Evidence <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Active Assessment Progress</p>
          {(stats?.assessmentProgress ?? []).length === 0 ? (
            <p className="text-[14px] text-slate-400 italic">No active assessments right now.</p>
          ) : stats!.assessmentProgress.map(a => (
            <div key={a.id} className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[14px] font-semibold text-slate-800">{a.name}</p>
                <span className="text-[13px] text-slate-400">{a.compliant}/{a.total} controls</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${a.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>Recently Processed</p>
          {(stats?.myRecentlyReviewed ?? []).length === 0 ? (
            <p className="text-[14px] text-slate-400 italic">You haven't reviewed anything yet.</p>
          ) : stats!.myRecentlyReviewed.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
              {item.decision === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-slate-800 truncate">{item.title}</p>
                <p className="text-[12.5px] text-slate-400">{item.asset} · {item.time}</p>
              </div>
              <span className={`text-[12px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${item.decision === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{item.decision}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── External Auditor Dashboard ────────────────────────────────────────────────
function EADashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const c = stats?.counts;
  const queue = stats?.finalSignOffQueue ?? [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Pending Sign-Off" value={c?.finalReview ?? 0} sub="Internally approved, awaiting final sign-off" color="#F59E0B" />
        <MetricCard label="Signed Off (30d)" value={c?.signedOffLast30Days ?? 0} sub="Tenant-wide, last 30 days" color="#22C55E" />
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="h-0.5 bg-green-500 w-full" />
          <div className="p-4"><p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Overall Compliance Score</p><RiskGauge score={stats?.complianceScore ?? 0} size="md" /></div>
        </div>
      </div>

      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-slate-800">Items Ready for Final Sign-Off</p>
        </div>
        <div className="divide-y divide-slate-50">
          {queue.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-bold text-slate-800 mb-0.5">{item.title}</p>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Database className="w-3 h-3 text-[#1A3E5C]/50" />
                  <span className="text-[13.5px] font-semibold text-[#1A3E5C]">{item.asset}</span>
                </div>
              </div>
              <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0">
                Review &amp; Sign Off <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="py-12 text-center"><CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" /><p className="text-[15px] text-slate-500">No items pending your sign-off</p></div>
          )}
        </div>
      </div>

      {(stats?.recentSignOffs ?? []).length > 0 && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-[15px] font-semibold text-slate-800">Recent Sign-Offs</p>
          </div>
          <div className="divide-y divide-slate-50">
            {stats!.recentSignOffs.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-slate-800 truncate">{item.title}</p>
                  <p className="text-[12.5px] text-slate-400">{item.asset} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read-only compliance overview */}
      <div className="flex items-start gap-2 px-3 py-2 bg-slate-100 border border-[#D4AF37]/35 rounded-lg">
        <p className="text-[13px] text-slate-500">The compliance overview below is read-only for External Auditors.</p>
        <span className="text-[11.5px] border border-slate-300 text-slate-400 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">View Only</span>
      </div>
      <div className="flex gap-3">
        {stats?.regulationCompliance && stats.regulationCompliance.length > 0 ? stats.regulationCompliance.slice(0,3).map(r => {
          const d = [{ name:'Compliant',value:r.compliant,color:'#22C55E'},{name:'In Progress',value:r.inProgress,color:'#3B82F6'},{name:'Non-Compliant',value:r.nonCompliant,color:'#F87171'},{name:'Not Started',value:r.notStarted,color:'#94A3B8'}];
          return <DonutChart key={r.name} data={d} label={r.name} total={r.total||1} />;
        }) : <p className="text-[14px] text-slate-400 italic">No assessment data yet.</p>}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function DashSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-lg" />)}
      </div>
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 h-48 bg-slate-200 rounded-lg" />
        <div className="col-span-2 h-48 bg-slate-200 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Get-started CTA ─────────────────────────────────────────────────────────
function GetStartedCTA() {
  const navigate = useNavigate();
  return (
    <div className="p-6 bg-gradient-to-br from-[#1A3E5C]/5 to-[#D4AF37]/20 border border-[#D4AF37]/55 rounded-xl flex items-start gap-5">
      <div className="w-12 h-12 rounded-xl bg-[#1A3E5C] flex items-center justify-center flex-shrink-0">
        <Shield className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <p className="text-[17px] font-bold text-slate-900 mb-1">Create your first assessment to see compliance data</p>
        <p className="text-[14.5px] text-slate-500 leading-relaxed mb-4">Your organization is set up. Start an assessment to track compliance controls, assign tasks to your team, and measure progress across regulations.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/org/assessments/new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[14.5px] font-semibold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Create First Assessment
          </button>
          <button onClick={() => navigate('/org/assets')}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-[14.5px] font-medium rounded-lg hover:bg-white transition-colors">
            View Assets
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        {[
          { icon: BarChart2, label: 'Assessments', desc: 'Track compliance' },
          { icon: Users, label: 'Team', desc: 'Assign tasks' },
          { icon: Zap, label: 'Controls', desc: 'Map regulations' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="text-center p-3 bg-white rounded-lg border border-[#D4AF37]/45">
            <Icon className="w-5 h-5 text-[#1A3E5C] mx-auto mb-1" />
            <p className="text-[13px] font-bold text-slate-800">{label}</p>
            <p className="text-[12px] text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { role, orgName } = useApp();
  const { data: stats, isLoading } = useDashboardStats();

  const TITLES: Record<string, string> = {
    ceo: 'Executive Overview',
    co: 'Compliance Officer Dashboard',
    it_admin: 'My Tasks & Workload',
    internal_auditor: 'Audit Review Dashboard',
    external_auditor: 'Final Sign-Off Dashboard',
  };

  const ROLE_DASH: Record<string, React.ReactNode> = {
    ceo: <CEODashboard stats={stats} />,
    co: <CODashboard stats={stats} />,
    it_admin: <ITAdminDashboard stats={stats} />,
    internal_auditor: <IADashboard stats={stats} />,
    external_auditor: <EADashboard stats={stats} />,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-[#D4AF37]/30">
        <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-[28px] font-bold text-[#1A3E5C] tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>{TITLES[role]}</h1>
          <p className="text-[14px] text-slate-400 mt-1">
            {stats?.orgName || orgName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      {isLoading ? <DashSkeleton /> : (
        <>
          {stats && !stats.hasData && role === 'co' && <GetStartedCTA />}
          {ROLE_DASH[role]}
        </>
      )}
    </div>
  );
}