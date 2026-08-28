import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard, Database, ShieldCheck, ClipboardList, Zap,
  BarChart2, Bell, GraduationCap, Users,
  Settings, LogOut, ChevronLeft, ChevronRight,
  Search, ChevronDown, AlertTriangle, CheckSquare,
  TrendingDown, FileText
} from 'lucide-react';
import { useApp, ROLE_LABELS, ROLE_COLORS, ROLE_INITIALS, TenantRole } from '../../context/AppContext';
import { NOTIFICATIONS } from '../../data/mockData';

// ─── Nav Structure ────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard',        path: '/org/dashboard',        roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  {
    icon: TrendingDown, label: 'Risk & Analytics', group: 'risk', roles: ['ceo','co','it_admin','internal_auditor','external_auditor'],
    children: [
      { icon: FileText,    label: 'Risk Reports',  path: '/org/risk/reports',   roles: ['ceo','co'] },
      { icon: BarChart2,   label: 'Risk Analysis', path: '/org/risk/analysis',  roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
    ],
  },
  { type: 'divider' },
  { icon: Database,        label: 'Assets',            path: '/org/assets',           roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { icon: ShieldCheck,     label: 'Controls',          path: '/org/controls',         roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { icon: ClipboardList,   label: 'Assessments',       path: '/org/assessments',      roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { icon: CheckSquare,     label: 'Compliance Tasks',  path: '/org/compliance-tasks', roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { type: 'divider' },
  { icon: BarChart2,       label: 'Reports',           path: '/org/reports',          roles: ['ceo','co'] },
  { icon: Bell,            label: 'Alerts',            path: '/org/alerts',           roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { type: 'divider' },
  { icon: GraduationCap,   label: 'LMS',               path: '/org/lms',              roles: ['ceo','co','it_admin','internal_auditor','external_auditor'] },
  { type: 'divider' },
  { icon: Users,           label: 'Users',             path: '/org/users',            roles: ['ceo','co'] },
  { icon: Settings,        label: 'Admin Settings',    path: '/org/settings',         roles: ['ceo','co'] },
] as const;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, setRole, sidebarCollapsed, setSidebarCollapsed, orgName } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [riskExpanded, setRiskExpanded] = useState(
    location.pathname.startsWith('/org/risk')
  );
  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;

  const roleColor    = ROLE_COLORS[role];
  const roleName     = ROLE_LABELS[role];
  const displayName  = useApp().userName || ROLE_LABELS[role];
  const displayEmail = useApp().userEmail;
  const roleInitials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || ROLE_INITIALS[role];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className={`flex flex-col bg-[#1A3E5C] border-r border-[#D4AF37]/35 transition-all duration-200 flex-shrink-0 ${sidebarCollapsed ? 'w-14' : 'w-60'}`}>
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-white/20 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-7 h-7 rounded bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#1A3E5C]" />
              </div>
              <div className="min-w-0">
                <span className="text-[16px] font-bold text-white tracking-wide block" style={{ fontFamily: 'Cinzel, serif' }}>DPDP CMS</span>
                <span className="text-[12px] text-white/72 truncate block">{orgName}</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-7 h-7 rounded bg-[#D4AF37] flex items-center justify-center mx-auto">
              <ShieldCheck className="w-4 h-4 text-[#1A3E5C]" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-1 rounded text-white/72 hover:text-white hover:bg-white/18 flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden">
          {(NAV_ITEMS as unknown as any[]).map((item: any, i: number) => {
            if (item.type === 'divider') return <div key={i} className="h-px bg-white/18 my-1 mx-3" />;

            // Risk & Analytics collapsible group
            if (item.group === 'risk') {
              if (!item.roles?.includes(role)) return null;
              const Icon = item.icon;
              const isGroupActive = location.pathname.startsWith('/org/risk');
              const visibleChildren = item.children.filter((c: any) => c.roles.includes(role));
              return (
                <div key="risk-group">
                  <button
                    onClick={() => sidebarCollapsed ? navigate('/org/risk/analysis') : setRiskExpanded(v => !v)}
                    className={`w-full flex items-center gap-2.5 mx-2 pl-[9px] pr-2.5 py-1.5 rounded-md text-[14.5px] font-medium transition-all group border-l-2
                      ${isGroupActive ? 'bg-white/[0.15] text-white border-[#D4AF37]' : 'text-white/82 hover:text-white hover:bg-white/[0.1] border-transparent'}`}
                    style={{ width: sidebarCollapsed ? 'calc(100% - 16px)' : 'calc(100% - 16px)' }}
                  >
                    <Icon className="flex-shrink-0" style={{ width: 17, height: 17 }} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${riskExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A3E5C] text-white rounded text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity ring-1 ring-[#D4AF37]/45">
                        {item.label}
                      </div>
                    )}
                  </button>
                  {!sidebarCollapsed && riskExpanded && (
                    <div className="ml-5 mt-0.5 space-y-0.5">
                      {visibleChildren.map((child: any) => {
                        const CIcon = child.icon;
                        const isActive = location.pathname === child.path;
                        return (
                          <Link key={child.path} to={child.path}
                            className={`flex items-center gap-2 mx-2 px-2.5 py-1.5 rounded-md text-[14px] font-medium transition-all
                              ${isActive ? 'bg-white/[0.15] text-white' : 'text-white/72 hover:text-white hover:bg-white/[0.1]'}`}>
                            <CIcon className="flex-shrink-0" style={{ width: 14, height: 14 }} />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            if (!item.roles?.includes(role)) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link key={item.path} to={item.path}
                className={`flex items-center gap-2.5 mx-2 pl-[9px] pr-2.5 py-1.5 rounded-md text-[14.5px] font-medium transition-all relative group border-l-2
                  ${isActive
                    ? 'bg-white/[0.15] text-white border-[#D4AF37]'
                    : 'text-white/82 hover:text-white hover:bg-white/[0.1] border-transparent'
                  }`}
              >
                <Icon className="flex-shrink-0" style={{ width: 17, height: 17 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A3E5C] text-white rounded text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity ring-1 ring-[#D4AF37]/45">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom User Section */}
        <div className="border-t border-white/20 p-2 flex-shrink-0">
          {!sidebarCollapsed ? (
            <div>
              <div className="flex items-center gap-2 mb-1 p-1.5 rounded-md">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0"
                  style={{ background: `${roleColor}25`, color: roleColor, border: `1px solid ${roleColor}50` }}>
                  {roleInitials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{displayName}</p>
                  <p className="text-[12px] text-white/72 truncate">{displayEmail || roleName}</p>
                </div>
              </div>
              <button onClick={() => navigate('/login')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-white/80 hover:text-white rounded-md hover:bg-white/18 transition-colors">
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold"
                style={{ background: `${roleColor}25`, color: roleColor, border: `1px solid ${roleColor}50` }}>
                {roleInitials}
              </span>
              <button onClick={() => navigate('/login')} className="p-1.5 text-white/72 hover:text-white rounded">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-[#D4AF37]/40 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <BreadcrumbBar path={location.pathname} />
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder="Search..."
              className="pl-8 pr-3 h-9 w-56 rounded-md bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-[15px] focus:outline-none focus:border-[#1A3E5C] focus:ring-2 focus:ring-[#1A3E5C]/10"
            />
          </div>
          <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)} className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                  <span className="text-[15px] font-semibold text-slate-800">Notifications</span>
                  <button className="text-[13px] text-[#1A3E5C] hover:text-[#D4AF37]">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {NOTIFICATIONS.slice(0, 5).map(n => (
                    <div key={n.id} className={`px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-2.5 ${n.unread ? 'bg-[#1A3E5C]/[0.04]' : ''}`}
                      onClick={() => { setNotifOpen(false); navigate(n.link); }}>
                      <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${n.priority === 'Critical' ? 'bg-red-500' : n.priority === 'High' ? 'bg-orange-400' : 'bg-[#1A3E5C]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-slate-800 truncate">{n.title}</p>
                        <p className="text-[13px] text-slate-500 mt-0.5 line-clamp-1">{n.body}</p>
                        <p className="text-[12px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                      {n.unread && <span className="w-2 h-2 rounded-full bg-[#D4AF37] flex-shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
                <button className="w-full py-2.5 text-[14px] text-[#1A3E5C] hover:text-[#D4AF37] text-center border-t border-slate-100"
                  onClick={() => { setNotifOpen(false); navigate('/org/alerts'); }}>
                  View all notifications →
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/admin/dashboard')}
            className="text-[13px] font-medium text-[#1A3E5C] hover:text-white hover:bg-[#1A3E5C] border border-[#D4AF37]/55 px-2.5 py-1.5 rounded-md transition-colors hidden lg:block">
            Super Admin ↗
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}

function BreadcrumbBar({ path }: { path: string }) {
  const parts = path.split('/').filter(Boolean);
  const labels: Record<string, string> = {
    org: 'Org', admin: 'Admin', dashboard: 'Dashboard', assets: 'Assets',
    controls: 'Controls', assessments: 'Assessments', actions: 'Actions',
    'compliance-tasks': 'Compliance Tasks', tasks: 'Compliance Tasks',
    evidence: 'Evidence Hub', policies: 'Policies', reports: 'Reports',
    risk: 'Risk & Analytics', analysis: 'Risk Analysis', 'risk-reports': 'Risk Reports',
    alerts: 'Alerts', lms: 'LMS', users: 'Users', settings: 'Settings',
    new: 'New', onboarding: 'Onboarding',
  };
  return (
    <nav className="flex items-center gap-1 text-[14px]">
      {parts.map((part, i) => {
        const label = labels[part] || part.toUpperCase();
        const isLast = i === parts.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={isLast ? 'text-[#1A3E5C] font-semibold' : 'text-slate-400'}>{label}</span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}