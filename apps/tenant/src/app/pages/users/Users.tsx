import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import {
  Plus, RefreshCw, ChevronDown, ChevronRight, X, Check,
  Shield, Clock, Mail, Loader2, AlertTriangle, UserX, UserCheck,
} from 'lucide-react';
import { useApp, ROLE_COLORS } from '../../context/AppContext';
import {
  useListUsers, useListInvitations, useInviteUser,
  useResendInvitation, useCancelInvitation, useUpdateUserRole,
  useDeactivateUser, useReactivateUser, useUpdateUserDepartments,
  type TeamUser,
} from '../../../hooks/useUsers';
import { useLmsDesignations, useSetUserDesignation, useBulkSetDesignation } from '../../../hooks/useLms';
import {
  useEntraStatus, useEntraGroups, useEntraMappings, useSaveEntraMappings,
  useSyncEntraUsers, useDisconnectEntra, useConnectEntra,
  useRemoveGroupMapping, useReconnectEntra
} from '../../../hooks/useEntra';
import { useListDepartments } from '../../../hooks/useOrg';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['CO', 'IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR'] as const;
const ROLE_LABEL: Record<string, string> = {
  CEO: 'Organization CEO', CO: 'Compliance Officer',
  IT_ADMIN: 'IT Admin', INTERNAL_AUDITOR: 'Internal Auditor', EXTERNAL_AUDITOR: 'External Auditor',
};
const ROLE_COLOR_KEY: Record<string, keyof typeof ROLE_COLORS> = {
  CEO: 'ceo', CO: 'co', IT_ADMIN: 'it_admin',
  INTERNAL_AUDITOR: 'internal_auditor', EXTERNAL_AUDITOR: 'external_auditor',
};
const DEPT_ROLES = ['IT_ADMIN', 'INTERNAL_AUDITOR'];

// ─── Small shared components ──────────────────────────────────────────────────

