import React, { useState } from 'react';
import {
  Users, Plus, Trash2, Mail, Shield, Loader2,
  CheckCircle2, ChevronDown, ChevronRight, RefreshCw, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Department, InviteUser, uid } from './OrgStructureGraph';
import {
  useEntraStatus,
  useConnectEntra,
  useSyncEntraUsers,
  useEntraMappings,
  useEntraGroups,
  useSaveEntraMappings,
} from '../../../hooks/useEntra';
import { useListDepartments } from '../../../hooks/useOrg';

// ─── Inline Entra Connect Panel ────────────────────────────────────────────────
function EntraConnectInline() {
  const { data: entraStatus, isLoading } = useEntraStatus();
  const { data: mappings = [] } = useEntraMappings();
  const { data: groups = [] } = useEntraGroups(!!entraStatus?.connected);
  const { data: dbDepts = [] } = useListDepartments();

  const connectMut = useConnectEntra();
  const syncMut = useSyncEntraUsers();
  const saveMappingsMut = useSaveEntraMappings();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenantDomain: '', clientId: '', clientSecret: '', azureTenantId: '' });
  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newMapping, setNewMapping] = useState({ entraGroupId: '', entraGroupName: '', role: 'IT_ADMIN', departmentId: '' });

  const ROLE_OPTIONS = [
    { value: 'IT_ADMIN',          label: 'IT Admin' },
    { value: 'INTERNAL_AUDITOR',  label: 'Internal Auditor' },
    { value: 'CO',                label: 'Compliance Officer' },
  ];

  const handleConnect = async () => {
    if (!form.clientId || !form.azureTenantId || !form.clientSecret || !form.tenantDomain) {
      toast.error('Please fill in all fields');
      return;
    }
    await connectMut.mutateAsync(form);
    setShowForm(false);
    setForm({ tenantDomain: '', clientId: '', clientSecret: '', azureTenantId: '' });
  };

  const handleAddMapping = async () => {
    if (!newMapping.entraGroupId || !newMapping.role) return;
    const updated = [
      ...(mappings as any[]).map((m: any) => ({
        entraGroupId: m.entraGroupId, entraGroupName: m.entraGroupName,
        role: m.role, departmentId: m.departmentId ?? undefined,
      })),
      {
        entraGroupId: newMapping.entraGroupId,
        entraGroupName: newMapping.entraGroupName || newMapping.entraGroupId,
        role: newMapping.role,
        departmentId: newMapping.departmentId || undefined,
      },
    ];
    await saveMappingsMut.mutateAsync({ mappings: updated });
    setShowAddMapping(false);
    setNewMapping({ entraGroupId: '', entraGroupName: '', role: 'IT_ADMIN', departmentId: '' });
  };

  if (isLoading) return (
    <div className="flex items-center gap-2 py-4 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Checking Entra ID status…
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Status header ── */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${entraStatus?.connected ? 'bg-green-50 border-green-200' : 'bg-[#1A3E5C]/8 border-[#D4AF37]/40'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${entraStatus?.connected ? 'bg-green-500' : 'bg-[#D4AF37]'}`}>
            {entraStatus?.connected ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white" />}
          </div>
          <div>
            <p className={`text-[15px] font-bold ${entraStatus?.connected ? 'text-green-800' : 'text-[#15324a]'}`}>
              Microsoft Entra ID — {entraStatus?.connected ? 'Connected' : 'Not Connected'}
            </p>
            <p className={`text-[13px] mt-0.5 ${entraStatus?.connected ? 'text-green-600' : 'text-[#1A3E5C]'}`}>
              {entraStatus?.connected
                ? `${entraStatus.tenantDomain}${entraStatus.lastSyncAt ? ` · Last synced ${new Date(entraStatus.lastSyncAt).toLocaleString()}` : ' · Never synced'}`
                : 'Sync your Azure AD groups automatically'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {entraStatus?.connected && (
            <button type="button" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 text-green-700 text-[14px] font-medium rounded-lg hover:bg-green-50 transition-colors">
              {syncMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync Now
            </button>
          )}
          {!entraStatus?.connected && (
            <button type="button" onClick={() => setShowForm(!showForm)}
              className="px-4 py-1.5 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[14px] font-semibold rounded-lg transition-colors">
              {showForm ? 'Cancel' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* ── Connect form ── */}
      {showForm && !entraStatus?.connected && (
        <div className="p-4 bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] shadow-sm space-y-3">
          <div>
            <p className="text-[15px] font-bold text-slate-800 mb-0.5">Register an Azure AD App</p>
            <p className="text-[13.5px] text-slate-500 leading-relaxed">
              In Azure Portal → App registrations → API Permissions → add <strong>Group.Read.All</strong> and <strong>User.Read.All</strong> (Microsoft Graph). Then paste your credentials below.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'tenantDomain',  label: 'Tenant Domain',           placeholder: 'yourorg.onmicrosoft.com' },
              { key: 'azureTenantId', label: 'Azure Tenant ID',         placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
              { key: 'clientId',      label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
              { key: 'clientSecret',  label: 'Client Secret',           placeholder: 'Your client secret value' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[13px] font-semibold text-slate-600 mb-1">{f.label}</label>
                <input
                  type={f.key === 'clientSecret' ? 'password' : 'text'}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-[13.5px] focus:outline-none focus:border-[#1A3E5C] transition-colors" />
              </div>
            ))}
          </div>
          <button type="button" onClick={handleConnect}
            disabled={connectMut.isPending || !form.clientId || !form.azureTenantId}
            className="flex items-center gap-2 px-5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg transition-colors">
            {connectMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {connectMut.isPending ? 'Connecting…' : 'Connect Entra ID →'}
          </button>
        </div>
      )}

      {/* ── Group Mappings (only when connected) ── */}
      {entraStatus?.connected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[14.5px] font-bold text-slate-700">Group → Role Mappings</p>
            <button type="button" onClick={() => setShowAddMapping(!showAddMapping)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-[#1A3E5C] bg-[#1A3E5C]/8 border border-[#D4AF37]/40 rounded-lg hover:bg-[#1A3E5C]/12 transition-colors font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Mapping
            </button>
          </div>

          {/* Existing mappings */}
          {(mappings as any[]).length > 0 ? (
            <div className="border border-[#D4AF37]/35 rounded-xl overflow-hidden">
              {(mappings as any[]).map((m: any, i: number) => (
                <div key={m.id ?? i} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 bg-white hover:bg-slate-50 text-[14px]">
                  <span className="font-mono text-slate-700 flex-1 truncate">{m.entraGroupName}</span>
                  <span className="text-[#1A3E5C] font-semibold bg-[#1A3E5C]/8 px-2 py-0.5 rounded-md">
                    {ROLE_OPTIONS.find(r => r.value === m.role)?.label ?? m.role}
                  </span>
                  {m.departmentName && (
                    <span className="text-slate-500">{m.departmentName}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-slate-400 italic">No mappings yet. Add one to map Entra groups to roles.</p>
          )}

          {/* Add mapping form */}
          {showAddMapping && (
            <div className="p-4 bg-white border border-[#D4AF37]/40 rounded-xl space-y-3">
              <p className="text-[14.5px] font-bold text-slate-800">Map Entra Group → Role</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-slate-600 mb-1">Entra Group</label>
                  {(groups as any[]).length > 0 ? (
                    <select value={newMapping.entraGroupId}
                      onChange={e => {
                        const g = (groups as any[]).find((g: any) => g.id === e.target.value);
                        setNewMapping(p => ({ ...p, entraGroupId: e.target.value, entraGroupName: g?.displayName || e.target.value }));
                      }}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-[13.5px] focus:outline-none focus:border-[#1A3E5C]">
                      <option value="">Select group…</option>
                      {(groups as any[]).map((g: any) => (
                        <option key={g.id} value={g.id}>{g.displayName}</option>
                      ))}
                    </select>
                  ) : (
                    <input placeholder="Group ID or name" value={newMapping.entraGroupId}
                      onChange={e => setNewMapping(p => ({ ...p, entraGroupId: e.target.value, entraGroupName: e.target.value }))}
                      className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-[13.5px] focus:outline-none focus:border-[#1A3E5C]" />
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-600 mb-1">Map to Role</label>
                  <select value={newMapping.role}
                    onChange={e => setNewMapping(p => ({ ...p, role: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-[13.5px] focus:outline-none focus:border-[#1A3E5C]">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[13px] font-semibold text-slate-600 mb-1">Assign to Department (optional)</label>
                  <select value={newMapping.departmentId}
                    onChange={e => setNewMapping(p => ({ ...p, departmentId: e.target.value }))}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-[13.5px] focus:outline-none focus:border-[#1A3E5C]">
                    <option value="">No department</option>
                    {(dbDepts as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddMapping(false)}
                  className="px-4 py-1.5 border border-slate-300 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleAddMapping}
                  disabled={saveMappingsMut.isPending || !newMapping.entraGroupId}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[14px] font-semibold rounded-lg transition-colors">
                  {saveMappingsMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Mapping →
                </button>
              </div>
            </div>
          )}

          {/* Sync notice */}
          {entraStatus?.connected && (mappings as any[]).length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-[#1A3E5C]/8 border border-[#D4AF37]/30 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-[#1A3E5C] flex-shrink-0 mt-0.5" />
              <p className="text-[13.5px] text-[#1A3E5C] leading-relaxed">
                Click <strong>Sync Now</strong> above to pull users from the mapped groups. You can always sync again from Settings → Users after onboarding.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Manual Invite Section ─────────────────────────────────────────────────────
export function TeamInviteStep({
  invites, setInvites, departments,
}: {
  invites: InviteUser[];
  setInvites: React.Dispatch<React.SetStateAction<InviteUser[]>>;
  departments: Department[];
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'entra' | 'manual'>('entra');

  const { data: dbDepts = [] } = useListDepartments();
  // Use locally drafted departments (step 3) if available, otherwise fall back to DB (in case user is resuming)
  const displayDepts = departments.length > 0 ? departments : (dbDepts as any[]).map((d: any) => ({ id: d.id, name: d.name }));

  const needsDepts = role === 'IT Admin' || role === 'Internal Auditor';

  const toggleDept = (d: string) => {
    setSelectedDepts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleAdd = () => {
    if (!email || !name || !role) return;
    setInvites([...invites, { id: uid(), email, name, role, depts: selectedDepts, status: 'Pending' }]);
    setEmail(''); setName(''); setRole(''); setSelectedDepts([]);
  };

  return (
    <div className="space-y-5">
      {/* ── Tab switcher ── */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        <button type="button" onClick={() => setActiveTab('entra')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[15px] font-semibold transition-all ${activeTab === 'entra' ? 'bg-white shadow-sm text-[#1A3E5C]' : 'text-slate-500 hover:text-slate-700'}`}>
          <Shield className="w-4 h-4" /> Microsoft Entra ID
        </button>
        <button type="button" onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[15px] font-semibold transition-all ${activeTab === 'manual' ? 'bg-white shadow-sm text-[#1A3E5C]' : 'text-slate-500 hover:text-slate-700'}`}>
          <Users className="w-4 h-4" /> Manual Invites
        </button>
      </div>

      {/* ── Entra Tab ── */}
      {activeTab === 'entra' && <EntraConnectInline />}

      {/* ── Manual Tab ── */}
      {activeTab === 'manual' && (
        <div className="space-y-5">
          <div className="p-4 bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] space-y-4">
            <p className="text-[14.5px] font-bold text-slate-800">Add Team Member</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-[#1A3E5C]" />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-[#1A3E5C]" />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-slate-700 mb-1.5">Role</label>
              <div className="flex flex-wrap gap-2">
                {['Compliance Officer', 'IT Admin', 'Internal Auditor', 'External Auditor'].map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-[14px] font-medium border transition-colors ${role === r ? 'bg-[#1A3E5C]/8 border-[#D4AF37]/40 text-[#1A3E5C]' : 'bg-white border-[#D4AF37]/35 text-slate-600 hover:border-slate-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {needsDepts && displayDepts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[14px] font-medium text-slate-700">Assign to Departments (Optional)</label>
                  <button type="button"
                    onClick={() => {
                      const allNames = displayDepts.map(d => d.name);
                      const allSelected = allNames.every(n => selectedDepts.includes(n));
                      setSelectedDepts(allSelected ? [] : allNames);
                    }}
                    className="text-[13px] font-semibold text-[#1A3E5C] hover:text-[#15324a] transition-colors">
                    {displayDepts.map(d => d.name).every(n => selectedDepts.includes(n)) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="border border-[#D4AF37]/35 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {displayDepts.map(d => (
                    <label key={d.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedDepts.includes(d.name)}
                        onChange={() => toggleDept(d.name)}
                        className="w-4 h-4 accent-[#1A3E5C] rounded flex-shrink-0"
                      />
                      <span className="text-[14.5px] text-slate-800 font-medium">{d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {needsDepts && displayDepts.length === 0 && (
              <p className="text-[13.5px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No departments found — go back to Step 3 to add departments first.
              </p>
            )}

            <button type="button" onClick={handleAdd} disabled={!email || !name || !role}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[15px] font-medium hover:bg-slate-800 transition-colors disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add to Invite List
            </button>
          </div>

          {invites.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[15px] font-bold text-slate-800">Pending Invites ({invites.length})</h4>
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-white border border-[#D4AF37]/35 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1A3E5C]/8 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-[#1A3E5C]" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-slate-900">{inv.name} <span className="font-normal text-slate-500">({inv.email})</span></p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[13px] font-medium text-[#1A3E5C] bg-[#1A3E5C]/8 px-2 py-0.5 rounded-md">{inv.role}</span>
                        {inv.depts.length > 0 && (
                          <span className="text-[13px] text-slate-500">{inv.depts.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setInvites(invites.filter(i => i.id !== inv.id))}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
