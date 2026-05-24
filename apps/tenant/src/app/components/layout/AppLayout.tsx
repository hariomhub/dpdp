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
    <div className="flex h-screen bg-slate-100 overflow-hidden" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Sidebar */}
      <aside className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-200 flex-shrink-0 ${sidebarCollapsed ? 'w-14' : 'w-56'}`}>
        {/* Logo */}
        <div className="flex items-center h-12 px-3 border-b border-slate-200 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-[13px] font-bold text-slate-900 block" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP CMS</span>
                <span className="text-[10px] text-slate-400 truncate block">{orgName}</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2 overflow-x-hidden">
          {(NAV_ITEMS as unknown as any[]).map((item: any, i: number) => {
            if (item.type === 'divider') return <div key={i} className="h-px bg-slate-100 my-1 mx-3" />;

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
                    className={`w-full flex items-center gap-2.5 mx-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all group
                      ${isGroupActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                    style={{ width: sidebarCollapsed ? 'calc(100% - 16px)' : 'calc(100% - 16px)' }}
                  >
                    <Icon className="flex-shrink-0" style={{ width: 16, height: 16 }} />
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${riskExpanded ? 'rotate-180' : ''}`} />
                      </>
                    )}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white rounded text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
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
                            className={`flex items-center gap-2 mx-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all
                              ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}>
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
                className={`flex items-center gap-2.5 mx-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all relative group
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Icon className="flex-shrink-0" style={{ width: 16, height: 16 }} />
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

        {/* Bottom User Section */}
        <div className="border-t border-slate-200 p-2 flex-shrink-0">
          {!sidebarCollapsed ? (
            <div>
              <div className="flex items-center gap-2 mb-1 p-1.5 rounded-md">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                  style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
                  {roleInitials}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-slate-800 truncate">{displayName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{displayEmail || roleName}</p>
                </div>
              </div>
              <button onClick={() => navigate('/login')} className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition-colors">
                <LogOut className="w-3 h-3" /> Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{ background: `${roleColor}20`, color: roleColor, border: `1px solid ${roleColor}40` }}>
                {roleInitials}
              </span>
              <button onClick={() => navigate('/login')} className="p-1.5 text-slate-400 hover:text-slate-700 rounded">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Bar */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <BreadcrumbBar path={location.pathname} />
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              placeholder="Search..."
              className="pl-8 pr-3 h-8 w-56 rounded-md bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)} className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
                  <span className="text-[13px] font-semibold text-slate-800">Notifications</span>
                  <button className="text-[11px] text-blue-600 hover:text-blue-700">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {NOTIFICATIONS.slice(0, 5).map(n => (
                    <div key={n.id} className={`px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex gap-2.5 ${n.unread ? 'bg-blue-50/50' : ''}`}
                      onClick={() => { setNotifOpen(false); navigate(n.link); }}>
                      <div className={`w-1 rounded-full flex-shrink-0 self-stretch ${n.priority === 'Critical' ? 'bg-red-500' : n.priority === 'High' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-800 truncate">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                      {n.unread && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
                <button className="w-full py-2.5 text-[12px] text-blue-600 hover:text-blue-700 text-center border-t border-slate-100"
                  onClick={() => { setNotifOpen(false); navigate('/org/alerts'); }}>
                  View all notifications →
                </button>
              </div>
            )}
          </div>
          <button onClick={() => navigate('/admin/dashboard')}
            className="text-[11px] font-medium text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded hidden lg:block">
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
    <nav className="flex items-center gap-1 text-[12px]">
      {parts.map((part, i) => {
        const label = labels[part] || part.toUpperCase();
        const isLast = i === parts.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-slate-300">/</span>}
            <span className={isLast ? 'text-slate-800 font-medium' : 'text-slate-400'}>{label}</span>
          </React.Fragment>
        );
      })}
    </nav>
  );
}