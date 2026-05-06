import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, Building2, ShieldCheck, GraduationCap,
  CreditCard, Settings, ChevronLeft, ChevronRight,
  LogOut, ArrowLeft, ScrollText, BookOpen, ClipboardList
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ADMIN_NAV = [
  { label: '── Platform ──────────────', type: 'section' },
  { icon: LayoutDashboard, label: 'Dashboard',           path: '/admin/dashboard' },
  { icon: Building2,       label: 'Organizations',       path: '/admin/organizations' },
  { icon: ClipboardList,   label: 'Regulations & Controls', path: '/admin/controls' },
  { icon: GraduationCap,   label: 'LMS',                 path: '/admin/lms' },
  { label: '── System ─────────────────', type: 'section' },
  { icon: Settings,        label: 'Platform Settings',   path: '/admin/settings' },
  { icon: CreditCard,      label: 'Billing',             path: '/admin/billing' },
  { icon: ScrollText,      label: 'Audit Log',           path: '/admin/audit-log' },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Admin Sidebar */}
      <aside className={`flex flex-col bg-white border-r-2 border-red-200 transition-all duration-200 flex-shrink-0 relative ${sidebarCollapsed ? 'w-12' : 'w-[220px]'}`}>
        {/* Crimson left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-600" />

        {/* Logo */}
        <div className="flex items-center h-12 px-3 border-b border-red-100 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-slate-900 block" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP CMS</span>
                <span className="text-[9.5px] text-red-500 font-semibold uppercase tracking-wider">Super Admin</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="ml-auto p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-red-50">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Admin Badge */}
        {!sidebarCollapsed && (
          <div className="mx-3 mt-3 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9.5px] font-bold text-red-600 uppercase tracking-wider">Super Admin Mode</span>
            </div>
            <p className="text-[10px] text-red-400">Platform-level access</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 mt-1">
          {ADMIN_NAV.map((item, i) => {
            if (item.type === 'section') {
              if (sidebarCollapsed) return <div key={i} className="h-px bg-red-50 my-1.5 mx-2" />;
              return (
                <p key={i} className="text-[9px] font-bold text-red-300 uppercase tracking-widest px-3 py-1.5 mt-1">
                  {item.label}
                </p>
              );
            }
            const Icon = item.icon!;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path!}
                className={`flex items-center gap-2.5 mx-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all relative group
                  ${isActive ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:text-red-700 hover:bg-red-50'}`}>
                <Icon className="flex-shrink-0" style={{ width: 15, height: 15 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white rounded text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-red-100 p-2 flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={() => setSidebarCollapsed(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-red-50">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => navigate('/login')} className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-red-50">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 p-1.5 mb-1">
                <span className="w-7 h-7 rounded-full bg-red-100 border border-red-200 flex items-center justify-center text-[11px] font-semibold text-red-600 flex-shrink-0">SA</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 truncate">Admin User</p>
                  <p className="text-[10px] text-slate-400 truncate">admin@dpdpcms.in</p>
                </div>
              </div>
              <button onClick={() => navigate('/org/dashboard')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 rounded-md hover:bg-red-50 transition-colors mb-0.5">
                <ArrowLeft className="w-3 h-3" /> Tenant Portal
              </button>
              <button onClick={() => navigate('/login')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 rounded-md hover:bg-red-50 transition-colors">
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-12 bg-white border-b border-red-100 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1">
            <nav className="flex items-center gap-1 text-[12px]">
              <span className="text-red-600 font-semibold">Super Admin</span>
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-slate-800 font-medium capitalize">
                {location.pathname.split('/').slice(-1)[0].replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </nav>
          </div>
          <span className="text-[10.5px] text-slate-400 bg-red-50 border border-red-100 px-2 py-0.5 rounded">Internal · Not visible to orgs</span>
          <button onClick={() => navigate('/org/dashboard')} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-3 h-3" /> Tenant Portal
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
