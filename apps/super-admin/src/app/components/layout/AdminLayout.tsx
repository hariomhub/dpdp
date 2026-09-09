import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  LayoutDashboard, Building2, GraduationCap,
  CreditCard, Settings, ChevronLeft, ChevronRight,
  LogOut, ScrollText, ClipboardList, Loader2, Package, Boxes, Cloud, Layers, Link2
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useLogout, useMe } from '../../../hooks/useAuth'
import { LogoIcon } from '../shared/DesignSystem'

const ADMIN_NAV = [
  { label: 'Platform', type: 'section' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: Building2, label: 'Organizations', path: '/admin/organizations' },
  { icon: ClipboardList, label: 'Regulations & Controls', path: '/admin/controls' },
  { icon: Boxes, label: 'Control Families', path: '/admin/control-families' },
  { icon: Package, label: 'Product Families', path: '/admin/product-families' },
  { icon: Cloud, label: 'Cloud Providers', path: '/admin/cloud-providers' },
  { icon: Layers, label: 'Asset Catalog', path: '/admin/asset-catalog' },
  { icon: Link2, label: 'Check Mappings', path: '/admin/check-mappings' },
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
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#1A3E5C] border-r border-[#64748B]/30 transition-all duration-200 flex-shrink-0 relative ${sidebarCollapsed ? 'w-14' : 'w-60'
          }`}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-3 border-b border-white/10 flex-shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 flex-1 pl-1">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <LogoIcon className="w-8 h-8" />
              </div>
              <div className="flex flex-col justify-center">
                <span
                  className="text-[16.5px] font-bold text-white leading-tight"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  NiyamSaathi
                </span>
                <span className="text-[11.5px] text-white/78 font-bold uppercase tracking-[0.2em] leading-tight mt-[2px]">
                  Super Admin
                </span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center mx-auto shadow-sm">
              <LogoIcon className="w-8 h-8" />
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-white hover:bg-white/20 hover:ring-white/25 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Admin Badge */}
        {!sidebarCollapsed && (
          <div className="mx-3 mt-3 px-2.5 py-1.5 bg-white/[0.1] rounded-lg ring-1 ring-white/10">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-bold text-white/80 uppercase tracking-[0.15em]">
                Super Admin Console
              </span>
            </div>
            <p className="text-[12px] text-white/70 mt-0.5">Platform-level access</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 mt-1">
          {ADMIN_NAV.map((item, i) => {
            if (item.type === 'section') {
              if (sidebarCollapsed) return <div key={i} className="h-px bg-white/10 my-2 mx-2" />
              return (
                <p
                  key={i}
                  className="text-[11px] font-bold text-white/55 uppercase tracking-[0.18em] px-3 pt-3 pb-1"
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
                className={`flex items-center gap-2.5 mx-2 px-2.5 py-1.5 rounded-md text-[14.5px] font-medium transition-all relative group ${isActive
                    ? 'bg-[#64748B] text-white shadow-sm shadow-black/20'
                    : 'text-white/75 hover:text-white hover:bg-white/[0.08]'
                  }`}
              >
                <Icon className="flex-shrink-0" style={{ width: 16, height: 16 }} />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1A3E5C] text-white rounded-md text-[13px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity shadow-lg ring-1 ring-[#64748B]/30">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-white/10 p-2 flex-shrink-0">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-1.5 rounded-full bg-white/10 ring-1 ring-white/15 text-white hover:bg-white/20 hover:ring-white/25 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                disabled={loggingOut}
                className="p-1.5 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 p-1.5 mb-1">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-[#1A3E5C] bg-[#64748B] flex-shrink-0">
                  {me?.name
                    ? me.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'SA'
                  }
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {me?.name ?? 'Super Admin'}
                  </p>
                  <p className="text-[12px] text-white/70 truncate">
                    {me?.email ?? 'admin@niyamsaathi.in'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logout()}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-white/78 hover:text-white rounded-md hover:bg-white/10 transition-colors disabled:opacity-50"
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
        <header className="h-14 bg-white border-b border-[#64748B]/25 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1">
            <nav className="flex items-center gap-1 text-[14px]">
              <span className="text-slate-400 font-medium">Super Admin</span>
              <span className="text-slate-300 mx-1">/</span>
              <span className="text-[#1A3E5C] font-semibold capitalize">
                {location.pathname.split('/').slice(-1)[0].replace(/-/g, ' ') ||
                  'Dashboard'}
              </span>
            </nav>
          </div>
          <span className="text-[12px] font-semibold text-[#64748B] bg-[#64748B]/[0.08] px-2.5 py-1 rounded-full">
            Internal · Not visible to orgs
          </span>
        </header>
        <main className="flex-1 overflow-y-auto bg-slate-50 p-5">{children}</main>
      </div>
    </div>
  )
}