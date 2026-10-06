import React from 'react';

interface BulletChartProps {
  label: string;
  value: number;
  target: number;
  max?: number;
  color?: string;
  sub?: string;
  icon?: React.ElementType;
}

// Horizontal value bar + target-marker tick — a compact single-number-vs-
// target display for secondary scores (Audit Readiness, Control Coverage),
// so the dashboard doesn't stack a second full gauge next to the risk gauge.
export function BulletChart({ label, value, target, max = 100, color = '#1A3E5C', sub, icon: Icon }: BulletChartProps) {
  const valuePct  = Math.max(0, Math.min(100, (value / max) * 100));
  const targetPct = Math.max(0, Math.min(100, (target / max) * 100));
  return (
    <div className="group">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `${color}14` }}
            >
              <Icon style={{ width: 12, height: 12, color }} />
            </div>
          )}
          <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        </div>
        <p className="text-[17px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{value}</p>
      </div>
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${valuePct}%`, background: color }} />
        <div className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-slate-700" style={{ left: `${targetPct}%` }} />
      </div>
      {sub && <p className="text-[11.5px] text-slate-400 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}
