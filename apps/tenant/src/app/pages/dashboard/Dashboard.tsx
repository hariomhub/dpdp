import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, ArrowRight, CheckCircle2,
  AlertTriangle, Clock, Shield, Database, FileCheck, Users, Zap,
  BarChart2, XCircle, MoreHorizontal
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar
} from 'recharts';
import { useApp, ROLE_COLORS, ROLE_INITIALS, ROLE_LABELS } from '../../context/AppContext';

// ─── Shared data ──────────────────────────────────────────────────────────────
const RISK_LEVEL = (s: number) =>
  s <= 20 ? { label: 'Low', color: '#22C55E' }
  : s <= 40 ? { label: 'Moderate', color: '#EAB308' }
  : s <= 60 ? { label: 'High', color: '#F97316' }
  : s <= 80 ? { label: 'Critical', color: '#EF4444' }
  : { label: 'Severe', color: '#7F1D1D' };

const TREND_DATA = [
  { date: 'Feb 1', DPDP: 52, RBI: 44, SEBI: 31 },
  { date: 'Feb 15', DPDP: 56, RBI: 46, SEBI: 33 },
  { date: 'Mar 1', DPDP: 59, RBI: 49, SEBI: 36 },
  { date: 'Mar 15', DPDP: 62, RBI: 52, SEBI: 38 },
  { date: 'Apr 1', DPDP: 66, RBI: 56, SEBI: 41 },
  { date: 'Apr 15', DPDP: 70, RBI: 59, SEBI: 44 },
  { date: 'Apr 26', DPDP: 74, RBI: 61, SEBI: 47 },
];

const DEPT_COMPLIANCE = [
  { name: 'Finance', compliant: 42, inProgress: 28, nonCompliant: 30, notStarted: 0 },
  { name: 'Marketing', compliant: 55, inProgress: 25, nonCompliant: 15, notStarted: 5 },
  { name: 'HR', compliant: 68, inProgress: 18, nonCompliant: 10, notStarted: 4 },
  { name: 'Sales', compliant: 72, inProgress: 18, nonCompliant: 10, notStarted: 0 },
  { name: 'Engineering', compliant: 74, inProgress: 15, nonCompliant: 8, notStarted: 3 },
];

const DONUT_DATA = {
  DPDP: [{ name: 'Compliant', value: 35, color: '#22C55E' }, { name: 'In Progress', value: 28, color: '#3B82F6' }, { name: 'Non-Compliant', value: 12, color: '#F87171' }, { name: 'Not Started', value: 25, color: '#94A3B8' }],
  RBI:  [{ name: 'Compliant', value: 42, color: '#22C55E' }, { name: 'In Progress', value: 31, color: '#3B82F6' }, { name: 'Non-Compliant', value: 8,  color: '#F87171' }, { name: 'Not Started', value: 19, color: '#94A3B8' }],
  SEBI: [{ name: 'Compliant', value: 28, color: '#22C55E' }, { name: 'In Progress', value: 22, color: '#3B82F6' }, { name: 'Non-Compliant', value: 18, color: '#F87171' }, { name: 'Not Started', value: 32, color: '#94A3B8' }],
};

const ACTIVITY = [
  { user: 'Manish Kumar', role: 'it_admin', initials: 'MK', action: 'submitted evidence for Data Encryption on', asset: 'Customer Database', time: '2h ago' },
  { user: 'Rahul Mehta', role: 'internal_auditor', initials: 'RM', action: 'approved evidence for Consent Mechanism on', asset: 'HR Portal', time: '5h ago' },
  { user: 'Priya Sharma', role: 'co', initials: 'PS', action: 'created new assessment:', asset: 'DPDP Q1 2025', time: '1 day ago' },
  { user: 'Sunita Joshi', role: 'external_auditor', initials: 'SJ', action: 'provided final sign-off for', asset: 'AWS DPA Agreement', time: '2 days ago' },
  { user: 'Manish Kumar', role: 'it_admin', initials: 'MK', action: 'started work on', asset: 'Parental Consent Flow implementation', time: '2 days ago' },
  { user: 'Priya Sharma', role: 'co', initials: 'PS', action: 'created compliance task for', asset: 'Payment Gateway Data Flow', time: '3 days ago' },
];

