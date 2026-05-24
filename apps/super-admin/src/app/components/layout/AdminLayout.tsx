import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  LayoutDashboard, Building2, ShieldCheck, GraduationCap,
  CreditCard, Settings, ChevronLeft, ChevronRight,
  LogOut, ScrollText, ClipboardList, Loader2, Package, Boxes
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useLogout, useMe } from '../../../hooks/useAuth'

const ADMIN_NAV = [
  { label: 'Platform', type: 'section' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Building2, label: 'Organizations', path: '/admin/organizations' },
  { icon: ClipboardList, label: 'Regulations & Controls', path: '/admin/controls' },
  { icon: Boxes, label: 'Control Families', path: '/admin/control-families' },
  { icon: Package, label: 'Product Families', path: '/admin/product-families' },
  { icon: GraduationCap, label: 'LMS', path: '/admin/lms' },
  { label: 'System', type: 'section' },
  { icon: Settings, label: 'Platform Settings', path: '/admin/settings' },
  { icon: CreditCard, label: 'Billing', path: '/admin/billing' },
  { icon: ScrollText, label: 'Audit Log', path: '/admin/audit-log' },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp()
  const location = useLocation()
  const { mutate: logout, isPending: loggingOut } = useLogout()
  const { data: me } = useMe()

  return (
    <div
      className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ fontFamily: 'DM Sans, sans-serif' }}
    >
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-slate-100 transition-all duration-200 flex-shrink-0 relative ${sidebarCollapsed ? 'w-12' : 'w-[220px]'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center h-12 px-3 border-b border-slate-100 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 flex-1 pl-1">
              <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col justify-center">
                <span
                  className="text-[14.5px] font-bold text-slate-900 leading-tight"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  DPDP CMS
                </span>
                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-tight mt-[2px]">
                  Super Admin
                </span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-6 h-6 rounded-md bg-slate-900 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Admin Badge */}
        {!sidebarCollapsed && (
          <div className="mx-3 mt-3 px-2.5 py-1.5 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                Super Admin Console
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Platform-level access</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 mt-1">
          {ADMIN_NAV.map((item, i) => {
            if (item.type === 'section') {
              if (sidebarCollapsed) return <div key={i} className="h-px bg-slate-100 my-2 mx-2" />
              return (
                <p
                  key={i}
                  className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] px-3 pt-3 pb-1"
                >
                  {item.label}
                </p>
              )
            }
            const Icon = item.icon!
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path!}
                className={`flex items-center gap-2.5 mx-2 px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all relative group ${isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                <Icon className="flex-shrink-0" style={{ width: 15, height: 15 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-100 p-2 flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                disabled={loggingOut}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 p-1.5 mb-1">
                <span className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {me?.name
                    ? me.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'SA'
                  }
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 truncate">
                    {me?.name ?? 'Super Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {me?.email ?? 'admin@dpdpcms.in'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <LogOut className="w-3 h-3" />
                )}
                {loggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-12 bg-white border-b border-slate-100 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1">
            <nav className="flex items-center gap-1 text-[12px]">
              <span className="text-slate-400 font-medium">Super Admin</span>
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-slate-800 font-semibold capitalize">
                {location.pathname.split('/').slice(-1)[0].replace(/-/g, ' ') ||
                  'Dashboard'}
              </span>
            </nav>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
            Internal · Not visible to orgs
          </span>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-5">{children}</main>
      </div>
    </div>
  )
}