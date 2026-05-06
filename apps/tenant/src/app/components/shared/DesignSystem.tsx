import React from 'react';
import { TenantRole, ROLE_COLORS, ROLE_LABELS } from '../../context/AppContext';

// ─── Status Chip ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  'Compliant':            { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  'Fully Compliant':      { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  'In Progress':          { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'  },
  'Evidence Submitted':   { bg: 'bg-sky-50',     text: 'text-sky-700',    dot: 'bg-sky-500'   },
  'Under Review':         { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-500'},
  'Approved (Internal)':  { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500'},
  'Final Review':         { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  'Non-Compliant':        { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'   },
  'Rejected':             { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'   },
  'Not Started':          { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
  'Pending':              { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  'Pending Invite':       { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  'Overdue':              { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500'   },
  'Active':               { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  'Inactive':             { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
  'Draft':                { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  'Archived':             { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
  'Completed':            { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  'Retired':              { bg: 'bg-slate-100',  text: 'text-slate-500',  dot: 'bg-slate-400' },
  'Published':            { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
  'Partially Compliant':  { bg: 'bg-sky-50',     text: 'text-sky-700',    dot: 'bg-sky-500'   },
};

export function StatusChip({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dot}`} />
      {status}
    </span>
  );
}

// ─── Priority Chip ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  'Critical': { bg: 'bg-red-50',    text: 'text-red-700'    },
  'High':     { bg: 'bg-orange-50', text: 'text-orange-700' },
  'Medium':   { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  'Low':      { bg: 'bg-slate-100', text: 'text-slate-500'  },
};

export function PriorityChip({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG['Low'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${config.bg} ${config.text}`}>
      {priority}
    </span>
  );
}

// ─── Role Badge ─────────────────────────────────────────────────────────────
export function RoleBadge({ role }: { role: TenantRole | string }) {
  const color = ROLE_COLORS[role as TenantRole] || '#8A9BB8';
  const label = ROLE_LABELS[role as TenantRole] || role;
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium"
      style={{ background: `${color}18`, border: `1px solid ${color}66`, color }}>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Asset Type Chip ────────────────────────────────────────────────────────
const ASSET_TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  'Data Asset':           { bg: 'bg-blue-50',   text: 'text-blue-700'   },
  'System / Application': { bg: 'bg-violet-50', text: 'text-violet-700' },
  'Data Flow':            { bg: 'bg-sky-50',    text: 'text-sky-700'    },
  'Third-Party Vendor':   { bg: 'bg-amber-50',  text: 'text-amber-700'  },
  'Consent Mechanism':    { bg: 'bg-green-50',  text: 'text-green-700'  },
};

export function AssetTypeChip({ type }: { type: string }) {
  const config = ASSET_TYPE_CONFIG[type] || { bg: 'bg-slate-100', text: 'text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${config.bg} ${config.text}`}>
      {type}
    </span>
  );
}

// ─── Metric Card ────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function MetricCard({ label, value, sub, accentColor = '#3B82F6', children, onClick }: MetricCardProps) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="h-0.5 w-full" style={{ background: accentColor }} />
      <div className="p-4">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-[28px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({ compliant, inProgress, total }: { compliant: number; inProgress: number; total: number }) {
  const compliantPct = total > 0 ? (compliant / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgress / total) * 100 : 0;
  return (
    <div className="flex h-1.5 rounded bg-slate-200 overflow-hidden">
      <div className="h-full bg-green-500 transition-all" style={{ width: `${compliantPct}%` }} />
      <div className="h-full bg-blue-500 transition-all" style={{ width: `${inProgressPct}%` }} />
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{title}</h1>
        {sub && <p className="text-[13px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
interface BtnProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function Btn({ children, variant = 'primary', size = 'md', onClick, className = '', icon, disabled }: BtnProps) {
  const base = 'inline-flex items-center gap-2 rounded-md font-medium transition-all cursor-pointer disabled:opacity-50';
  const variants = {
    primary:   'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger:    'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    ghost:     'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100',
  };
  const sizes = {
    sm: 'text-[12px] px-3 h-7',
    md: 'text-[13px] px-3.5 h-8',
    lg: 'text-[14px] px-4 h-9',
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
      {label && <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:bg-slate-50"
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
      {label && <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>}
      <select
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-slate-900 text-[13px] focus:outline-none focus:border-blue-500"
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
      {label && <label className="block text-[12px] font-medium text-slate-600 mb-1">{label}</label>}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function DataTable({ headers, children, empty }: {
  headers: string[]; children: React.ReactNode; empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {headers.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
      {empty && (
        <div className="text-center py-12">
          <p className="text-[14px] text-slate-400">No data found</p>
        </div>
      )}
    </div>
  );
}

export function TR({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <tr
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 text-[13px] text-slate-700 ${className}`}>{children}</td>
  );
}

// ─── Mono Badge ──────────────────────────────────────────────────────────────
export function MonoBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
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
      <div className="text-slate-300 mb-3">{icon}</div>
      <h3 className="text-[15px] font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-[13px] text-slate-400 max-w-xs mb-3">{description}</p>
      {action}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ initials, color, size = 'sm' }: { initials: string; color: string; size?: 'xs' | 'sm' | 'md' }) {
  const sizes = { xs: 'w-6 h-6 text-[10px]', sm: 'w-8 h-8 text-[12px]', md: 'w-10 h-10 text-[14px]' };
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 ${sizes[size]}`}
      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
      {initials}
    </span>
  );
}

// ─── Section Divider ─────────────────────────────────────────────────────────
export function Divider() {
  return <div className="h-px bg-slate-200 my-3" />;
}

// ─── Tab Nav ─────────────────────────────────────────────────────────────────
export function TabNav({ tabs, active, onChange }: {
  tabs: string[]; active: string; onChange: (t: string) => void;
}) {
  return (
    <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 text-[13px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
            ${active === t
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
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
        className="pl-8 pr-3 h-8 rounded-md bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 w-56"
      />
    </div>
  );
}

// ─── Info Banner ─────────────────────────────────────────────────────────────
export function InfoBanner({ children, variant = 'info' }: {
  children: React.ReactNode;
  variant?: 'info' | 'warning' | 'error' | 'success';
}) {
  const configs = {
    info:    'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    error:   'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };
  return (
    <div className={`border px-4 py-2.5 rounded-lg text-[13px] ${configs[variant]}`}>
      {children}
    </div>
  );
}