import { useNavigate } from 'react-router';
import { useRiskAnalysis } from '../../../hooks/useRisk';

// Same 5-band scale as apps/tenant/src/app/pages/risk/Risk.tsx, reused
// verbatim (not the dashboard's own RISK_BAND_COLORS) so a cell's color
// means the same thing here as it does on the full Risk Analysis page
// this widget links to.
const RISK_LEVEL = (score: number) => {
  if (score <= 20) return { label: 'Low', color: '#10B981', bg: 'bg-green-50', text: 'text-green-700' };
  if (score <= 40) return { label: 'Moderate', color: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700' };
  if (score <= 60) return { label: 'High', color: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700' };
  if (score <= 80) return { label: 'Critical', color: '#EF4444', bg: 'bg-red-50', text: 'text-red-700' };
  return { label: 'Severe', color: '#991B1B', bg: 'bg-red-100', text: 'text-red-900' };
};

// Compact, non-interactive summary of the department x regulation risk
// matrix already computed by risk.service.ts and fully rendered (with
// drill-down) on /org/risk/analysis — this widget just surfaces it on the
// dashboard so it doesn't require a separate trip to notice.
export function RiskHeatmapCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useRiskAnalysis();
  const rows = data?.heatmap ?? [];
  const regulations = data?.regulations ?? [];

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <p className="text-[14px] font-semibold text-slate-800" style={{ fontFamily: 'Cinzel, serif' }}>Risk Heatmap</p>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
          {[['Low', '#10B981'], ['Moderate', '#F59E0B'], ['High', '#F97316'], ['Critical', '#EF4444'], ['Severe', '#991B1B']].map(([l, c]) => (
            <div key={l} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c }} />{l}</div>
          ))}
        </div>
      </div>
      <div className="p-3">
        {isLoading ? (
          <p className="text-[13px] text-slate-400">Loading…</p>
        ) : rows.length === 0 || regulations.length === 0 ? (
          <p className="text-[13px] text-slate-400 italic">No risk data yet — add departments, assets and tasks to see a heatmap.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-separate" style={{ borderSpacing: '3px' }}>
              <thead>
                <tr>
                  <th className="text-left font-medium text-slate-400 pr-2 sticky left-0 bg-white">Dept</th>
                  {regulations.map(r => (
                    <th key={r.id} className="font-medium text-slate-400 px-1 whitespace-nowrap">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.departmentId}>
                    <td className="font-medium text-slate-600 pr-2 whitespace-nowrap sticky left-0 bg-white">{row.departmentName}</td>
                    {row.cells.map(cell => {
                      const level = RISK_LEVEL(cell.score);
                      return (
                        <td key={cell.regulationId} className="text-center">
                          {cell.hasData ? (
                            <span className={`inline-flex items-center justify-center w-full min-w-[38px] px-1 py-0.5 rounded font-semibold ${level.bg} ${level.text}`}>
                              {cell.score}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate('/org/risk/analysis')}
        className="w-full text-center text-[12.5px] text-[#1A3E5C] hover:text-[#D4AF37] font-medium py-1.5 border-t border-slate-100"
      >
        View Full Risk Analysis →
      </button>
    </div>
  );
}
