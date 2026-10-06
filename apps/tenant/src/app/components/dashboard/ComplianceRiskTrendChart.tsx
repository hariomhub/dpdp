import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDashboardHistory } from '../../../hooks/useDashboard';
import { STATUS_COLORS, BRAND } from '../shared/dashboardColors';

// First genuine trend chart in the app — reads real daily snapshots
// (apps/tenant-api's dashboard-snapshot job). Stays empty with an
// explanatory placeholder until at least two days of history exist.
export function ComplianceRiskTrendChart() {
  const [range, setRange] = useState<'30d' | '90d'>('30d');
  const { data: points, isLoading } = useDashboardHistory(range);

  const hasData = (points ?? []).some(p => p.complianceScore !== null || p.riskScore !== null);

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] p-3.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[14px] font-semibold text-slate-800" style={{ fontFamily: 'Cinzel, serif' }}>Compliance &amp; Risk Trend</p>
        <div className="flex gap-1">
          {(['30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 rounded text-[12px] font-medium transition-all ${range === r ? 'bg-[#1A3E5C] text-white' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              {r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-[13px] text-slate-400">Loading…</p>
        </div>
      ) : !hasData ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-[13px] text-slate-400 italic text-center max-w-sm">
            Trend data will appear here starting tomorrow — daily snapshots need at least two days of history to plot a line.
          </p>
        </div>
      ) : (
        <div style={{ height: 176 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, borderColor: '#D4AF37' }} />
              <Legend wrapperStyle={{ fontSize: 12.5 }} />
              <Line type="monotone" dataKey="complianceScore" name="Compliance Score" stroke={STATUS_COLORS.compliant} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="riskScore" name="Risk Score" stroke={BRAND.navy} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