function RoleChip({ role }: { role: string }) {
  const key   = ROLE_COLOR_KEY[role] ?? 'co';
  const color = ROLE_COLORS[key] ?? '#64748b';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[12.5px] font-semibold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:        'bg-green-50 text-green-700',
    INACTIVE:      'bg-slate-100 text-slate-500',
    PENDING_INVITE:'bg-amber-50 text-amber-700',
  };
  const label: Record<string, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', PENDING_INVITE: 'Pending' };
  return (
    <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${map[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {label[status] ?? status}
    </span>
  );
}

function SourceChip({ source }: { source: string }) {
  return (
    <span className={`text-[12.5px] px-2 py-0.5 rounded font-semibold ${source === 'ENTRA_ID' ? 'bg-[#1A3E5C]/8 text-[#1A3E5C]' : 'bg-slate-100 text-slate-500'}`}>
      {source === 'ENTRA_ID' ? 'Entra ID' : 'Manual'}
    </span>
  );
}


function DesignationChip({ designation }: { designation: string | null }) {
  if (!designation) return <span className="text-[12.5px] text-slate-300">—</span>;
  return (
    <span className="text-[12.5px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-50 text-purple-700 border border-purple-200">
      {designation}
    </span>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────

function InviteModal({ onClose }: { onClose: () => void }) {
  const { data: departments = [] } = useListDepartments();
  const inviteMutation = useInviteUser();
  const [email, setEmail]       = useState('');
  const [role, setRole]         = useState('');
  const [deptIds, setDeptIds]   = useState<string[]>([]);
  const [note, setNote]         = useState('');

  const showDept = DEPT_ROLES.includes(role);

  const handleSubmit = async () => {
    if (!email.trim() || !role) return;
    await inviteMutation.mutateAsync({ email: email.trim(), role, departmentIds: deptIds, note: note || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl border border-[#D4AF37]/35 shadow-xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[17px] font-bold text-slate-900">Invite Team Member</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com"
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C]" />
          </div>
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select value={role} onChange={e => { setRole(e.target.value); setDeptIds([]); }}
              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 focus:outline-none focus:border-[#1A3E5C] bg-white">
              <option value="">Select a role…</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          {showDept && departments.length > 0 && (
            <div>
              <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Department(s)</label>
              <div className="space-y-1 max-h-32 overflow-y-auto p-2 border border-[#D4AF37]/35 rounded-lg">
                {departments.map((d: any) => (
                  <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-1 py-0.5 rounded">
                    <input type="checkbox" checked={deptIds.includes(d.id)}
                      onChange={e => setDeptIds(prev => e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id))}
                      className="accent-[#1A3E5C]" />
                    <span className="text-[14.5px] text-slate-700">{d.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[13px] text-slate-400 mt-1">This user will handle compliance tasks for assets in selected departments.</p>
            </div>
          )}
          <div>
            <label className="block text-[13.5px] font-medium text-slate-700 mb-1">Personal Note <span className="text-slate-400 font-normal">(optional, max 200 chars)</span></label>
            <textarea rows={2} maxLength={200} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Added to the invitation email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C] resize-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={!email.trim() || !role || inviteMutation.isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {inviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Invitation →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

function EditRoleModal({ user, actorRole, onClose }: { user: TeamUser; actorRole: string; onClose: () => void }) {
  const mutation = useUpdateUserRole();
  const [role, setRole] = useState(user.role);

  const allowedRoles = actorRole === 'ceo'
    ? ROLES
    : ROLES.filter(r => r !== 'CO');

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[16px] font-bold text-slate-900">Change Role — {user.name}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[14px] text-slate-500">Current role: <strong>{user.roleLabel}</strong></p>
          <div className="space-y-2">
            {allowedRoles.map(r => (
              <label key={r} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${role === r ? 'border-[#1A3E5C] bg-[#1A3E5C]/8' : 'border-[#D4AF37]/35 hover:border-[#1A3E5C]/30'}`}>
                <input type="radio" checked={role === r} onChange={() => setRole(r)} className="accent-[#1A3E5C]" />
                <div>
                  <p className="text-[14.5px] font-semibold text-slate-800">{ROLE_LABEL[r]}</p>
                </div>
              </label>
            ))}
          </div>
          {role !== user.role && DEPT_ROLES.includes(user.role) && !DEPT_ROLES.includes(role) && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13.5px] text-amber-700">Changing from {user.roleLabel} will remove all their department assignments.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button
            onClick={async () => { await mutation.mutateAsync({ id: user.id, role }); onClose(); }}
            disabled={role === user.role || mutation.isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update Role →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Departments Modal ───────────────────────────────────────────────────

function EditDeptsModal({ user, onClose }: { user: TeamUser; onClose: () => void }) {
  const { data: departments = [] } = useListDepartments();
  const mutation = useUpdateUserDepartments();
  const [selected, setSelected] = useState<string[]>(user.departments.map(d => d.id));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[16px] font-bold text-slate-900">Dept Assignments — {user.name}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5">
          <p className="text-[13.5px] text-slate-500 mb-3">
            The first department you assign will set this user as the primary {ROLE_LABEL[user.role]} for that department (used for auto-task delegation).
          </p>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {(departments as any[]).map((d: any) => (
              <label key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(d.id)}
                  onChange={e => setSelected(prev => e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id))}
                  className="accent-[#1A3E5C] w-4 h-4" />
                <span className="text-[15px] text-slate-800">{d.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={async () => { await mutation.mutateAsync({ id: user.id, departmentIds: selected }); onClose(); }}
            disabled={mutation.isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Assignments →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Entra Panel ──────────────────────────────────────────────────────────────

function EntraPanel({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const { data: entraStatus } = useEntraStatus();
  const { data: mappings = [] } = useEntraMappings();
  const { data: groups = [] }   = useEntraGroups(!!entraStatus?.connected);
  const { data: departments = [] } = useListDepartments();

  const connectMutation    = useConnectEntra();
  const syncMutation       = useSyncEntraUsers();
  const saveMappingsMut    = useSaveEntraMappings();
  const disconnectMutation = useDisconnectEntra();
  const removeMappingMut   = useRemoveGroupMapping();
  const reconnectMutation  = useReconnectEntra();

  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectForm, setConnectForm]         = useState({ tenantDomain: '', clientId: '', clientSecret: '', azureTenantId: '' });
  const [showAddMapping, setShowAddMapping]   = useState(false);
  const [newMapping, setNewMapping]           = useState({ entraGroupId: '', entraGroupName: '', role: 'IT_ADMIN', departmentId: '' });
  const [mappingToRemove, setMappingToRemove] = useState<any>(null);

  const handleConnect = async () => {
    if (mappings.length > 0) {
      await reconnectMutation.mutateAsync(connectForm);
    } else {
      await connectMutation.mutateAsync(connectForm);
    }
    setShowConnectForm(false);
    setConnectForm({ tenantDomain: '', clientId: '', clientSecret: '', azureTenantId: '' });
  };

  const handleAddMapping = async () => {
    if (!newMapping.entraGroupId || !newMapping.role) return;
    const existing = mappings as any[];
    const updated  = [
      ...existing.map((m: any) => ({
        entraGroupId: m.entraGroupId, entraGroupName: m.entraGroupName,
        role: m.role, departmentId: m.departmentId ?? undefined,
      })),
      {
        entraGroupId:   newMapping.entraGroupId,
        entraGroupName: newMapping.entraGroupName,
        role:           newMapping.role,
        departmentId:   newMapping.departmentId || undefined,
      },
    ];
    await saveMappingsMut.mutateAsync({ mappings: updated });
    setShowAddMapping(false);
    setNewMapping({ entraGroupId: '', entraGroupName: '', role: 'IT_ADMIN', departmentId: '' });
  };

  return (
    <div className="border border-[#D4AF37]/35 rounded-lg overflow-hidden mb-4">
      <div onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
        <span className="text-[#1A3E5C] text-[18px] font-bold flex-shrink-0">⬡</span>
        <div className="flex-1 text-left">
          <p className="text-[14.5px] font-semibold text-slate-800">
            Microsoft Entra ID —{' '}
            <span className={entraStatus?.connected ? 'text-green-600' : 'text-slate-400'}>
              {entraStatus?.connected ? 'Connected' : 'Not Connected'}
            </span>
          </p>
          {entraStatus?.connected ? (
            <p className="text-[13px] text-slate-400">
              {entraStatus.tenantDomain}
              {entraStatus.lastSyncAt ? ` · Last synced ${new Date(entraStatus.lastSyncAt).toLocaleString()}` : ' · Never synced'}
            </p>
          ) : (
            <p className="text-[13px] text-slate-400">Connect to sync users automatically from Microsoft Entra ID</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entraStatus?.connected && (
            <button onClick={e => { e.stopPropagation(); syncMutation.mutate(); }}
              disabled={syncMutation.isPending}
              className="text-[13px] text-[#1A3E5C] font-medium hover:text-[#D4AF37] border border-[#D4AF37]/40 px-2 py-1 rounded bg-white cursor-pointer select-none flex items-center gap-1">
              {syncMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Sync Now
            </button>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-3 relative">
          
          {/* Confirmation Modal for Removing Mapping */}
          {mappingToRemove && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-b-lg backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl border border-[#D4AF37]/35 p-5 w-[380px]">
                <p className="text-[16px] font-bold text-slate-900 mb-2">Remove Group Mapping?</p>
                <p className="text-[14.5px] text-slate-600 mb-4 leading-relaxed">
                  Are you sure you want to remove the mapping for <strong>{mappingToRemove.entraGroupName}</strong>?
                  This will immediately deactivate <strong>{mappingToRemove.userCount}</strong> users who were synced from this group.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setMappingToRemove(null)} className="flex-1 py-1.5 border border-slate-300 rounded-lg text-slate-600 text-[14.5px] hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={async () => {
                    await removeMappingMut.mutateAsync(mappingToRemove.id);
                    setMappingToRemove(null);
                  }} disabled={removeMappingMut.isPending} className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-[14.5px] font-semibold hover:bg-red-700 flex justify-center items-center gap-2 transition-colors">
                    {removeMappingMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {!entraStatus?.connected && (mappings as any[]).length === 0 ? (
            // ── Connect form ────────────────────────────────────────────────
            showConnectForm ? (
              <div className="space-y-3">
                <p className="text-[14.5px] font-semibold text-slate-800">Connect Microsoft Entra ID</p>
                <p className="text-[13.5px] text-slate-500">
                  Register an app in Azure Portal → API Permissions → Microsoft Graph → Group.Read.All + User.Read.All. Then enter your credentials below.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'tenantDomain',  label: 'Tenant Domain',    placeholder: 'yourorg.onmicrosoft.com' },
                    { key: 'azureTenantId', label: 'Azure Tenant ID',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                    { key: 'clientId',      label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                    { key: 'clientSecret',  label: 'Client Secret',    placeholder: 'Your client secret value' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-[13px] font-medium text-slate-600 mb-1">{f.label}</label>
                      <input
                        type={f.key === 'clientSecret' ? 'password' : 'text'}
                        placeholder={f.placeholder}
                        value={(connectForm as any)[f.key]}
                        onChange={e => setConnectForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="w-full h-8 px-2.5 rounded border border-slate-300 text-[13.5px] text-slate-900 focus:outline-none focus:border-[#1A3E5C]" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowConnectForm(false)} className="px-3 py-1.5 text-[14px] border border-slate-300 rounded hover:bg-slate-100 text-slate-600">Cancel</button>
                  <button onClick={handleConnect} disabled={connectMutation.isPending || !connectForm.clientId}
                    className="px-4 py-1.5 text-[14px] bg-[#1A3E5C] text-white rounded hover:bg-[#15324a] disabled:opacity-60 flex items-center gap-1.5">
                    {connectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Connect →
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowConnectForm(true)}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-[14.5px] text-slate-500 hover:border-[#1A3E5C]/40 hover:text-[#D4AF37] transition-colors">
                + Connect Microsoft Entra ID
              </button>
            )
          ) : (
            // ── Mappings panel ──────────────────────────────────────────────
            <div>
              {!entraStatus?.connected && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[15px] font-bold text-amber-800">Connection Disconnected</p>
                      <p className="text-[13.5px] text-amber-700 mt-0.5">Entra ID syncing is disabled. Synced users have been temporarily deactivated.</p>
                    </div>
                  </div>
                  <button onClick={() => setShowConnectForm(!showConnectForm)} className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[14px] font-semibold rounded-lg transition-colors">
                    Reconnect
                  </button>
                </div>
              )}

              {showConnectForm && !entraStatus?.connected && (
                <div className="mb-4 p-4 border border-amber-200 bg-white rounded-lg shadow-sm space-y-3">
                  <p className="text-[14.5px] font-semibold text-slate-800">Reconnect Microsoft Entra ID</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'tenantDomain',  label: 'Tenant Domain',    placeholder: 'yourorg.onmicrosoft.com' },
                      { key: 'azureTenantId', label: 'Azure Tenant ID',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                      { key: 'clientId',      label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
                      { key: 'clientSecret',  label: 'Client Secret',    placeholder: 'Your client secret value' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[13px] font-medium text-slate-600 mb-1">{f.label}</label>
                        <input
                          type={f.key === 'clientSecret' ? 'password' : 'text'}
                          placeholder={f.placeholder}
                          value={(connectForm as any)[f.key]}
                          onChange={e => setConnectForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          className="w-full h-8 px-2.5 rounded border border-slate-300 text-[13.5px] text-slate-900 focus:outline-none focus:border-[#1A3E5C]" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowConnectForm(false)} className="px-3 py-1.5 text-[14px] border border-slate-300 rounded hover:bg-slate-100 text-slate-600">Cancel</button>
                    <button onClick={handleConnect} disabled={reconnectMutation.isPending || !connectForm.clientId}
                      className="px-4 py-1.5 text-[14px] bg-[#1A3E5C] text-white rounded hover:bg-[#15324a] disabled:opacity-60 flex items-center gap-1.5">
                      {reconnectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Connect →
                    </button>
                  </div>
                </div>
              )}

              <p className="text-[13.5px] font-semibold text-slate-700 mb-2">Group Mappings</p>
              {(mappings as any[]).length > 0 ? (
                <div className="border border-[#D4AF37]/35 rounded-lg overflow-hidden mb-3">
                  <table className="w-full text-[14px]">
                    <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                      {['Entra Group', '→ Role', '→ Department', ''].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {(mappings as any[]).map((m: any) => (
                        <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-[13px] text-slate-700">{m.entraGroupName}</td>
                          <td className="px-3 py-2 font-medium text-slate-700">{ROLE_LABEL[m.role] ?? m.role}</td>
                          <td className="px-3 py-2 text-slate-500">{m.departmentName ?? 'Org-wide'}</td>
                          <td className="px-3 py-2 text-right">
                            <button onClick={() => setMappingToRemove(m)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remove Mapping">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[14px] text-slate-400 mb-3">No group mappings yet. Add one below to start syncing users.</p>
              )}

              {showAddMapping ? (
                <div className="p-3 border border-[#D4AF37]/35 rounded-lg bg-slate-50 space-y-3 mb-3">
                  <p className="text-[14px] font-semibold text-slate-700">Add Group Mapping</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[12.5px] text-slate-500 mb-1">Entra Group</label>
                      <select value={newMapping.entraGroupId}
                        onChange={e => {
                          const g = (groups as any[]).find((g: any) => g.id === e.target.value);
                          setNewMapping(p => ({ ...p, entraGroupId: e.target.value, entraGroupName: g?.name ?? '' }));
                        }}
                        className="w-full h-8 px-2 rounded border border-slate-300 text-[14px] focus:outline-none focus:border-[#1A3E5C]/40 bg-white">
                        <option value="">Select group…</option>
                        {(groups as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12.5px] text-slate-500 mb-1">Role</label>
                      <select value={newMapping.role} onChange={e => setNewMapping(p => ({ ...p, role: e.target.value }))}
                        className="w-full h-8 px-2 rounded border border-slate-300 text-[14px] focus:outline-none focus:border-[#1A3E5C]/40 bg-white">
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12.5px] text-slate-500 mb-1">Department (optional)</label>
                      <select value={newMapping.departmentId} onChange={e => setNewMapping(p => ({ ...p, departmentId: e.target.value }))}
                        className="w-full h-8 px-2 rounded border border-slate-300 text-[14px] focus:outline-none focus:border-[#1A3E5C]/40 bg-white">
                        <option value="">Org-wide</option>
                        {(departments as any[]).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddMapping(false)} className="px-3 py-1.5 text-[14px] border border-slate-300 rounded hover:bg-slate-100 text-slate-600">Cancel</button>
                    <button onClick={handleAddMapping} disabled={!newMapping.entraGroupId || saveMappingsMut.isPending}
                      className="px-3 py-1.5 text-[14px] bg-[#1A3E5C] text-white rounded hover:bg-[#15324a] disabled:opacity-60 flex items-center gap-1.5">
                      {saveMappingsMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Save Mapping →
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="flex gap-2">
                {!showAddMapping && (
                  <button onClick={() => setShowAddMapping(true)} className="text-[13.5px] border border-[#D4AF37]/35 px-3 py-1.5 rounded text-slate-600 hover:bg-slate-50 transition-colors">+ Add Group Mapping</button>
                )}
                <button onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}
                  className="text-[13.5px] border border-red-200 px-3 py-1.5 rounded text-red-500 hover:bg-red-50 transition-colors ml-auto flex items-center gap-1">
                  {disconnectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Disconnect Entra ID
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



// ─── Edit Designation Modal ───────────────────────────────────────────────────

function EditDesignationModal({ user, designations, onClose }: {
  user: TeamUser; designations: any[]; onClose: () => void
}) {
  const setDesigMut = useSetUserDesignation();
  const [selected, setSelected] = useState(user.lmsDesignation ?? '');

  const handleSave = async () => {
    await setDesigMut.mutateAsync({ userId: user.id, designation: selected || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[380px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <div>
            <p className="text-[16px] font-bold text-slate-900">LMS Designation</p>
            <p className="text-[13.5px] text-slate-400 mt-0.5">{user.name} · {user.roleLabel}</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[14px] text-slate-500">
            The LMS designation determines which courses this user sees and is auto-enrolled in.
          </p>
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="radio" checked={selected === ''} onChange={() => setSelected('')} className="mt-0.5 accent-[#1A3E5C]" />
              <div>
                <p className="text-[14.5px] font-medium text-slate-700">No designation</p>
                <p className="text-[13px] text-slate-400">User sees no role-specific courses</p>
              </div>
            </label>
            {(designations as any[]).map((d: any) => (
              <label key={d.id} className={`flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border transition-all ${selected === d.name ? 'border-purple-300 bg-purple-50' : 'border-transparent'}`}>
                <input type="radio" checked={selected === d.name} onChange={() => setSelected(d.name)} className="mt-0.5 accent-purple-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-bold text-slate-800 font-mono">{d.name}</p>
                  </div>
                  {d.description && <p className="text-[13px] text-slate-400 mt-0.5">{d.description}</p>}
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={setDesigMut.isPending}
            className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white text-[15px] font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {setDesigMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Designation →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { role } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab,    setActiveTab]    = useState('All Users');
  const [showInvite,   setShowInvite]   = useState(false);
  const [entraExpanded, setEntraExpanded] = useState(() => searchParams.get('setup') === 'entra');

  useEffect(() => {
    if (searchParams.get('setup') === 'entra') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('setup');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const [editRoleFor,  setEditRoleFor]  = useState<TeamUser | null>(null);
  const [editDeptFor,  setEditDeptFor]  = useState<TeamUser | null>(null);
  const [deactivating,   setDeactivating]   = useState<TeamUser | null>(null);
  const [reactivating,   setReactivating]   = useState<string | null>(null);
  const [editDesigFor,   setEditDesigFor]   = useState<TeamUser | null>(null);
  const [bulkDesigMode,  setBulkDesigMode]  = useState(false);
  const [bulkSelected,   setBulkSelected]   = useState<Set<string>>(new Set());
  const [bulkDesig,      setBulkDesig]      = useState('');

  const { data: users = [], isLoading: usersLoading }           = useListUsers();
  const { data: invitations = [], isLoading: invitesLoading }   = useListInvitations();
  const { data: departments = [] }                              = useListDepartments();
  const deactivateMut   = useDeactivateUser();
  const reactivateMut   = useReactivateUser();
  const setDesigMut     = useSetUserDesignation();
  const bulkDesigMut    = useBulkSetDesignation();
  const { data: lmsDesignations = [] } = useLmsDesignations();

  const canManage = role === 'ceo' || role === 'co';

  const TABS = ['All Users', 'By Department', 'By Role', 'Entra ID Synced', 'Pending Invites'];
  const activeUsers   = users.filter(u => u.status !== 'INACTIVE');
  const entraUsers    = users.filter(u => u.source === 'ENTRA_ID');
  const byRole        = ['CEO', 'CO', 'IT_ADMIN', 'INTERNAL_AUDITOR', 'EXTERNAL_AUDITOR'];

  // Build dept → assignedItAdminId lookup from user department assignments
  const deptUserMap = useMemo(() => {
    const map: Record<string, TeamUser[]> = {};
    users.forEach(u => u.departments.forEach(d => {
      if (!map[d.id]) map[d.id] = [];
      map[d.id].push(u);
    }));
    return map;
  }, [users]);

  const isLoading = usersLoading || invitesLoading;

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-[#1A3E5C]" />
    </div>
  );

  return (
    <div className="space-y-4">
      {showInvite    && <InviteModal onClose={() => setShowInvite(false)} />}
      {editRoleFor   && <EditRoleModal user={editRoleFor} actorRole={role} onClose={() => setEditRoleFor(null)} />}
      {editDeptFor   && <EditDeptsModal user={editDeptFor} onClose={() => setEditDeptFor(null)} />}
      {editDesigFor  && <EditDesignationModal user={editDesigFor} designations={lmsDesignations as any[]} onClose={() => setEditDesigFor(null)} />}

      {/* Deactivate confirm */}
      {deactivating && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-[380px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[16px] font-bold text-slate-900">Deactivate {deactivating.name}?</p>
                <p className="text-[13.5px] text-slate-500">{deactivating.email}</p>
              </div>
            </div>
            <p className="text-[14.5px] text-slate-600 mb-5">
              Their account will be deactivated and all their open compliance tasks will be unassigned (reset to Pending). They can be reactivated later.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeactivating(null)} className="flex-1 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={async () => { await deactivateMut.mutateAsync(deactivating.id); setDeactivating(null); }}
                disabled={deactivateMut.isPending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2">
                {deactivateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Team Members</h1>
          <p className="text-[14px] text-slate-400 mt-0.5">
            {activeUsers.length} active member{activeUsers.length !== 1 ? 's' : ''}
            {invitations.length > 0 ? ` · ${invitations.length} pending invite${invitations.length !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 text-slate-700 text-[15px] font-medium rounded-lg hover:bg-slate-50 transition-colors">
                <Plus className="w-4 h-4" /> Invite Manually
              </button>
              <button onClick={() => { setEntraExpanded(true); setActiveTab('All Users'); }}
                className="flex items-center gap-2 px-3.5 py-2 border border-[#1A3E5C]/30 text-[#1A3E5C] text-[15px] font-medium rounded-lg hover:bg-[#1A3E5C]/8 transition-colors">
                <span className="text-[16px] font-bold">⬡</span> Sync with Entra ID
              </button>
            </>
          )}
        </div>
      </div>

      {/* Entra Panel */}
      <EntraPanel expanded={entraExpanded} onToggle={() => setEntraExpanded(v => !v)} />

      {/* Tabs */}
      <div className="flex border-b border-[#D4AF37]/35 gap-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[14.5px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-[#1A3E5C] text-[#1A3E5C]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
            {tab === 'Pending Invites' && invitations.length > 0 && (
              <span className="ml-1.5 text-[12px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{invitations.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── All Users Tab ── */}
      {activeTab === 'All Users' && (
        <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                {['User', 'Role', 'LMS', 'Department(s)', 'Source', 'Status', 'Last Login', canManage ? 'Actions' : ''].filter(Boolean).map(h => (
                  <th key={h} className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[15px] text-slate-400">No team members yet</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
                        style={{ background: `${ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co']}18`, color: ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co'] }}>
                        {u.initials}
                      </span>
                      <div>
                        <p className="text-[14.5px] font-semibold text-slate-800">{u.name}</p>
                        <p className="text-[13px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleChip role={u.role} /></td>
                  <td className="px-4 py-3"><DesignationChip designation={u.lmsDesignation} /></td>
                  <td className="px-4 py-3">
                    {u.departments.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.departments.map(d => <span key={d.id} className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d.name}</span>)}
                      </div>
                    ) : <span className="text-[12.5px] text-slate-400">Org-wide</span>}
                  </td>
                  <td className="px-4 py-3"><SourceChip source={u.source} /></td>
                  <td className="px-4 py-3"><StatusChip status={u.status} /></td>
                  <td className="px-4 py-3 text-[13.5px] text-slate-400">{u.lastLoginAt}</td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {u.role !== 'CEO' && (
                          <button onClick={() => setEditRoleFor(u)}
                            className="text-[13px] px-2 py-1 border border-[#D4AF37]/35 rounded hover:bg-slate-50 text-slate-600 transition-colors">Edit Role</button>
                        )}
                        {DEPT_ROLES.includes(u.role) && (
                          <button onClick={() => setEditDeptFor(u)}
                            className="text-[13px] px-2 py-1 border border-[#D4AF37]/35 rounded hover:bg-slate-50 text-slate-600 transition-colors">Dept</button>
                        )}
                        <button onClick={() => setEditDesigFor(u)}
                          className="text-[13px] px-2 py-1 border border-purple-200 rounded hover:bg-purple-50 text-purple-600 transition-colors">LMS</button>
                        {u.role !== 'CEO' && u.status !== 'INACTIVE' && (
                          <button onClick={() => setDeactivating(u)}
                            className="text-[13px] px-2 py-1 border border-red-100 rounded hover:bg-red-50 text-red-500 transition-colors">Deactivate</button>
                        )}
                        {u.status === 'INACTIVE' && (
                          <button onClick={() => reactivateMut.mutate(u.id)}
                            className="text-[13px] px-2 py-1 border border-green-200 rounded hover:bg-green-50 text-green-600 transition-colors flex items-center gap-1">
                            <UserCheck className="w-3 h-3" /> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── By Department Tab ── */}
      {activeTab === 'By Department' && (
        <div className="space-y-3">
          {(departments as any[]).length === 0 ? (
            <div className="py-12 text-center text-[15px] text-slate-400">No departments found</div>
          ) : (departments as any[]).map((dept: any) => {
            const deptUsers    = deptUserMap[dept.id] ?? [];
            const itAdmin      = deptUsers.find(u => u.role === 'IT_ADMIN');
            const ia           = deptUsers.find(u => u.role === 'INTERNAL_AUDITOR');
            const expanded     = expandedDepts.has(dept.id);
            return (
              <div key={dept.id} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
                <button onClick={() => setExpandedDepts(p => { const n = new Set(p); n.has(dept.id) ? n.delete(dept.id) : n.add(dept.id); return n; })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <div className="flex-1">
                    <p className="text-[15px] font-bold text-slate-800">{dept.name}</p>
                    <p className="text-[13px] text-slate-400">
                      IT Admin: <span className={itAdmin ? 'text-slate-600' : 'text-amber-500'}>{itAdmin ? itAdmin.name : 'Unassigned'}</span>
                      {' · '}IA: <span className={ia ? 'text-slate-600' : 'text-amber-500'}>{ia ? ia.name : 'Unassigned'}</span>
                    </p>
                  </div>
                  <span className="text-[13px] text-slate-400">{deptUsers.length} member{deptUsers.length !== 1 ? 's' : ''}</span>
                </button>
                {expanded && deptUsers.length > 0 && (
                  <table className="w-full border-t border-slate-100">
                    <thead><tr className="bg-slate-50 text-slate-500 text-left">
                      {['User', 'Role', 'Status'].map(h => <th key={h} className="px-4 py-2 text-[13px] font-semibold uppercase tracking-wide">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {deptUsers.map(u => (
                        <tr key={u.id} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center flex-shrink-0"
                                style={{ background: `${ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co']}18`, color: ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co'] }}>{u.initials}</span>
                              <div><p className="text-[14px] font-medium text-slate-800">{u.name}</p><p className="text-[12.5px] text-slate-400">{u.email}</p></div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5"><RoleChip role={u.role} /></td>
                          <td className="px-4 py-2.5"><StatusChip status={u.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {expanded && deptUsers.length === 0 && (
                  <p className="px-4 py-3 text-[14px] text-slate-400 border-t border-slate-100">No users assigned to this department</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── By Role Tab ── */}
      {activeTab === 'By Role' && (
        <div className="space-y-3">
          {byRole.map(r => {
            const roleUsers = users.filter(u => u.role === r);
            if (!roleUsers.length) return null;
            const color    = ROLE_COLORS[ROLE_COLOR_KEY[r] ?? 'co'];
            const expanded = expandedRoles.has(r);
            return (
              <div key={r} className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
                <button onClick={() => setExpandedRoles(p => { const n = new Set(p); n.has(r) ? n.delete(r) : n.add(r); return n; })}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[14.5px] font-bold text-slate-800 flex-1 text-left">{ROLE_LABEL[r]}</span>
                  <span className="text-[13px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${color}18`, color }}>({roleUsers.length})</span>
                </button>
                {expanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
                    {roleUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                        <span className="w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>{u.initials}</span>
                        <div className="flex-1"><p className="text-[14px] font-medium text-slate-800">{u.name}</p><p className="text-[12.5px] text-slate-400">{u.email}</p></div>
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

      {/* ── Entra ID Synced Tab ── */}
      {activeTab === 'Entra ID Synced' && (
        entraUsers.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[15px] text-slate-500">No Entra ID synced users yet.</p>
            <p className="text-[14px] text-slate-400 mt-1">Connect Entra ID and run a sync to import users automatically.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
                {['User', 'Role', 'Department(s)', 'Status', 'Last Login'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[13px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {entraUsers.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full text-[12px] font-bold flex items-center justify-center"
                          style={{ background: `${ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co']}18`, color: ROLE_COLORS[ROLE_COLOR_KEY[u.role] ?? 'co'] }}>{u.initials}</span>
                        <div><p className="text-[14px] font-semibold text-slate-800">{u.name}</p><p className="text-[13px] text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleChip role={u.role} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.departments.map(d => <span key={d.id} className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d.name}</span>)}
                        {u.departments.length === 0 && <span className="text-[12.5px] text-slate-400">Org-wide</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusChip status={u.status} /></td>
                    <td className="px-4 py-3 text-[13.5px] text-slate-400">{u.lastLoginAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Pending Invites Tab ── */}
      {activeTab === 'Pending Invites' && (
        <div className="space-y-2">
          {invitations.length === 0 ? (
            <div className="py-16 text-center">
              <Check className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <p className="text-[15px] text-slate-500">No pending invitations</p>
            </div>
          ) : invitations.map(inv => {
            const urgentSoon = !inv.expired && inv.expiresInHours < 2;
            const warnSoon   = !inv.expired && inv.expiresInHours < 12 && !urgentSoon;
            return (
              <div key={inv.id} className="flex items-center gap-4 p-3.5 bg-white border border-[#D4AF37]/35 rounded-lg shadow-sm shadow-slate-900/[0.04] hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-slate-800">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleChip role={inv.role} />
                    <span className="text-[12.5px] text-slate-400">Sent {new Date(inv.createdAt).toLocaleDateString()}</span>
                    {inv.invitedBy && <span className="text-[12.5px] text-slate-400">by {inv.invitedBy}</span>}
                  </div>
                </div>
                {inv.expired ? (
                  <span className="text-[12.5px] px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold flex-shrink-0">Expired</span>
                ) : (
                  <span className={`text-[12.5px] flex-shrink-0 font-medium ${urgentSoon ? 'text-red-600' : warnSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                    Expires in {inv.expiresInHours}h
                  </span>
                )}
                {canManage && (
                  <div className="flex gap-2 flex-shrink-0">
                    <ResendButton id={inv.id} />
                    <CancelButton id={inv.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResendButton({ id }: { id: string }) {
  const mutation = useResendInvitation();
  return (
    <button onClick={() => mutation.mutate(id)} disabled={mutation.isPending}
      className="px-3 py-1.5 text-[13.5px] font-medium bg-[#1A3E5C] text-white rounded-lg hover:bg-[#15324a] transition-colors flex items-center gap-1">
      {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Resend
    </button>
  );
}

function CancelButton({ id }: { id: string }) {
  const mutation = useCancelInvitation();
  return (
    <button onClick={() => mutation.mutate(id)} disabled={mutation.isPending}
      className="px-3 py-1.5 text-[13.5px] font-medium border border-[#D4AF37]/35 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
      Cancel
    </button>
  );
}