const DEADLINES = [
  { name: 'Q1 2025 DPDP Assessment', type: 'Assessment', dueDate: '2025-04-30', daysLeft: 4 },
  { name: 'Parental Consent Flow', type: 'Task', dueDate: '2025-05-10', daysLeft: 14 },
  { name: 'AWS Infrastructure Audit', type: 'Assessment', dueDate: '2025-05-15', daysLeft: 19 },
  { name: 'Data Retention Schedule', type: 'Task', dueDate: '2025-05-20', daysLeft: 24 },
  { name: 'Cross-Border Transfer Review', type: 'Task', dueDate: '2025-04-20', daysLeft: -6 },
];

// ─── Shared components ────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, trend, extraClass = '' }: {
  label: string; value: string | number; sub?: string; color: string; trend?: string; extraClass?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${extraClass}`}>
      <div className="h-0.5 w-full" style={{ background: color }} />
      <div className="p-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
        <p className="text-[30px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1">{sub}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-[10.5px] text-slate-400">{trend}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DonutChart({ data, label, total }: { data: typeof DONUT_DATA['DPDP']; label: string; total: number }) {
  const navigate = useNavigate();
  const pct = Math.round((data[0].value / total) * 100);
  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/org/assessments')}>
      <p className="text-[13px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>{label}</p>
      <div className="flex items-center gap-4">
        <div className="relative" style={{ width: 80, height: 80 }}>
          <ResponsiveContainer width={80} height={80}>
            <PieChart>
              <Pie data={data} cx={35} cy={35} innerRadius={26} outerRadius={38} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[16px] font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>{pct}%</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[11px] text-slate-600">{d.value} {d.name}</span>
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
        <text x={cx} y={cy - 6} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 28 : 20} fontWeight="bold" fontFamily="Sora">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize={10}>{level.label}</text>
      </svg>
    </div>
  );
}

function ActivityFeed({ items = ACTIVITY }: { items?: typeof ACTIVITY }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ background: `${ROLE_COLORS[item.role as keyof typeof ROLE_COLORS]}20`, color: ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] }}>
            {item.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-slate-700">
              <span className="font-semibold">{item.user}</span>
              <span className="text-slate-400 text-[10.5px] ml-1">({ROLE_LABELS[item.role as keyof typeof ROLE_LABELS]})</span>
              {' '}{item.action} <span className="font-medium text-slate-800">{item.asset}</span>
            </p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">{item.time}</p>
          </div>
        </div>
      ))}
      <button className="text-[11.5px] text-blue-600 hover:text-blue-700 font-medium">View Full Activity →</button>
    </div>
  );
}

function UpcomingDeadlines() {
  const navigate = useNavigate();
  return (
    <div className="space-y-2">
      {DEADLINES.sort((a, b) => a.daysLeft - b.daysLeft).map((d, i) => {
        const overdue = d.daysLeft < 0;
        const urgent = d.daysLeft >= 0 && d.daysLeft < 7;
        const warn = d.daysLeft >= 7 && d.daysLeft <= 14;
        return (
          <div key={i} className="flex items-center gap-3 p-2.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-slate-800 truncate">{d.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${d.type === 'Assessment' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'}`}>{d.type}</span>
                <span className="text-[10.5px] text-slate-400">{d.dueDate}</span>
              </div>
            </div>
            {overdue
              ? <span className="text-[10.5px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">OVERDUE</span>
              : <span className={`text-[10.5px] font-semibold flex-shrink-0 ${urgent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600'}`}>{d.daysLeft}d left</span>
            }
          </div>
        );
      })}
      <button onClick={() => navigate('/org/compliance-tasks')}
        className="w-full text-center text-[11.5px] text-blue-600 hover:text-blue-700 font-medium pt-1.5 border-t border-slate-100 mt-1">
        View All Upcoming Deadlines →
      </button>
    </div>
  );
}

