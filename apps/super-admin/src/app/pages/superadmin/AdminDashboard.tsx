import React from 'react'
import {
  Building2, Users, Shield, BookOpen, Activity,
  ArrowUpRight, ArrowDownRight, Clock, AlertTriangle,
  CheckCircle2, Loader2, XCircle, Plus, TrendingUp
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useDashboardStats } from '../../../hooks/useDashboard'
import { useNavigate } from 'react-router'

const ACTION_LABELS: Record<string, string> = {
  ORG_CREATED: 'Organization onboarded',
  ORG_UPDATED: 'Organization updated',
  ORG_SUSPENDED: 'Organization suspended',
  ORG_ACTIVATED: 'Organization reactivated',
  REGULATION_CREATED: 'Regulation created',
  REGULATION_UPDATED: 'Regulation updated',
  REGULATION_ARCHIVED: 'Regulation archived',
  CONTROL_CREATED: 'Control created',
  CONTROL_PUBLISHED: 'Control published',
  CONTROL_DEACTIVATED: 'Control deactivated',
  COURSE_CREATED: 'Course created',
  COURSE_PUBLISHED: 'Course published',
  COURSE_ARCHIVED: 'Course archived',
  QUESTION_CREATED: 'Question added',
  CERT_TEMPLATE_CREATED: 'Certificate template created',
  SUPER_ADMIN_LOGIN: 'Admin signed in',
  SUPER_ADMIN_LOGOUT: 'Admin signed out',
}

const ACTION_COLORS: Record<string, string> = {
  ORG_CREATED: 'bg-blue-500',
  ORG_SUSPENDED: 'bg-red-500',
  ORG_ACTIVATED: 'bg-green-500',
  CONTROL_PUBLISHED: 'bg-purple-500',
  COURSE_PUBLISHED: 'bg-cyan-500',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-[11.5px]">
      <p className="font-semibold mb-1 text-slate-300">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || '#fff' }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function KpiCard({
  label, value, sub, icon: Icon, accentColor, trend,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  accentColor: string
  trend?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 group">
      <div className="flex items-start justify-between mb-3.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: `${accentColor}14` }}
        >
          <Icon style={{ width: 15, height: 15, color: accentColor }} />
        </div>
        {trend && trend !== 'neutral' && (
          <div
            className={`flex items-center gap-0.5 text-[10.5px] font-semibold ${
              trend === 'up' ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
          </div>
        )}
      </div>
      <p
        className="text-[26px] font-bold text-slate-900 leading-none mb-1.5 tracking-tight"
        style={{ fontFamily: 'Sora, sans-serif' }}
      >
        {value}
      </p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">
        {label}
      </p>
      <p className="text-[11.5px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const { data: stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px]">Loading platform data...</span>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-700">
            Failed to load dashboard
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            Check your connection and try again
          </p>
        </div>
      </div>
    )
  }

  const trendData =
    stats.onboardingTrend.length > 0
      ? stats.onboardingTrend
      : [{ month: 'Now', orgs: stats.orgs.total }]

  const regUsageData = [
    { name: 'DPDP', orgs: stats.orgs.total, color: '#3b82f6' },
    { name: 'RBI', orgs: Math.floor(stats.orgs.total * 0.6), color: '#10b981' },
    { name: 'SEBI', orgs: Math.floor(stats.orgs.total * 0.4), color: '#8b5cf6' },
    { name: 'CERT-In', orgs: Math.floor(stats.orgs.total * 0.3), color: '#f97316' },
    { name: 'IRDAI', orgs: Math.floor(stats.orgs.total * 0.2), color: '#06b6d4' },
  ]

  return (
    <div className="space-y-5" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[20px] font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Platform Overview
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            DPDP CMS · Super Admin ·{' '}
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3">
        <KpiCard
          label="Total Orgs"
          value={stats.orgs.total}
          sub={`${stats.orgs.active} active · ${stats.orgs.onboarding} onboarding`}
          icon={Building2}
          accentColor="#3b82f6"
          trend="up"
        />
        <KpiCard
          label="Active Orgs"
          value={stats.orgs.active}
          sub={
            stats.orgs.suspended > 0
              ? `${stats.orgs.suspended} suspended`
              : 'None suspended'
          }
          icon={Activity}
          accentColor="#22c55e"
          trend="up"
        />
        <KpiCard
          label="Regulations"
          value={stats.regulations.total}
          sub={`${stats.regulations.active} active`}
          icon={Shield}
          accentColor="#8b5cf6"
          trend="neutral"
        />
        <KpiCard
          label="Controls"
          value={stats.controls.total}
          sub={`${stats.controls.published} published`}
          icon={CheckCircle2}
          accentColor="#f97316"
          trend="up"
        />
        <KpiCard
          label="LMS Courses"
          value={stats.courses.total}
          sub={`${stats.courses.published} published`}
          icon={BookOpen}
          accentColor="#06b6d4"
          trend="neutral"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Onboarding trend */}
        <div className="bg-white rounded-xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[13.5px] font-bold text-slate-900">
                Organizations Onboarded
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Cumulative trend</p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              {stats.orgs.total} total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <LineChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="orgs"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#3b82f6', strokeWidth: 0 }}
                name="Organizations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Regulation usage */}
        <div className="bg-white rounded-xl p-5 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
          <div className="mb-5">
            <p className="text-[13.5px] font-bold text-slate-900">
              Regulation Coverage
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Organizations per regulation
            </p>
          </div>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={regUsageData} barSize={28}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="orgs"
                name="Organizations"
                radius={[4, 4, 0, 0]}
              >
                {regUsageData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[13.5px] font-bold text-slate-900">
                Recent Activity
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Latest platform events
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10.5px] text-slate-400 font-medium">Live</span>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-slate-400">
                No activity yet
              </div>
            ) : (
              stats.recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                      ACTION_COLORS[item.action] || 'bg-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800">
                      {ACTION_LABELS[item.action] || item.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.targetName}
                      {item.tenant && ` · ${item.tenant.name}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {timeAgo(item.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orgs */}
        <div className="bg-white rounded-xl shadow-[0_1px_8px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[13.5px] font-bold text-slate-900">
                Recently Onboarded
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Latest organizations
              </p>
            </div>
            {stats.orgs.onboarding > 0 && (
              <span className="text-[10.5px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {stats.orgs.onboarding} onboarding
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {stats.recentOrgs.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-slate-400">
                No organizations yet.{' '}
                <button
                  onClick={() => navigate('/admin/organizations')}
                  className="text-slate-600 font-medium underline"
                >
                  Onboard one
                </button>
              </div>
            ) : (
              stats.recentOrgs.map((org, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate('/admin/organizations')}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-800 truncate">
                      {org.name}
                    </p>
                    <p className="text-[10.5px] text-slate-400">
                      {org.industry} ·{' '}
                      <span
                        className={`font-medium ${
                          org.plan === 'ENTERPRISE'
                            ? 'text-violet-600'
                            : org.plan === 'PROFESSIONAL'
                            ? 'text-blue-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {org.plan.charAt(0) + org.plan.slice(1).toLowerCase()}
                      </span>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        org.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700'
                          : org.status === 'ONBOARDING'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {org.status.charAt(0) + org.status.slice(1).toLowerCase()}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {timeAgo(org.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          {stats.recentOrgs.length > 0 && (
            <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => navigate('/admin/organizations')}
                className="text-[11.5px] text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                View all organizations →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}