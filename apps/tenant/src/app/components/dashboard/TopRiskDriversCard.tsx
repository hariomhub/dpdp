import { useNavigate } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { useRiskAnalysis } from '../../../hooks/useRisk';

// Same scale as RiskHeatmapCard.tsx / Risk.tsx — kept in sync intentionally.
const RISK_LEVEL = (score: number) => {
  if (score <= 20) return { color: '#10B981' };
  if (score <= 40) return { color: '#F59E0B' };
  if (score <= 60) return { color: '#F97316' };
  if (score <= 80) return { color: '#EF4444' };
  return { color: '#991B1B' };
};

// Compact version of Risk.tsx's top-drivers list — the source data is
// already capped to the top 5 server-side (risk.service.ts), this shows
// the top 3 on the dashboard with a link through to the rest.
export function TopRiskDriversCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useRiskAnalysis();
  const drivers = (data?.topDrivers ?? []).slice(0, 3);

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100">
        <p className="text-[14px] font-semibold text-slate-800" style={{ fontFamily: 'Cinzel, serif' }}>Top Risk Drivers</p>
      </div>
      {isLoading ? (
        <p className="text-[13px] text-slate-400 p-3.5">Loading…</p>
      ) : drivers.length === 0 ? (
        <p className="text-[13px] text-slate-400 italic p-3.5">No risk-driving assets identified yet.</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {drivers.map((d, i) => {
            const level = RISK_LEVEL(d.contribution * 3.5);
            return (
              <div key={d.assetId} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition-colors">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                  style={{ background: level.color }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{d.assetName}</p>
                  <p className="text-[11.5px] text-slate-400">{d.departmentName} · {d.nonCompliant} rejected · {d.overdue} overdue</p>
                </div>
                <p className="text-[13px] font-bold text-red-600 flex-shrink-0">{d.contribution}%</p>
              </div>
            );
          })}
        </div>
      )}
      <button
        onClick={() => navigate('/org/risk/analysis')}
        className="w-full flex items-center justify-center gap-1.5 text-[12.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium py-1.5 border-t border-slate-100"
      >
        View All <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}