// ─── CEO Dashboard ─────────────────────────────────────────────────────────────
function CEODashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      {/* Row 1: KPI cards */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Overall Compliance Score" value="74%" sub="across all active assessments" color="#22C55E" trend="+4% vs last week" />
        <MetricCard label="Active Assessments" value={2} sub="2 DPDP · 0 RBI · 0 SEBI" color="#3B82F6" />
        <MetricCard label="Open Compliance Tasks" value={18} sub="6 pending · 8 in progress · 4 under review" color="#F97316" />
        <MetricCard label="Overdue Actions" value={3} sub="Require immediate attention" color="#EF4444" />
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(67).color }} />
          <div className="p-4">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</p>
            <RiskGauge score={67} size="md" />
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="w-3 h-3 text-red-500" />
              <span className="text-[10.5px] text-slate-400">+3 vs last week</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Compliance by Regulation */}
      <div>
        <p className="text-[14px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Compliance by Regulation</p>
        <div className="flex gap-3">
          <DonutChart data={DONUT_DATA.DPDP} label="DPDP Act 2023" total={100} />
          <DonutChart data={DONUT_DATA.RBI}  label="RBI Data Localisation" total={100} />
          <DonutChart data={DONUT_DATA.SEBI} label="SEBI Cybersecurity" total={100} />
        </div>
      </div>

      {/* Row 3: Dept Compliance + Risk Gauge */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Department Compliance Overview</p>
          <div className="space-y-2">
            {DEPT_COMPLIANCE.sort((a, b) => a.compliant - b.compliant).map(d => (
              <div key={d.name} className="flex items-center gap-3">
                <p className="text-[11.5px] text-slate-600 w-20 flex-shrink-0">{d.name}</p>
                <div className="flex-1 h-5 bg-slate-100 rounded flex overflow-hidden cursor-pointer hover:opacity-80" onClick={() => navigate('/org/assets')}>
                  <div className="h-full" style={{ width: `${d.compliant}%`, background: '#22C55E' }} />
                  <div className="h-full" style={{ width: `${d.inProgress}%`, background: '#3B82F6' }} />
                  <div className="h-full" style={{ width: `${d.nonCompliant}%`, background: '#F87171' }} />
                  <div className="h-full" style={{ width: `${d.notStarted}%`, background: '#94A3B8' }} />
                </div>
                <span className="text-[11.5px] font-semibold text-slate-700 w-8 text-right flex-shrink-0">{d.compliant}%</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              {[['#22C55E', 'Compliant'], ['#3B82F6', 'In Progress'], ['#F87171', 'Non-Compliant'], ['#94A3B8', 'Not Started']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} /><span className="text-[10px] text-slate-400">{l}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-2">Risk Score</p>
          <div className="flex flex-col items-center py-2">
            <RiskGauge score={67} size="lg" />
            <p className="text-[11px] text-slate-400 mt-2">Overall Risk: {RISK_LEVEL(67).label}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Top Risk Driver</p>
            <p className="text-[12px] font-semibold text-slate-800">Customer Database</p>
            <p className="text-[11px] text-slate-400">Engineering · DPDP Act 2023</p>
            <p className="text-[10.5px] text-slate-400 mt-0.5">14 non-compliant controls · 6 overdue actions</p>
            <button className="text-[11.5px] text-blue-600 hover:text-blue-700 font-medium mt-1.5">View Asset →</button>
          </div>
        </div>
      </div>

      {/* Row 4: Trend + Asset Health */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-semibold text-slate-800">Compliance Trend</p>
            <div className="flex gap-1.5">
              {['30d', '90d', '1y'].map(d => (
                <button key={d} className={`px-2 py-0.5 rounded text-[10.5px] font-medium ${d === '90d' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-500 hover:border-blue-300'}`}>{d}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={TREND_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="DPDP" stroke="#3B82F6" strokeWidth={2} dot={false} name="DPDP" />
              <Line type="monotone" dataKey="RBI" stroke="#10B981" strokeWidth={2} dot={false} name="RBI" />
              <Line type="monotone" dataKey="SEBI" stroke="#8B5CF6" strokeWidth={2} dot={false} name="SEBI" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-2">Asset Health Summary</p>
          <p className="text-[30px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>6</p>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
            {[{ w: 33, c: '#22C55E' }, { w: 33, c: '#3B82F6' }, { w: 17, c: '#F87171' }, { w: 17, c: '#94A3B8' }].map((s, i) => (
              <div key={i} className="h-full" style={{ width: `${s.w}%`, background: s.c }} />
            ))}
          </div>
          <div className="space-y-1 text-[11px]">
            {[['#22C55E', '2 Fully Compliant'], ['#3B82F6', '2 Partially Compliant'], ['#F87171', '1 Non-Compliant'], ['#94A3B8', '1 Not Started']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} /><span className="text-slate-600">{l}</span></div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-[11px] text-amber-700">⚠ 1 asset has no PII records. Controls cannot be accurately mapped.</p>
            <button className="text-[11px] text-amber-700 font-medium mt-0.5" onClick={() => navigate('/org/assets')}>Review Assets →</button>
          </div>
        </div>
      </div>

      {/* Row 5: Activity + Deadlines */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Recent Activity</p>
          <ActivityFeed />
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Upcoming Deadlines</p>
          <UpcomingDeadlines />
        </div>
      </div>
    </div>
  );
}

// ─── CO Dashboard ─────────────────────────────────────────────────────────────
function CODashboard() {
  const navigate = useNavigate();
  return (
    <div className="space-y-5">
      {/* Attention Banner */}
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-[13px] font-semibold text-amber-800">⚠ Requires Your Attention</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px] text-amber-700">
            <span>1 task rejected — awaiting your decision</span>
            <button onClick={() => navigate('/org/compliance-tasks')} className="font-medium hover:text-amber-900">Review Now →</button>
          </div>
          <div className="flex items-center justify-between text-[12px] text-amber-700">
            <span>3 controls have no assigned action</span>
            <button onClick={() => navigate('/org/controls')} className="font-medium hover:text-amber-900">View Gaps →</button>
          </div>
          <div className="flex items-center justify-between text-[12px] text-amber-700">
            <span>2 assets have non-compliant controls</span>
            <button onClick={() => navigate('/org/assets')} className="font-medium hover:text-amber-900">Review →</button>
          </div>
        </div>
      </div>

      {/* Same KPI row as CEO */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard label="Overall Compliance Score" value="74%" sub="across all active assessments" color="#22C55E" />
        <MetricCard label="Active Assessments" value={2} sub="2 DPDP · 0 RBI" color="#3B82F6" />
        <MetricCard label="Open Compliance Tasks" value={18} sub="6 pending · 8 in progress" color="#F97316" />
        <MetricCard label="Overdue Actions" value={3} sub="Require immediate attention" color="#EF4444" />
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(67).color }} />
          <div className="p-4"><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Risk Score</p><RiskGauge score={67} size="md" /></div>
        </div>
      </div>

      {/* Action Queue */}
      <div>
        <p className="text-[14px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>My Action Queue</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Rejected Tasks', value: 1, color: '#EF4444', sub: 'Awaiting your decision', cta: 'Review →' },
            { label: 'Unassigned Tasks', value: 2, color: '#F59E0B', sub: 'No IT Admin assigned', cta: 'Assign →' },
            { label: 'Under Review', value: 4, color: '#3B82F6', sub: 'With Internal Auditor', cta: '' },
            { label: 'Pending Final Sign-Off', value: 1, color: '#8B5CF6', sub: 'With External Auditor', cta: '' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="h-0.5 w-full" style={{ background: c.color }} />
              <div className="p-3.5">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{c.label}</p>
                <p className="text-[26px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif', color: c.color }}>{c.value}</p>
                <p className="text-[11px] text-slate-400">{c.sub}</p>
                {c.cta && <button className="mt-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700" onClick={() => navigate('/org/compliance-tasks')}>{c.cta}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment Progress */}
      <div>
        <p className="text-[14px] font-semibold text-slate-800 mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Active Assessment Progress</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Q1 2025 DPDP Assessment', regs: ['DPDP'], assets: ['Customer DB', 'AWS Infra', '+1 more'], pct: 67, compliant: 28, total: 42, daysLeft: 4 },
            { name: 'AWS Infrastructure Audit', regs: ['DPDP'], assets: ['AWS Infra', 'Customer DB'], pct: 70, compliant: 14, total: 20, daysLeft: 19 },
          ].map(a => (
            <div key={a.name} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{a.name}</p>
                  <div className="flex gap-1.5 mt-1">
                    {a.regs.map(r => <span key={r} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{r}</span>)}
                    {a.assets.map(as => <span key={as} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{as}</span>)}
                  </div>
                </div>
                <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded ${a.daysLeft < 7 ? 'bg-red-100 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{a.daysLeft}d left</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.pct}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">{a.compliant}/{a.total} controls compliant</p>
                <button className="text-[11px] text-blue-600 font-medium hover:text-blue-700" onClick={() => navigate('/org/assessments')}>View →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gaps + Activity */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[13px] font-semibold text-slate-800">Controls With No Action Assigned</p>
            <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">3 gaps</span>
          </div>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
              {['Asset', 'Dept', 'Control', 'Regulation', ''].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                { asset: 'Customer Database', dept: 'Engineering', control: 'DPDP-CH3-001', reg: 'DPDP' },
                { asset: 'Payment Gateway', dept: 'Finance', control: 'RBI-CH2-001', reg: 'RBI' },
                { asset: 'CRM Portal', dept: 'Sales', control: 'DPDP-CH2-003', reg: 'DPDP' },
              ].map((g, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-800">{g.asset}</td>
                  <td className="px-3 py-2.5 text-slate-500">{g.dept}</td>
                  <td className="px-3 py-2.5"><span className="font-mono text-[10.5px] text-slate-600">{g.control}</span></td>
                  <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{g.reg}</span></td>
                  <td className="px-3 py-2.5"><button className="text-[11px] text-blue-600 font-medium hover:text-blue-700">Create Task →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Upcoming Deadlines</p>
          <UpcomingDeadlines />
        </div>
      </div>
    </div>
  );
}

// ─── IT Admin Dashboard ────────────────────────────────────────────────────────
function ITAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const tasks = [
    { id: 'TSK-001', title: 'Implement AES-256 encryption for Customer DB', asset: 'Customer Database', assetType: 'Data Asset', control: 'DPDP-CH2-006', reg: 'DPDP', priority: 'Critical', dueDate: '2025-05-15', daysLeft: 19, status: 'In Progress' },
    { id: 'TSK-003', title: 'Fix consent withdrawal mechanism', asset: 'Customer Database', assetType: 'Data Asset', control: 'DPDP-CH2-002', reg: 'DPDP', priority: 'High', dueDate: '2025-04-30', daysLeft: 4, status: 'Pending' },
    { id: 'TSK-005', title: 'Implement parental consent flow', asset: 'Customer Database', assetType: 'Data Asset', control: 'DPDP-CH4-001', reg: 'DPDP', priority: 'Critical', dueDate: '2025-04-10', daysLeft: -16, status: 'Rejected' },
  ];
  const rejected = tasks.filter(t => t.status === 'Rejected');

  const PRIORITY_COLORS: Record<string, string> = { Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
  const STATUS_COLORS: Record<string, string> = { Pending: '#F59E0B', 'In Progress': '#3B82F6', Rejected: '#EF4444', Completed: '#22C55E' };

  return (
    <div className="space-y-5">
      {/* Row 1: KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending Tasks', value: 1, color: '#F59E0B', sub: 'Assigned, not started' },
          { label: 'In Progress', value: 1, color: '#3B82F6', sub: 'Currently working on' },
          { label: 'Submitted', value: 1, color: '#06B6D4', sub: 'Awaiting review' },
          { label: 'Rejected', value: 1, color: '#EF4444', sub: 'Need rework' },
        ].map(c => <MetricCard key={c.label} {...c} />)}
      </div>

      {/* Rejected section */}
      {rejected.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-[12.5px] font-bold text-red-800">⚠ Requires Attention — Rejected Tasks</p>
          </div>
          {rejected.map(t => (
            <div key={t.id} className="p-3 bg-white border border-red-200 rounded-lg mt-2">
              <p className="text-[12.5px] font-semibold text-slate-800 mb-1">{t.title}</p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded mb-2">IA Feedback: Evidence does not sufficiently demonstrate compliance. Please provide complete configuration export.</p>
              <button onClick={() => navigate('/org/compliance-tasks')} className="text-[11.5px] font-semibold text-blue-600 hover:text-blue-700">View Feedback and Resubmit →</button>
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Task List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-slate-800">My Compliance Tasks</p>
          <div className="flex gap-1">
            {['All', 'Pending', 'In Progress', 'Rejected', 'Completed'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-[11.5px] font-medium transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {tasks.filter(t => activeTab === 'All' || t.status === activeTab).map(t => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[t.priority]}` }}>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-slate-800">{t.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Database className="w-3 h-3 text-slate-400" />
                  <p className="text-[11.5px] font-semibold text-slate-600">Work on: {t.asset}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-slate-400">{t.control}</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{t.reg}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block text-[10.5px] px-2 py-0.5 rounded font-semibold mb-1" style={{ background: `${STATUS_COLORS[t.status]}20`, color: STATUS_COLORS[t.status] }}>{t.status}</span>
                <p className={`text-[10.5px] font-medium ${t.daysLeft < 0 ? 'text-red-600' : t.daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {t.daysLeft < 0 ? `${Math.abs(t.daysLeft)}d overdue` : `${t.daysLeft}d left`}
                </p>
              </div>
              <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-medium border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0">
                Open <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Upcoming Due Dates — Next 7 Days</p>
          {[{ day: 'Tomorrow', tasks: ['Fix consent withdrawal mechanism'] }, { day: 'May 3', tasks: ['Update privacy notice on website'] }].map(d => (
            <div key={d.day} className="mb-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{d.day}</p>
              {d.tasks.map(t => <p key={t} className="text-[12px] text-slate-700 pl-2 border-l-2 border-blue-300">{t}</p>)}
            </div>
          ))}
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Evidence Submission Status</p>
          {[
            { title: 'Data Retention Policy v2.1', asset: 'Customer Database', date: 'Mar 12', status: 'Approved' },
            { title: 'AWS DPA Agreement 2025', asset: 'AWS Infra', date: 'Mar 5', status: 'Approved' },
            { title: 'Parental Consent Demo Video', asset: 'Customer Database', date: 'Feb 25', status: 'Rejected' },
          ].map((ev, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1">
                <p className="text-[12px] font-medium text-slate-800 truncate">{ev.title}</p>
                <p className="text-[10.5px] text-slate-400">{ev.asset} · {ev.date}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold flex-shrink-0 ${ev.status === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{ev.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Internal Auditor Dashboard ────────────────────────────────────────────────
function IADashboard() {
  const navigate = useNavigate();
  const QUEUE = [
    { task: 'Implement AES-256 encryption for Customer DB', asset: 'Customer Database', assetType: 'Data Asset', dept: 'Engineering', submittedBy: 'Manish Kumar', elapsed: '2 days ago', reg: 'DPDP', control: 'DPDP-CH2-006' },
    { task: 'Review AWS DPA agreement', asset: 'AWS Cloud Infra', assetType: 'Third-Party Vendor', dept: 'Engineering', submittedBy: 'Manish Kumar', elapsed: '4 days ago', reg: 'DPDP', control: 'DPDP-CH2-007' },
    { task: 'Cookie consent banner update', asset: 'Consent Banner', assetType: 'Consent Mechanism', dept: 'Marketing', submittedBy: 'Kavya Reddy', elapsed: '5 days ago', reg: 'DPDP', control: 'DPDP-CH2-002' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: 3, color: '#3B82F6', sub: 'Evidence awaiting your review' },
          { label: 'Reviewed Today', value: 2, color: '#22C55E', sub: 'Processed today' },
          { label: 'Approved Total', value: 14, color: '#10B981', sub: 'This assessment cycle' },
          { label: 'Rejected Total', value: 3, color: '#EF4444', sub: 'Sent back for rework' },
        ].map(c => <MetricCard key={c.label} {...c} />)}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-800">Evidence Awaiting Your Review</p>
          <p className="text-[11px] text-slate-400">Oldest first — review in order of submission</p>
        </div>
        {QUEUE.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-slate-600">All caught up!</p>
            <p className="text-[12px] text-slate-400">No evidence pending review.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {QUEUE.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-slate-800 mb-0.5">{item.task}</p>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Database className="w-3 h-3 text-blue-400" />
                    <span className="text-[11.5px] font-semibold text-blue-700">{item.asset}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{item.assetType}</span>
                    <span className="text-[10.5px] text-slate-400">{item.dept}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] text-slate-400">Submitted by: <span className="font-medium text-slate-600">{item.submittedBy}</span> · {item.elapsed}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{item.reg}</span>
                  </div>
                </div>
                <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                  Review Evidence <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Controls Reviewed This Cycle</p>
          {[
            { name: 'Q1 2025 DPDP Assessment', regs: ['DPDP'], reviewed: 28, total: 42 },
            { name: 'AWS Infrastructure Audit', regs: ['DPDP'], reviewed: 12, total: 20 },
          ].map(a => (
            <div key={a.name} className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-semibold text-slate-800">{a.name}</p>
                <span className="text-[11px] text-slate-400">{a.reviewed}/{a.total} controls</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(a.reviewed / a.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-2 bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-[13px] font-semibold text-slate-800 mb-3">Recently Processed</p>
          {[
            { title: 'Data Retention Policy', asset: 'Customer DB', decision: 'Approved', time: '2 hrs ago' },
            { title: 'AWS DPA Agreement', asset: 'AWS Infra', decision: 'Approved', time: '1 day ago' },
            { title: 'Parental Consent Demo', asset: 'Customer DB', decision: 'Rejected', time: '3 days ago' },
            { title: 'Cookie Banner Update', asset: 'Consent Banner', decision: 'Approved', time: '5 days ago' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
              {item.decision === 'Approved' ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-800 truncate">{item.title}</p>
                <p className="text-[10.5px] text-slate-400">{item.asset} · {item.time}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ${item.decision === 'Approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{item.decision}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── External Auditor Dashboard ────────────────────────────────────────────────
function EADashboard() {
  const navigate = useNavigate();
  const QUEUE = [
    { task: 'Data Retention Schedule', asset: 'Customer Database', dept: 'Engineering', ia: 'Rahul Mehta', iaDate: 'Apr 24, 2025', control: 'DPDP-CH2-005', reg: 'DPDP' },
    { task: 'AWS DPA Agreement 2025', asset: 'AWS Cloud Infra', dept: 'Engineering', ia: 'Rahul Mehta', iaDate: 'Apr 22, 2025', control: 'DPDP-CH2-007', reg: 'DPDP' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Pending Sign-Off" value={2} sub="Internally approved, awaiting final sign-off" color="#F59E0B" />
        <MetricCard label="Signed Off This Cycle" value={6} sub="Final approvals given" color="#22C55E" />
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="h-0.5 bg-green-500 w-full" />
          <div className="p-4"><p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Overall Compliance Score</p><RiskGauge score={74} size="md" /></div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-800">Items Ready for Final Sign-Off</p>
        </div>
        <div className="divide-y divide-slate-50">
          {QUEUE.map((item, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-slate-800 mb-0.5">{item.task}</p>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Database className="w-3 h-3 text-blue-400" />
                  <span className="text-[11.5px] font-semibold text-blue-700">{item.asset}</span>
                  <span className="text-[10.5px] text-slate-400">{item.dept}</span>
                </div>
                <p className="text-[11px] text-slate-400">Approved by: <span className="font-medium text-slate-600">{item.ia}</span> on {item.iaDate} · <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{item.reg}</span></p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-[9.5px] text-slate-400 uppercase tracking-wider border border-slate-200 px-1.5 py-0.5 rounded">View Only</span>
              </div>
              <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0">
                Review & Sign Off <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {QUEUE.length === 0 && (
            <div className="py-12 text-center"><CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" /><p className="text-[13px] text-slate-500">No items pending your sign-off</p></div>
          )}
        </div>
      </div>

      {/* Read-only compliance overview */}
      <div className="flex items-start gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg">
        <p className="text-[11px] text-slate-500">The compliance overview below is read-only for External Auditors.</p>
        <span className="text-[9.5px] border border-slate-300 text-slate-400 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">View Only</span>
      </div>
      <div className="flex gap-3">
        <DonutChart data={DONUT_DATA.DPDP} label="DPDP Act 2023" total={100} />
        <DonutChart data={DONUT_DATA.RBI}  label="RBI Data Localisation" total={100} />
        <DonutChart data={DONUT_DATA.SEBI} label="SEBI Cybersecurity" total={100} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { role, orgName } = useApp();

  const ROLE_DASH: Record<string, React.ReactNode> = {
    ceo: <CEODashboard />,
    co: <CODashboard />,
    it_admin: <ITAdminDashboard />,
    internal_auditor: <IADashboard />,
    external_auditor: <EADashboard />,
  };

  const TITLES: Record<string, string> = {
    ceo: 'Executive Overview',
    co: 'Compliance Officer Dashboard',
    it_admin: 'My Tasks & Workload',
    internal_auditor: 'Audit Review Dashboard',
    external_auditor: 'Final Sign-Off Dashboard',
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{TITLES[role]}</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">{orgName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      {ROLE_DASH[role]}
    </div>
  );
}