import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight, CheckCircle2, AlertTriangle, Database, Users,
  BarChart2, XCircle, Shield, Zap, Plus,
  ShieldCheck, ClipboardCheck, ListTodo, Clock, Globe, Handshake, BookOpen,
  PlayCircle, FileCheck2, Eye,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useApp, ROLE_COLORS, ROLE_LABELS } from '../../context/AppContext';
import { useDashboardStats, useDashboardHistory, type DashboardStats } from '../../../hooks/useDashboard';
import { useLmsCoverage } from '../../../hooks/useLms';
import { MetricCard } from '../../components/shared/DesignSystem';
import { BulletChart } from '../../components/shared/BulletChart';
import { ComplianceRiskTrendChart } from '../../components/dashboard/ComplianceRiskTrendChart';
import { STATUS_COLORS, RISK_BAND_COLORS } from '../../components/shared/dashboardColors';
import { computeTrend } from '../../components/shared/trend';
import { DashboardInsights } from '../../components/dashboard/DashboardInsights';
import { RiskHeatmapCard } from '../../components/dashboard/RiskHeatmapCard';
import { TopRiskDriversCard } from '../../components/dashboard/TopRiskDriversCard';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const RISK_LEVEL = (s: number) =>
  s <= 20 ? { label: 'Low', color: RISK_BAND_COLORS.low }
  : s <= 40 ? { label: 'Moderate', color: RISK_BAND_COLORS.moderate }
  : s <= 60 ? { label: 'High', color: RISK_BAND_COLORS.high }
  : s <= 80 ? { label: 'Critical', color: RISK_BAND_COLORS.critical }
  : { label: 'Severe', color: RISK_BAND_COLORS.severe };

const ROLE_MAP: Record<string, string> = {
  CEO: 'ceo', CO: 'co', IT_ADMIN: 'it_admin',
  INTERNAL_AUDITOR: 'internal_auditor', EXTERNAL_AUDITOR: 'external_auditor',
};

