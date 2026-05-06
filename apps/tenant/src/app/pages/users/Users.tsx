import React, { useState } from 'react';
import {
  Plus, RefreshCw, ChevronDown, ChevronRight, X, Check,
  Users as UsersIcon, Shield, Clock, Mail
} from 'lucide-react';
import { useApp, ROLE_COLORS } from '../../context/AppContext';

const USERS_DATA = [
  { id: 1, name: 'Amit Rao', email: 'amit@technova.in', initials: 'AR', role: 'ceo', roleLabel: 'Organization CEO', departments: [], source: 'Manual', status: 'Active', lastLogin: '2 hrs ago' },
  { id: 2, name: 'Priya Sharma', email: 'priya@technova.in', initials: 'PS', role: 'co', roleLabel: 'Compliance Officer', departments: [], source: 'Entra ID', status: 'Active', lastLogin: '1 hr ago', entraGroup: 'Compliance-Grp' },
  { id: 3, name: 'Manish Kumar', email: 'manish@technova.in', initials: 'MK', role: 'it_admin', roleLabel: 'IT Admin', departments: ['Engineering', 'Infrastructure'], source: 'Entra ID', status: 'Active', lastLogin: '4 hrs ago', entraGroup: 'ENG-IT-Team' },
  { id: 4, name: 'Rahul Mehta', email: 'rahul@technova.in', initials: 'RM', role: 'internal_auditor', roleLabel: 'Internal Auditor', departments: ['All Departments'], source: 'Manual', status: 'Active', lastLogin: '1 day ago' },
  { id: 5, name: 'Sunita Joshi', email: 'sunita@audit.in', initials: 'SJ', role: 'external_auditor', roleLabel: 'External Auditor', departments: [], source: 'Manual', status: 'Active', lastLogin: '3 days ago' },
  { id: 6, name: 'Kavya Reddy', email: 'kavya@technova.in', initials: 'KR', role: 'it_admin', roleLabel: 'IT Admin', departments: ['Finance', 'Sales'], source: 'Entra ID', status: 'Active', lastLogin: '2 days ago', entraGroup: 'FIN-IT-Team' },
  { id: 7, name: 'Suresh Patel', email: 'suresh@technova.in', initials: 'SP', role: 'it_admin', roleLabel: 'IT Admin', departments: ['HR', 'Marketing'], source: 'Manual', status: 'Pending', lastLogin: 'Never' },
];

const PENDING_INVITES = [
  { email: 'deepa@technova.in', role: 'internal_auditor', roleLabel: 'Internal Auditor', departments: ['Engineering'], sentDate: 'Apr 24, 2025', expiresIn: 28, expired: false },
  { email: 'arjun@technova.in', role: 'it_admin', roleLabel: 'IT Admin', departments: ['Finance'], sentDate: 'Apr 14, 2025', expiresIn: -10, expired: true },
];

const ENTRA_MAPPINGS = [
  { group: 'ENG-IT-Team', role: 'IT Admin', dept: 'Engineering', users: 1 },
  { group: 'FIN-IT-Team', role: 'IT Admin', dept: 'Finance', users: 1 },
  { group: 'Compliance-Grp', role: 'CO', dept: 'Org-wide', users: 1 },
  { group: 'Audit-Team', role: 'Internal Auditor', dept: 'All Departments', users: 1 },
  { group: 'Ext-Auditors', role: 'External Auditor', dept: 'Org-wide', users: 0 },
];

const DEPT_GROUPS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Sales', 'Infrastructure'];

