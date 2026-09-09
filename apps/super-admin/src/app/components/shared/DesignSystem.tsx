import React from 'react';

// ─── Brand Logo ───────────────────────────────────────────────────────────────
// Source file: apps/super-admin/public/aashray_logo.png — identical asset to
// the tenant app's copy, so the crop math (measured pixel-for-pixel against
// the source in the tenant build) carries over exactly: the shield's opaque
// pixels span x 120-380 / y 56-308 of the 500x500 canvas. The crop window is
// x 85-415 / y 0-330 (151.5% scale, offset 0%/-25.8%) — generous padding on
// every side, stopping exactly at the wordmark. No image edit needed.
const LOGO_SRC = '/aashray_logo.png';

export function LogoIcon({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden flex-shrink-0 ${className}`}>
      <img
        src={LOGO_SRC}
        alt="Aashray Infotech"
        className="absolute max-w-none max-h-none"
        style={{ width: '151.5%', height: '151.5%', top: '0%', left: '-25.8%', objectFit: 'contain' }}
      />
    </div>
  );
}

// Full mark (shield + wordmark), for brand-forward placements like the login screen.
export function LogoFull({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return <img src={LOGO_SRC} alt="Aashray Infotech" className={className} style={{ objectFit: 'contain', ...style }} />;
}

// ─── Brand Spinner ────────────────────────────────────────────────────────────
export function BrandSpinner({ size = 20, ring = 'light' }: { size?: number; ring?: 'light' | 'dark' }) {
  const ringClass = ring === 'light' ? 'border-white/25 border-t-white' : 'border-[#1A3E5C]/20 border-t-[#1A3E5C]';
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <span className={`absolute inset-0 rounded-full border-2 ${ringClass} animate-spin`} />
      <LogoIcon className="w-[62%] h-[62%] animate-pulse" />
    </span>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#64748B]/25">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#64748B]/10 flex items-center justify-center flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#64748B]" />
        </div>
        <div>
          <h1 className="text-[26px] font-bold text-[#1A3E5C] tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>{title}</h1>
          {sub && <p className="text-[15px] text-slate-500 mt-1">{sub}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
export function MetricCard({ label, value, sub, accentColor = '#1A3E5C', children, onClick }: {
  label: string; value: string | number; sub?: string; accentColor?: string; children?: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      className="bg-white border border-[#64748B]/25 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="h-0.5 w-full" style={{ background: accentColor }} />
      <div className="p-4">
        <p className="text-[13px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-[34px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{value}</p>
        {sub && <p className="text-[13px] text-slate-400">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', onClick, className = '', icon, disabled }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; className?: string; icon?: React.ReactNode; disabled?: boolean;
}) {
  const base = 'inline-flex items-center gap-2 rounded-md font-medium transition-all cursor-pointer disabled:opacity-50';
  const variants = {
    primary:   'bg-[#1A3E5C] text-white hover:bg-[#15324a]',
    secondary: 'bg-white text-slate-700 border border-[#64748B]/30 hover:bg-[#64748B]/[0.06]',
    danger:    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    ghost:     'bg-transparent text-slate-500 hover:text-[#1A3E5C] hover:bg-slate-100',
  };
  const sizes = {
    sm: 'text-[13px] px-3 h-8',
    md: 'text-[14px] px-3.5 h-9',
    lg: 'text-[15px] px-4 h-10',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────
export function InputField({ label, placeholder, type = 'text', value, onChange, className = '', disabled }: {
  label?: string; placeholder?: string; type?: string;
  value?: string; onChange?: (v: string) => void; className?: string; disabled?: boolean;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-[13px] font-medium text-slate-600 mb-1.5">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[14.5px] focus:outline-none focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 disabled:opacity-50 disabled:bg-slate-50"
      />
    </div>
  );
}

// ─── Select Field ────────────────────────────────────────────────────────────
export function SelectField({ label, options, value, onChange, className = '' }: {
  label?: string; options: { value: string; label: string }[];
  value?: string; onChange?: (v: string) => void; className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-[13px] font-medium text-slate-600 mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-10 px-3 rounded-md bg-white border border-slate-300 text-slate-900 text-[14.5px] focus:outline-none focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── TextArea Field ───────────────────────────────────────────────────────────
export function TextareaField({ label, placeholder, value, onChange, rows = 3, className = '' }: {
  label?: string; placeholder?: string; value?: string;
  onChange?: (v: string) => void; rows?: number; className?: string;
}) {
  return (
    <div className={className}>
      {label && <label className="block text-[13px] font-medium text-slate-600 mb-1.5">{label}</label>}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[14.5px] focus:outline-none focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 resize-none"
      />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-[#64748B]/25 rounded-lg p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function DataTable({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#1A3E5C]/[0.04] border-b border-[#64748B]/25">
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left text-[13px] font-semibold text-[#1A3E5C] uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {empty && (
        <div className="text-center py-12">
          <p className="text-[16px] text-slate-400">No data found</p>
        </div>
      )}
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-[#1A3E5C]/[0.03] transition-colors cursor-pointer" onClick={onClick}>
      {children}
    </tr>
  );
}

export function TD({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-[15px] text-slate-700 ${className}`}>{children}</td>;
}

// ─── Mono Badge ──────────────────────────────────────────────────────────────
export function MonoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[13px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
      {children}
    </span>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-[#64748B]/50 mb-3">{icon}</div>
      <h3 className="text-[17px] font-semibold text-slate-800 mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{title}</h3>
      <p className="text-[15px] text-slate-400 max-w-xs mb-3">{description}</p>
      {action}
    </div>
  );
}

// ─── Section Divider ─────────────────────────────────────────────────────────
export function Divider() {
  return <div className="h-px bg-[#64748B]/20 my-3" />;
}

// ─── Tab Nav ─────────────────────────────────────────────────────────────────
export function TabNav({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-[#64748B]/20 mb-4 overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-[14.5px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
            ${active === t
              ? 'text-[#1A3E5C] border-[#64748B]'
              : 'text-slate-500 border-transparent hover:text-[#1A3E5C] hover:border-slate-300'
            }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

// ─── Search Input ────────────────────────────────────────────────────────────
export function SearchInput({ placeholder = 'Search...', value, onChange }: {
  placeholder?: string; value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="pl-8 pr-3 h-9 rounded-md bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-[14.5px] focus:outline-none focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10 w-56"
      />
    </div>
  );
}

// ─── Info Banner ─────────────────────────────────────────────────────────────
export function InfoBanner({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'error' | 'success' }) {
  const configs = {
    info:    'bg-[#1A3E5C]/[0.06] border-[#1A3E5C]/25 text-[#1A3E5C]',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };
  return (
    <div className={`border px-4 py-3 rounded-lg text-[14.5px] ${configs[variant]}`}>
      {children}
    </div>
  );
}