// ─── Shared components ────────────────────────────────────────────────────────
function DonutChart({ data, label, total }: { data: { name: string; value: number; color: string }[]; label: string; total: number }) {
  const navigate = useNavigate();
  const compliantValue = data.find(d => d.name === 'Compliant')?.value ?? 0;
  const pct = total > 0 ? Math.round((compliantValue / total) * 100) : 0;
  return (
    <div className="flex-1 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/org/assessments')}>
      <p className="text-[13.5px] font-semibold text-slate-800 mb-1.5" style={{ fontFamily: 'Cinzel, serif' }}>{label}</p>
      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: 62, height: 62 }}>
          <ResponsiveContainer width={62} height={62}>
            <PieChart>
              <Pie data={data} cx={27} cy={27} innerRadius={20} outerRadius={29} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                {data.map((d: { name: string; value: number; color: string }, i: number) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14.5px] font-bold text-slate-800" style={{ fontFamily: 'Cinzel, serif' }}>{pct}%</span>
          </div>
        </div>
        <div className="space-y-1">
          {data.map((d: { name: string; value: number; color: string }) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[12px] text-slate-600">{d.value} {d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RiskGauge({ score, size = 'md' }: { score: number; size?: 'lg' | 'md' }) {
  const level = RISK_LEVEL(score);
  const r = size === 'lg' ? 48 : 36;
  const cx = size === 'lg' ? 64 : 48;
  const cy = size === 'lg' ? 64 : 48;
  const circ = Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center">
      <svg width={cx * 2} height={cy + 12} className="overflow-visible">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth={size === 'lg' ? 8 : 6} />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={level.color} strokeWidth={size === 'lg' ? 8 : 6}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        <text x={cx} y={cy - 5} textAnchor="middle" fill={level.color} fontSize={size === 'lg' ? 26 : 19} fontWeight="bold" fontFamily="Cinzel">{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748b" fontSize={11}>{level.label}</text>
      </svg>
    </div>
  );
}

function ActivityFeed({ items = [] }: { items?: DashboardStats['recentActivity'] }) {
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${ROLE_COLORS[item.role as keyof typeof ROLE_COLORS]}20`, color: ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] }}>
            {item.user.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-slate-700 leading-snug">
              <span className="font-semibold">{item.user}</span>
              <span className="text-slate-400 text-[11.5px] ml-1">({ROLE_LABELS[item.role as keyof typeof ROLE_LABELS]})</span>
              {' '}{item.action} <span className="font-medium text-slate-800">{item.details}</span>
            </p>
            <p className="text-[11.5px] text-slate-400">{item.time}</p>
          </div>
        </div>
      ))}
      <button className="text-[13px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium">View Full Activity →</button>
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
          <div key={i} className="flex items-center gap-3 p-2 border border-[#D4AF37]/20 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-slate-800 truncate">{d.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${d.type === 'Assessment' ? 'bg-violet-50 text-violet-700' : 'bg-[#1A3E5C]/8 text-[#1A3E5C]'}`}>{d.type}</span>
                <span className="text-[11.5px] text-slate-400">{d.dueDate}</span>
              </div>
            </div>
            {overdue
              ? <span className="text-[11.5px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded flex-shrink-0">OVERDUE</span>
              : <span className={`text-[11.5px] font-semibold flex-shrink-0 ${urgent ? 'text-red-600' : warn ? 'text-amber-600' : 'text-green-600'}`}>{d.daysLeft}d left</span>
            }
          </div>
        );
      })}
      <button onClick={() => navigate('/org/compliance-tasks')}
        className="w-full text-center text-[12.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium pt-1.5 border-t border-slate-100 mt-1">
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
  const readiness = stats?.auditReadinessScore ?? null;
  const c     = stats?.counts;
  const depts = stats?.deptCompliance ?? [];
  const regs  = stats?.regulationCompliance ?? [];
  const ah    = stats?.assetHealth;
  const scoreDisplay = score !== null ? `${score}%` : 'N/A';

  const { data: history } = useDashboardHistory('30d');
  const complianceSeries = (history ?? []).map(p => p.complianceScore).filter((v): v is number => v !== null);
  const riskSeries       = (history ?? []).map(p => p.riskScore).filter((v): v is number => v !== null);
  const complianceTrend  = computeTrend(complianceSeries, '%');
  const riskTrend        = computeTrend(riskSeries);

  const { data: lms } = useLmsCoverage();

  return (
    <div className="space-y-4">
      {/* Key Insights — the "so what" before the raw numbers */}
      {stats && <DashboardInsights stats={stats} limit={3} />}

      {/* Row 1: Hero KPIs — capped at 5 for a 5-second glance */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard
          label="Overall Compliance Score" value={scoreDisplay}
          sub={`${c?.activeAssessments ?? 0} active assessment${(c?.activeAssessments ?? 0) === 1 ? '' : 's'}`}
          accentColor={STATUS_COLORS.compliant} trend={complianceTrend} sparklineData={complianceSeries}
          icon={ShieldCheck}
        />
        <div className="group bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(risk).color }} />
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${RISK_LEVEL(risk).color}14` }}>
                <AlertTriangle style={{ width: 14, height: 14, color: RISK_LEVEL(risk).color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Risk Score</p>
            </div>
            <RiskGauge score={risk} size="md" />
            {riskTrend && (
              <p className={`text-[12.5px] text-center mt-1 ${riskTrend.direction === 'up' ? 'text-red-500' : riskTrend.direction === 'down' ? 'text-green-500' : 'text-slate-400'}`}>
                {riskTrend.label}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 flex flex-col justify-center transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <BulletChart
            label="Audit Readiness" value={readiness ?? 0} target={80} color="#8B5CF6"
            sub={readiness === null ? 'No active assessments yet' : 'Compliance score adjusted for overdue-task severity'}
            icon={ClipboardCheck}
          />
        </div>
        <MetricCard label="Open Compliance Tasks" value={c?.openTasks ?? 0} sub={`${c?.pendingTasks ?? 0} pending · ${c?.inProgressTasks ?? 0} in progress`} accentColor="#F97316" icon={ListTodo} />
        <MetricCard label="Overdue Actions" value={c?.overdueTasks ?? 0} sub="Require immediate attention" accentColor={STATUS_COLORS.nonCompliant} icon={Clock} />
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
                  <span style={{ color: p === 'CRITICAL' ? RISK_BAND_COLORS.critical : p === 'HIGH' ? RISK_BAND_COLORS.high : p === 'MEDIUM' ? RISK_BAND_COLORS.moderate : STATUS_COLORS.compliant }} className="font-medium">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                  <span className="font-semibold text-slate-700">{stats.overdueByPriority[p]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <MetricCard
          label="Cross-Border PII Transfers" value={c?.crossBorderPiiTransfers ?? 0} sub="PII records transferred outside India"
          accentColor={(c?.crossBorderPiiTransfers ?? 0) > 0 ? STATUS_COLORS.pending : STATUS_COLORS.notStarted}
          onClick={() => navigate('/org/assets')} icon={Globe}
        />
        <MetricCard
          label="Suppliers Without DPA" value={c?.suppliersWithoutDpa ?? 0} sub={`of ${c?.suppliers ?? 0} total suppliers`}
          accentColor={(c?.suppliersWithoutDpa ?? 0) > 0 ? STATUS_COLORS.nonCompliant : STATUS_COLORS.notStarted}
          onClick={() => navigate('/org/assets')} icon={Handshake}
        />
        <MetricCard
          label="Assets Without PII Review" value={ah?.noPiiRecords ?? 0} sub={`of ${ah?.total ?? 0} registered assets`}
          accentColor={(ah?.noPiiRecords ?? 0) > 0 ? STATUS_COLORS.pending : STATUS_COLORS.notStarted}
          onClick={() => navigate('/org/assets')} icon={Database}
        />
      </div>

      {/* Row 2: Compliance & Risk Trend */}
      <ComplianceRiskTrendChart />

      {/* Row 2b: Risk Heatmap + Top Risk Drivers */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3"><RiskHeatmapCard /></div>
        <div className="col-span-2"><TopRiskDriversCard /></div>
      </div>

      {/* Row 3: Compliance by Regulation + Training */}
      <div>
        <p className="text-[14.5px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Compliance by Regulation &amp; Training</p>
        <div className="flex gap-3">
          {regs.length > 0 ? regs.slice(0, 3).map(r => {
            const data = [
              { name: 'Compliant', value: r.compliant, color: STATUS_COLORS.compliant },
              { name: 'In Progress', value: r.inProgress, color: STATUS_COLORS.inProgress },
              { name: 'Non-Compliant', value: r.nonCompliant, color: STATUS_COLORS.nonCompliant },
              { name: 'Not Started', value: r.notStarted, color: STATUS_COLORS.notStarted },
            ];
            return <DonutChart key={r.name} data={data} label={r.name} total={r.total || 1} />;
          }) : (
            <div className="flex-1 p-4 bg-slate-50 rounded-lg flex items-center">
              <p className="text-[14px] text-slate-400 italic">No assessments yet — create one to see regulation compliance.</p>
            </div>
          )}
          <div className="flex-1 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/org/lms')}>
            <p className="text-[14px] font-semibold text-slate-800 mb-1.5" style={{ fontFamily: 'Cinzel, serif' }}>Certification Completion</p>
            {lms ? (
              <div className="flex items-center gap-4">
                <p className="text-[24px] font-bold text-slate-900 leading-none" style={{ fontFamily: 'Cinzel, serif' }}>{lms.certification.orgCompletionRate}%</p>
                <p className="text-[13px] text-slate-500">{lms.certification.usersWithMandatory}/{lms.certification.totalUsers} users with mandatory certifications</p>
              </div>
            ) : <p className="text-[13px] text-slate-400 italic">No training data yet.</p>}
          </div>
        </div>
      </div>

      {/* Row 4: Dept Compliance + Risk Gauge */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Department Compliance Overview</p>
          {depts.length > 0 ? (
            <div className="space-y-2">
              {depts.sort((a, b) => a.compliant - b.compliant).map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <p className="text-[13.5px] text-slate-600 w-20 flex-shrink-0">{d.name}</p>
                  <div className="flex-1 h-5 bg-slate-100 rounded flex overflow-hidden cursor-pointer hover:opacity-80" onClick={() => navigate('/org/assets')}>
                    <div className="h-full" style={{ width: `${d.compliant}%`, background: STATUS_COLORS.compliant }} />
                    <div className="h-full" style={{ width: `${d.inProgress}%`, background: STATUS_COLORS.inProgress }} />
                    <div className="h-full" style={{ width: `${d.nonCompliant}%`, background: STATUS_COLORS.nonCompliant }} />
                    <div className="h-full" style={{ width: `${d.notStarted}%`, background: STATUS_COLORS.notStarted }} />
                  </div>
                  <span className="text-[13.5px] font-semibold text-slate-700 w-8 text-right flex-shrink-0">{d.compliant}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 italic">No assessment data yet.</p>
          )}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-1.5" style={{ fontFamily: 'Cinzel, serif' }}>Risk Score</p>
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

      {/* Row 5: Asset Health + Activity */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-1.5" style={{ fontFamily: 'Cinzel, serif' }}>Asset Health Summary</p>
          <p className="text-[27px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>{ah?.total ?? 0}</p>
          {(ah?.total ?? 0) > 0 && (
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex mb-3">
              {ah && [{ w: ah.fullyCompliant, c: STATUS_COLORS.compliant }, { w: ah.partiallyCompliant, c: STATUS_COLORS.inProgress }, { w: ah.nonCompliant, c: STATUS_COLORS.nonCompliant }, { w: ah.notStarted, c: STATUS_COLORS.notStarted }].map((s, i) => (
                <div key={i} className="h-full" style={{ width: `${Math.round((s.w / (ah.total || 1)) * 100)}%`, background: s.c }} />
              ))}
            </div>
          )}
          <div className="space-y-1 text-[13px]">
            {ah && [[STATUS_COLORS.compliant, `${ah.fullyCompliant} Fully Compliant`], [STATUS_COLORS.inProgress, `${ah.partiallyCompliant} Partially Compliant`], [STATUS_COLORS.nonCompliant, `${ah.nonCompliant} Non-Compliant`], [STATUS_COLORS.notStarted, `${ah.notStarted} Not Started`]].map(([color, label]) => (
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
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Recent Activity</p>
          <ActivityFeed items={stats?.recentActivity} />
        </div>
      </div>
      {/* Row 6: Deadlines */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
        <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Deadlines</p>
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
  const risk = stats?.riskScore ?? 0;
  const readiness = stats?.auditReadinessScore ?? null;
  const depts = stats?.deptCompliance ?? [];
  const regs = stats?.regulationCompliance ?? [];
  const nonCompliantAssets = stats?.assetHealth?.nonCompliant ?? 0;
  const hasAttentionItems = (c?.rejectedTasks ?? 0) > 0 || (c?.unassignedTasks ?? 0) > 0 || nonCompliantAssets > 0;

  const { data: history } = useDashboardHistory('30d');
  const complianceSeries = (history ?? []).map(p => p.complianceScore).filter((v): v is number => v !== null);
  const riskSeries       = (history ?? []).map(p => p.riskScore).filter((v): v is number => v !== null);
  const complianceTrend  = computeTrend(complianceSeries, '%');
  const riskTrend        = computeTrend(riskSeries);

  const { data: lms } = useLmsCoverage();

  return (
    <div className="space-y-4">
      {/* Key Insights — the "so what" before the raw numbers */}
      {stats && <DashboardInsights stats={stats} limit={4} />}

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

      {/* Hero KPIs — same pattern as CEO */}
      <div className="grid grid-cols-5 gap-3">
        <MetricCard
          label="Overall Compliance Score" value={score !== null ? `${score}%` : 'N/A'}
          sub={`${c?.activeAssessments ?? 0} active assessment${(c?.activeAssessments ?? 0) === 1 ? '' : 's'}`}
          accentColor={STATUS_COLORS.compliant} trend={complianceTrend} sparklineData={complianceSeries}
          icon={ShieldCheck}
        />
        <div className="group bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(risk).color }} />
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${RISK_LEVEL(risk).color}14` }}>
                <AlertTriangle style={{ width: 14, height: 14, color: RISK_LEVEL(risk).color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Risk Score</p>
            </div>
            <RiskGauge score={risk} size="md" />
            {riskTrend && (
              <p className={`text-[12.5px] text-center mt-1 ${riskTrend.direction === 'up' ? 'text-red-500' : riskTrend.direction === 'down' ? 'text-green-500' : 'text-slate-400'}`}>
                {riskTrend.label}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 flex flex-col justify-center transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <BulletChart
            label="Audit Readiness" value={readiness ?? 0} target={80} color="#8B5CF6"
            sub={readiness === null ? 'No active assessments yet' : 'Compliance score adjusted for overdue-task severity'}
            icon={ClipboardCheck}
          />
        </div>
        <MetricCard label="Open Compliance Tasks" value={c?.openTasks ?? 0} sub={`${c?.pendingTasks ?? 0} pending · ${c?.inProgressTasks ?? 0} in progress`} accentColor="#F97316" icon={ListTodo} />
        <MetricCard label="Overdue Actions" value={c?.overdueTasks ?? 0} sub="Require immediate attention" accentColor={STATUS_COLORS.nonCompliant} icon={Clock} />
      </div>

      {/* Action Queue */}
      <div>
        <p className="text-[14.5px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>My Action Queue</p>
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
                <p className="text-[24px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif', color: c.color }}>{c.value}</p>
                <p className="text-[13px] text-slate-400">{c.sub}</p>
                {c.cta && <button className="mt-1.5 text-[13px] font-semibold text-[#1A3E5C] hover:text-[#D4AF37]" onClick={() => navigate('/org/compliance-tasks')}>{c.cta}</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance & Risk Trend */}
      <ComplianceRiskTrendChart />

      {/* Risk Heatmap + Top Risk Drivers */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3"><RiskHeatmapCard /></div>
        <div className="col-span-2"><TopRiskDriversCard /></div>
      </div>

      {/* Compliance by Regulation & Department */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3">
          <p className="text-[14.5px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Compliance by Regulation</p>
          {regs.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {regs.map(r => {
                const data = [
                  { name: 'Compliant', value: r.compliant, color: STATUS_COLORS.compliant },
                  { name: 'In Progress', value: r.inProgress, color: STATUS_COLORS.inProgress },
                  { name: 'Non-Compliant', value: r.nonCompliant, color: STATUS_COLORS.nonCompliant },
                  { name: 'Not Started', value: r.notStarted, color: STATUS_COLORS.notStarted },
                ];
                return <DonutChart key={r.name} data={data} label={r.name} total={r.total || 1} />;
              })}
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 italic p-4 bg-slate-50 rounded-lg">No assessments yet — create one to see regulation compliance.</p>
          )}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Department Compliance</p>
          {depts.length > 0 ? (
            <div className="space-y-2">
              {depts.sort((a, b) => a.compliant - b.compliant).map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <p className="text-[13px] text-slate-600 w-20 flex-shrink-0 truncate">{d.name}</p>
                  <div className="flex-1 h-4 bg-slate-100 rounded flex overflow-hidden cursor-pointer hover:opacity-80" onClick={() => navigate('/org/assets')}>
                    <div className="h-full" style={{ width: `${d.compliant}%`, background: STATUS_COLORS.compliant }} />
                    <div className="h-full" style={{ width: `${d.inProgress}%`, background: STATUS_COLORS.inProgress }} />
                    <div className="h-full" style={{ width: `${d.nonCompliant}%`, background: STATUS_COLORS.nonCompliant }} />
                    <div className="h-full" style={{ width: `${d.notStarted}%`, background: STATUS_COLORS.notStarted }} />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 w-8 text-right flex-shrink-0">{d.compliant}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 italic">No assessment data yet.</p>
          )}
        </div>
      </div>

      {/* Training & Personnel */}
      <div>
        <p className="text-[14.5px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Training &amp; Personnel</p>
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-4 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/org/lms')}>
            <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Certification Completion</p>
            {lms ? (
              <>
                <p className="text-[27px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{lms.certification.orgCompletionRate}%</p>
                <p className="text-[13px] text-slate-400">{lms.certification.usersWithMandatory}/{lms.certification.totalUsers} users with mandatory certifications</p>
              </>
            ) : <p className="text-[13px] text-slate-400 italic">No training data yet.</p>}
          </div>
          <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-slate-100">
              <p className="text-[15px] font-semibold text-slate-800">Certification Completion by Role</p>
            </div>
            {!lms || lms.certification.perDesignation.length === 0 ? (
              <div className="py-8 text-center"><p className="text-[14px] text-slate-400">No designation data yet.</p></div>
            ) : (
              <div className="divide-y divide-slate-50">
                {lms.certification.perDesignation.map(d => (
                  <div key={d.designation} className="flex items-center gap-3 px-3.5 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-slate-800 truncate">{d.designation}</p>
                      <p className="text-[12.5px] text-slate-400">{d.userCount} user{d.userCount !== 1 ? 's' : ''} · {d.mandatoryCourseCount} mandatory course{d.mandatoryCourseCount !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`text-[13px] font-semibold flex-shrink-0 ${d.avgCompletionRate >= 80 ? 'text-green-600' : d.avgCompletionRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{d.avgCompletionRate}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assessment Progress */}
      <div>
        <p className="text-[14.5px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Active Assessment Progress</p>
        {(stats?.assessmentProgress ?? []).length === 0 ? (
          <p className="text-[14px] text-slate-400 italic p-4 bg-slate-50 rounded-lg">No active assessments right now.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {stats!.assessmentProgress.map(a => (
              <div key={a.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
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

      {/* Gaps + Deadlines */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-slate-800">Controls With No Action Assigned</p>
            <span className="text-[13px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">{c?.unassignedTasks ?? 0} gaps</span>
          </div>
          {(c?.unassignedTasks ?? 0) === 0 ? (
            <div className="py-8 text-center"><p className="text-[14px] text-slate-400">No unassigned controls — great work!</p></div>
          ) : (
            <div className="py-4 px-4"><p className="text-[14px] text-slate-500">View compliance tasks to assign team members to open controls.</p><button onClick={() => navigate('/org/compliance-tasks')} className="mt-2 text-[14px] text-[#1A3E5C] font-medium">Go to Tasks →</button></div>
          )}
        </div>
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Deadlines</p>
          <UpcomingDeadlines items={stats?.upcomingDeadlines} />
        </div>
      </div>
    </div>
  );
}

// ─── IT Admin Dashboard ────────────────────────────────────────────────────────
const GAP_REASON_LABELS: Record<string, string> = {
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
  NON_COMPLIANT_CONFIGURATION: 'Non-compliant Configuration',
  MISSING_DOCUMENTATION: 'Missing Documentation',
  INCORRECT_TOOL_USED: 'Incorrect Tool Used',
  OUTDATED_EVIDENCE: 'Outdated Evidence',
  OTHER: 'Other',
};

function ITAdminDashboard({ stats }: { stats?: DashboardStats }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const c = stats?.counts;
  const tasks = stats?.myTasks ?? [];
  const PRIORITY_COLORS: Record<string, string> = { CRITICAL: '#EF4444', HIGH: '#F97316', MEDIUM: '#EAB308', LOW: '#22C55E', Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
  const STATUS_COLORS: Record<string, string> = { PENDING: '#F59E0B', IN_PROGRESS: '#3B82F6', REJECTED: '#EF4444', COMPLIANT: '#22C55E', EVIDENCE_SUBMITTED: '#06B6D4', Pending: '#F59E0B', 'In Progress': '#3B82F6', Rejected: '#EF4444' };
  const rejected = tasks.filter(t => t.status === 'REJECTED' || t.status === 'Rejected');

  return (
    <div className="space-y-4">
      {stats && <DashboardInsights stats={stats} limit={3} />}

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Tasks" value={c?.myPendingTasks ?? 0} accentColor="#F59E0B" sub="Assigned, not started" icon={ListTodo} />
        <MetricCard label="In Progress" value={c?.myInProgressTasks ?? 0} accentColor={STATUS_COLORS.IN_PROGRESS} sub="Currently working on" icon={PlayCircle} />
        <MetricCard label="Submitted" value={c?.mySubmittedTasks ?? 0} accentColor="#06B6D4" sub="Awaiting review" icon={FileCheck2} />
        <MetricCard label="Rejected" value={c?.myRejectedTasks ?? 0} accentColor={STATUS_COLORS.REJECTED} sub="Need rework" icon={XCircle} />
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
              {t.reasonCodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {t.reasonCodes.map(code => (
                    <span key={code} className="text-[11.5px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-700 rounded">{GAP_REASON_LABELS[code] ?? code}</span>
                  ))}
                </div>
              )}
              <p className="text-[13px] text-amber-700 bg-amber-50 p-2 rounded mb-2">
                {t.rejectionReason ?? 'No remediation notes recorded for this rejection.'}
              </p>
              <button onClick={() => navigate('/org/compliance-tasks')} className="text-[13.5px] font-semibold text-[#1A3E5C] hover:text-[#D4AF37]">View Feedback and Resubmit →</button>
            </div>
          ))}
        </div>
      )}

      {/* Row 2: Task List */}
      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
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
            <div key={t.id} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50" style={{ borderLeft: `4px solid ${PRIORITY_COLORS[t.priority]}` }}>
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

      {/* Risk Heatmap + Top Risk Drivers */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3"><RiskHeatmapCard /></div>
        <div className="col-span-2"><TopRiskDriversCard /></div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Upcoming Due Dates — Next 7 Days</p>
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
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Evidence Submission Status</p>
          {(stats?.myRecentEvidence ?? []).length === 0 ? (
            <p className="text-[14px] text-slate-400 italic">No evidence submitted yet.</p>
          ) : stats!.myRecentEvidence.map((ev, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
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
    <div className="space-y-4">
      {stats && <DashboardInsights stats={stats} limit={3} />}

      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Review" value={c?.pendingReview ?? 0} accentColor="#3B82F6" sub="Evidence awaiting your review" icon={Eye} />
        <MetricCard label="Reviewed Today" value={c?.myReviewedToday ?? 0} accentColor={STATUS_COLORS.compliant} sub="Processed today" icon={CheckCircle2} />
        <MetricCard label="Approved Total" value={c?.myApprovedTotal ?? 0} accentColor="#10B981" sub="All-time, by you" icon={ShieldCheck} />
        <MetricCard label="Rejected Total" value={c?.myRejectedTotal ?? 0} accentColor={STATUS_COLORS.nonCompliant} sub="Sent back for rework" icon={XCircle} />
      </div>

      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-100">
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
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[14.5px] font-bold text-slate-800 mb-0.5">{item.title}</p>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Database className="w-3 h-3 text-[#1A3E5C]/50" />
                    <span className="text-[13.5px] font-semibold text-[#1A3E5C]">{item.asset}</span>
                  </div>
                  <span className="text-[12.5px] text-slate-400">Submitted by: <span className="font-medium text-slate-600">{item.submittedBy}</span></span>
                </div>
                <span className={`text-[12px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${item.waitingDays >= 5 ? 'bg-red-50 text-red-700' : item.waitingDays >= 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  Waiting {item.waitingDays}d
                </span>
                <button onClick={() => navigate('/org/compliance-tasks')} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-semibold text-white bg-[#1A3E5C] rounded-lg hover:bg-[#15324a] transition-colors flex-shrink-0">
                  Review Evidence <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Heatmap + Top Risk Drivers */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3"><RiskHeatmapCard /></div>
        <div className="col-span-2"><TopRiskDriversCard /></div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Active Assessment Progress</p>
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
        <div className="col-span-2 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
          <p className="text-[14px] font-semibold text-slate-800 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>Recently Processed</p>
          {(stats?.myRecentlyReviewed ?? []).length === 0 ? (
            <p className="text-[14px] text-slate-400 italic">You haven't reviewed anything yet.</p>
          ) : stats!.myRecentlyReviewed.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
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
    <div className="space-y-4">
      {stats && <DashboardInsights stats={stats} limit={3} />}

      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending Sign-Off" value={c?.finalReview ?? 0} sub="Internally approved, awaiting final sign-off" accentColor="#F59E0B" icon={ClipboardCheck} />
        <MetricCard label="Signed Off (30d)" value={c?.signedOffLast30Days ?? 0} sub="Tenant-wide, last 30 days" accentColor={STATUS_COLORS.compliant} icon={CheckCircle2} />
        <div className="group bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="h-0.5 bg-green-500 w-full" />
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${STATUS_COLORS.compliant}14` }}>
                <ShieldCheck style={{ width: 14, height: 14, color: STATUS_COLORS.compliant }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Overall Compliance Score</p>
            </div>
            <RiskGauge score={stats?.complianceScore ?? 0} size="md" />
          </div>
        </div>
        <div className="group bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <div className="h-0.5 w-full" style={{ background: RISK_LEVEL(stats?.riskScore ?? 0).color }} />
          <div className="p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ background: `${RISK_LEVEL(stats?.riskScore ?? 0).color}14` }}>
                <AlertTriangle style={{ width: 14, height: 14, color: RISK_LEVEL(stats?.riskScore ?? 0).color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide">Risk Score</p>
            </div>
            <RiskGauge score={stats?.riskScore ?? 0} size="md" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-slate-100">
          <p className="text-[15px] font-semibold text-slate-800">Items Ready for Final Sign-Off</p>
        </div>
        <div className="divide-y divide-slate-50">
          {queue.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-[14.5px] font-bold text-slate-800 mb-0.5">{item.title}</p>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Database className="w-3 h-3 text-[#1A3E5C]/50" />
                  <span className="text-[13.5px] font-semibold text-[#1A3E5C]">{item.asset}</span>
                </div>
              </div>
              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded flex-shrink-0 ${item.waitingDays >= 5 ? 'bg-red-50 text-red-700' : item.waitingDays >= 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                Waiting {item.waitingDays}d
              </span>
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

      {/* Risk Heatmap + Top Risk Drivers */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3"><RiskHeatmapCard /></div>
        <div className="col-span-2"><TopRiskDriversCard /></div>
      </div>

      {(stats?.recentSignOffs ?? []).length > 0 && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-100">
            <p className="text-[15px] font-semibold text-slate-800">Recent Sign-Offs</p>
          </div>
          <div className="divide-y divide-slate-50">
            {stats!.recentSignOffs.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2">
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
          const d = [{ name:'Compliant',value:r.compliant,color:STATUS_COLORS.compliant},{name:'In Progress',value:r.inProgress,color:STATUS_COLORS.inProgress},{name:'Non-Compliant',value:r.nonCompliant,color:STATUS_COLORS.nonCompliant},{name:'Not Started',value:r.notStarted,color:STATUS_COLORS.notStarted}];
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
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-[#D4AF37]/30">
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-[#1A3E5C] tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>{TITLES[role]}</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {stats?.orgName || orgName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
      {isLoading ? <DashSkeleton /> : (
        <>
          {stats && !stats.hasData && (role === 'co' || role === 'ceo') && <GetStartedCTA />}
          {ROLE_DASH[role]}
        </>
      )}
    </div>
  );
}