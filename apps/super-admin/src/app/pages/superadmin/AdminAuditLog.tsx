import React, { useState } from 'react'
import { Download, Search, Shield, Loader2, XCircle } from 'lucide-react'
import { useAuditLogs } from '../../../hooks/useAuditLogs'

const TARGET_COLORS: Record<string, string> = {
  tenant: 'bg-blue-50 text-blue-700',
  control: 'bg-purple-50 text-purple-700',
  lms_course: 'bg-amber-50 text-amber-700',
  quiz_question: 'bg-amber-50 text-amber-700',
  regulation: 'bg-green-50 text-green-700',
  certificate_template: 'bg-pink-50 text-pink-700',
  system: 'bg-slate-100 text-slate-600',
}

const ACTION_LABELS: Record<string, string> = {
  ORG_CREATED: 'Organization Onboarded',
  ORG_UPDATED: 'Organization Updated',
  ORG_SUSPENDED: 'Organization Suspended',
  ORG_ACTIVATED: 'Organization Activated',
  ORG_DELETED: 'Organization Deleted',
  REGULATION_CREATED: 'Regulation Created',
  REGULATION_UPDATED: 'Regulation Updated',
  REGULATION_ARCHIVED: 'Regulation Archived',
  CONTROL_CREATED: 'Control Created',
  CONTROL_UPDATED: 'Control Updated',
  CONTROL_PUBLISHED: 'Control Published',
  CONTROL_DEACTIVATED: 'Control Deactivated',
  COURSE_CREATED: 'Course Created',
  COURSE_UPDATED: 'Course Updated',
  COURSE_PUBLISHED: 'Course Published',
  COURSE_ARCHIVED: 'Course Archived',
  QUESTION_CREATED: 'Question Added',
  QUESTION_UPDATED: 'Question Updated',
  CERT_TEMPLATE_CREATED: 'Certificate Template Created',
  CERT_TEMPLATE_UPDATED: 'Certificate Template Updated',
  SUPER_ADMIN_LOGIN: 'Admin Signed In',
  SUPER_ADMIN_LOGOUT: 'Admin Signed Out',
  SETTINGS_UPDATED: 'Settings Updated',
}

export function AdminAuditLogPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const queryParams: Record<string, string> = {}
  if (search) queryParams.search = search
  if (actionFilter) queryParams.action = actionFilter
  if (dateFrom) queryParams.dateFrom = dateFrom
  if (dateTo) queryParams.dateTo = dateTo

  const { data, isLoading, error } = useAuditLogs(queryParams)
  const logs = data?.data ?? []
  const total = data?.meta?.total ?? 0

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[20px] font-bold text-slate-900"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Audit Log
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            Immutable record of all Super Admin actions · {total} entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full text-[10.5px] text-amber-700 font-semibold">
            <Shield className="w-3 h-3" /> Tamper-proof · Read only
          </div>
          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-[12.5px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by target or action…"
            className="pl-8 pr-3 h-8 w-60 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white"
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400"
          />
          <span className="text-[11px] text-slate-400 font-medium">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400"
          />
        </div>
        <span className="ml-auto text-[11px] text-slate-400 font-medium">
          {logs.length} of {total} entries
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px]">Loading audit logs...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-600">Failed to load audit logs</p>
            </div>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Timestamp', 'Admin User', 'Action', 'Target', 'Details'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-[10.5px] text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                    {log.superAdmin?.name ?? 'System'}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                    {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          TARGET_COLORS[log.targetType] ?? 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {log.targetType}
                      </span>
                      <span className="text-slate-700 text-[12px]">
                        {log.targetName ?? log.targetId ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 max-w-xs">
                    <p className="truncate">
                      {log.details
                        ? Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')
                        : '—'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && !error && logs.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-[13px]">
            No audit entries match your filters.
          </div>
        )}
      </div>
    </div>
  )
}