function RoleChip({ role, label }: { role: string; label: string }) {
  const color = ROLE_COLORS[role as keyof typeof ROLE_COLORS] || '#64748b';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-semibold" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {label}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = { Active: 'bg-green-50 text-green-700', Pending: 'bg-amber-50 text-amber-700', Inactive: 'bg-slate-100 text-slate-500' };
  return <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${map[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
}

function UserRow({ user }: { user: typeof USERS_DATA[0] }) {
  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
            style={{ background: `${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}18`, color: ROLE_COLORS[user.role as keyof typeof ROLE_COLORS] }}>
            {user.initials}
          </span>
          <div>
            <p className="text-[12.5px] font-semibold text-slate-800">{user.name}</p>
            <p className="text-[11px] text-slate-400">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><RoleChip role={user.role} label={user.roleLabel} /></td>
      <td className="px-4 py-3">
        {user.departments.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {user.departments.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d}</span>)}
          </div>
        ) : <span className="text-[10.5px] text-slate-400">Org-wide</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-[10.5px] px-2 py-0.5 rounded font-semibold ${user.source === 'Entra ID' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{user.source}</span>
      </td>
      <td className="px-4 py-3"><StatusChip status={user.status} /></td>
      <td className="px-4 py-3 text-[11.5px] text-slate-400">{user.lastLogin}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1.5">
          <button className="text-[11px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition-colors">Edit Role</button>
          {(user.role === 'it_admin' || user.role === 'internal_auditor') && (
            <button className="text-[11px] px-2 py-1 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition-colors">Dept</button>
          )}
          <button className="text-[11px] px-2 py-1 border border-red-100 rounded hover:bg-red-50 text-red-500 transition-colors">Deactivate</button>
        </div>
      </td>
    </tr>
  );
}

function EntraPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const [showAddMapping, setShowAddMapping] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
      <div
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <span className="text-blue-600 text-[16px] font-bold flex-shrink-0">⬡</span>
        <div className="flex-1 text-left">
          <p className="text-[12.5px] font-semibold text-slate-800">Microsoft Entra ID — <span className="text-green-600">Connected</span></p>
          <p className="text-[11px] text-slate-400">technova.onmicrosoft.com · Last synced 2 hours ago</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            onClick={e => { e.stopPropagation(); }}
            className="text-[11px] text-blue-600 font-medium hover:text-blue-700 border border-blue-200 px-2 py-1 rounded bg-white cursor-pointer select-none"
          >
            Sync Now
          </span>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-3">
          <p className="text-[11.5px] font-semibold text-slate-700 mb-2">Group Mappings</p>
          <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                {['Entra Group', '→ Role', '→ Department', 'Users Synced'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
              </tr></thead>
              <tbody>
                {ENTRA_MAPPINGS.map((m, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{m.group}</td>
                    <td className="px-3 py-2 font-medium text-slate-700">{m.role}</td>
                    <td className="px-3 py-2 text-slate-500">{m.dept}</td>
                    <td className="px-3 py-2 text-slate-500">{m.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {showAddMapping ? (
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
              <p className="text-[12px] font-semibold text-slate-700">Add Group Mapping</p>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-[10.5px] text-slate-500 mb-1">Entra Group</label>
                  <select className="w-full h-8 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-blue-400 bg-white">
                    {['ENG-Dev-Team', 'HR-Admin-Group', 'Finance-Users'].map(g => <option key={g}>{g}</option>)}
                  </select></div>
                <div><label className="block text-[10.5px] text-slate-500 mb-1">Role</label>
                  <select className="w-full h-8 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-blue-400 bg-white">
                    {['CO', 'IT Admin', 'Internal Auditor', 'External Auditor'].map(r => <option key={r}>{r}</option>)}
                  </select></div>
                <div><label className="block text-[10.5px] text-slate-500 mb-1">Department</label>
                  <select className="w-full h-8 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-blue-400 bg-white">
                    {['Org-wide', ...DEPT_GROUPS].map(d => <option key={d}>{d}</option>)}
                  </select></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddMapping(false)} className="px-3 py-1.5 text-[12px] border border-slate-300 rounded hover:bg-slate-100 text-slate-600">Cancel</button>
                <button className="px-3 py-1.5 text-[12px] bg-blue-600 text-white rounded hover:bg-blue-700">Save Mapping →</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setShowAddMapping(true)} className="text-[11.5px] border border-slate-200 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-50 transition-colors">+ Add Group Mapping</button>
              <button className="text-[11.5px] border border-slate-200 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-50 transition-colors">Edit Mappings</button>
              <button className="text-[11.5px] border border-red-200 px-3 py-1.5 rounded text-red-500 hover:bg-red-50 transition-colors ml-auto">Disconnect Entra ID</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [selectedRole, setSelectedRole] = useState('');
  const showDept = selectedRole === 'IT Admin' || selectedRole === 'Internal Auditor';
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">Invite Team Member</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input type="email" placeholder="colleague@company.com"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
              <option value="">Select a role…</option>
              {['Compliance Officer', 'IT Admin', 'Internal Auditor', 'External Auditor'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {showDept && (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Department(s) <span className="text-red-500">*</span></label>
              <select multiple className="w-full h-24 px-3 py-2 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" size={4}>
                {DEPT_GROUPS.map(d => <option key={d}>{d}</option>)}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">This user will receive or review compliance tasks for assets in selected departments.</p>
            </div>
          )}
          <div>
            <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Personal Note <span className="text-slate-400 font-normal">(optional, max 200 chars)</span></label>
            <textarea rows={2} maxLength={200} placeholder="Added to the invitation email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={onClose} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> Send Invitation →
          </button>
        </div>
      </div>
    </div>
  );
}

export function UsersPage() {
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('All Users');
  const [showInvite, setShowInvite] = useState(false);
  const [entraExpanded, setEntraExpanded] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  const isCEO = role === 'ceo';
  const isCO = role === 'co';
  const canManage = isCEO || isCO;

  const TABS = ['All Users', 'By Department', 'By Role', 'Entra ID Synced', 'Pending Invites'];
  const entraSynced = USERS_DATA.filter(u => u.source === 'Entra ID');
  const byRole = ['ceo', 'co', 'it_admin', 'internal_auditor', 'external_auditor'];
  const ROLE_DISPLAY: Record<string, string> = { ceo: 'CEO', co: 'Compliance Officers', it_admin: 'IT Admins', internal_auditor: 'Internal Auditors', external_auditor: 'External Auditors' };

  return (
    <div className="space-y-4">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Team Members</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{USERS_DATA.filter(u => u.status === 'Active').length} members · {PENDING_INVITES.length} pending invites</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
                <Plus className="w-4 h-4" /> Invite Manually
              </button>
              <button className="flex items-center gap-2 px-3.5 py-2 border border-blue-300 text-blue-700 text-[13px] font-medium rounded-lg hover:bg-blue-50 transition-colors">
                <span className="text-[14px] font-bold">⬡</span> Sync with Entra ID
              </button>
            </>
          )}
          <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-[13px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
            Filter <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Entra ID Panel */}
      <EntraPanel expanded={entraExpanded} onToggle={() => setEntraExpanded(v => !v)} />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
            {tab === 'Pending Invites' && PENDING_INVITES.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{PENDING_INVITES.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* All Users Tab */}
      {activeTab === 'All Users' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                {['User', 'Role', 'Department(s)', 'Source', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {USERS_DATA.map(u => <UserRow key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* By Department Tab */}
      {activeTab === 'By Department' && (
        <div className="space-y-3">
          {DEPT_GROUPS.map(dept => {
            const deptUsers = USERS_DATA.filter(u => u.departments.includes(dept) || u.departments.includes('All Departments'));
            const expanded = expandedDepts.has(dept);
            const itAdmin = USERS_DATA.find(u => u.role === 'it_admin' && u.departments.includes(dept));
            const ia = USERS_DATA.find(u => u.role === 'internal_auditor');
            return (
              <div key={dept} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedDepts(p => { const n = new Set(p); n.has(dept) ? n.delete(dept) : n.add(dept); return n; })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-slate-800">{dept}</p>
                    <p className="text-[11px] text-slate-400">
                      IT Admin: <span className={itAdmin ? 'text-slate-600' : 'text-amber-500'}>{itAdmin ? itAdmin.name : 'Unassigned'}</span>
                      {' · '} IA: <span className={ia ? 'text-slate-600' : 'text-amber-500'}>{ia ? ia.name : 'Unassigned'}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400">{deptUsers.length} users</span>
                </button>
                {expanded && (
                  <table className="w-full border-t border-slate-100">
                    <thead><tr className="bg-slate-50 text-slate-500 text-left">
                      {['User', 'Role', 'Status'].map(h => <th key={h} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {deptUsers.map(u => (
                        <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                                style={{ background: `${ROLE_COLORS[u.role as keyof typeof ROLE_COLORS]}18`, color: ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] }}>{u.initials}</span>
                              <div><p className="text-[12px] font-medium text-slate-800">{u.name}</p><p className="text-[10.5px] text-slate-400">{u.email}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><RoleChip role={u.role} label={u.roleLabel} /></td>
                          <td className="px-4 py-2.5"><StatusChip status={u.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* By Role Tab */}
      {activeTab === 'By Role' && (
        <div className="space-y-3">
          {byRole.map(r => {
            const roleUsers = USERS_DATA.filter(u => u.role === r);
            if (!roleUsers.length) return null;
            const color = ROLE_COLORS[r as keyof typeof ROLE_COLORS];
            const expanded = expandedRoles.has(r);
            return (
              <div key={r} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button onClick={() => setExpandedRoles(p => { const n = new Set(p); n.has(r) ? n.delete(r) : n.add(r); return n; })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[12.5px] font-bold text-slate-800 flex-1 text-left">{ROLE_DISPLAY[r]}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>({roleUsers.length})</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                        <span className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>{u.initials}</span>
                        <div className="flex-1"><p className="text-[12px] font-medium text-slate-800">{u.name}</p><p className="text-[10.5px] text-slate-400">{u.email}</p></div>
                        <StatusChip status={u.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Entra ID Synced Tab */}
      {activeTab === 'Entra ID Synced' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
              {['User', 'Role', 'Department(s)', 'Entra Group', 'Status', 'Last Login'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {entraSynced.map(u => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: `${ROLE_COLORS[u.role as keyof typeof ROLE_COLORS]}18`, color: ROLE_COLORS[u.role as keyof typeof ROLE_COLORS] }}>{u.initials}</span><div><p className="text-[12px] font-semibold text-slate-800">{u.name}</p><p className="text-[11px] text-slate-400">{u.email}</p></div></div>
                  </td>
                  <td className="px-4 py-3"><RoleChip role={u.role} label={u.roleLabel} /></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{u.departments.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d}</span>)}{u.departments.length === 0 && <span className="text-[10.5px] text-slate-400">Org-wide</span>}</div></td>
                  <td className="px-4 py-3"><span className="font-mono text-[10.5px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{(u as any).entraGroup}</span></td>
                  <td className="px-4 py-3"><StatusChip status={u.status} /></td>
                  <td className="px-4 py-3 text-[11.5px] text-slate-400">{u.lastLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites Tab */}
      {activeTab === 'Pending Invites' && (
        <div className="space-y-2">
          {PENDING_INVITES.length === 0 ? (
            <div className="py-16 text-center">
              <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-[13px] text-slate-500">No pending invitations</p>
            </div>
          ) : PENDING_INVITES.map((inv, i) => {
            const overdue = inv.expired;
            const urgentSoon = !inv.expired && inv.expiresIn < 2;
            const warnSoon = !inv.expired && inv.expiresIn < 12 && !urgentSoon;
            return (
              <div key={i} className="flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleChip role={inv.role} label={inv.roleLabel} />
                    {inv.departments.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d}</span>)}
                    <span className="text-[10.5px] text-slate-400">Sent {inv.sentDate}</span>
                  </div>
                </div>
                {overdue
                  ? <span className="text-[10.5px] px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold flex-shrink-0">Expired</span>
                  : <span className={`text-[10.5px] flex-shrink-0 font-medium ${urgentSoon ? 'text-red-600' : warnSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                      Expires in {inv.expiresIn}h
                    </span>
                }
                <div className="flex gap-2 flex-shrink-0">
                  <button className="px-3 py-1.5 text-[11.5px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Resend</button>
                  <button className="px-3 py-1.5 text-[11.5px] font-medium border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}