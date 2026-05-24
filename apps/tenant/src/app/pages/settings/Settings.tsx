import React, { useState, useRef } from 'react';
import { Shield, Check, AlertTriangle, Download, X, Plus, Trash2, ChevronDown, ChevronRight, Edit2, Building2, Database, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useOnboardingStatus, useSaveOrgDetails, useSaveClassification } from '../../../hooks/useOnboarding';
import { useEntraStatus, useConnectEntra, useDisconnectEntra, useSyncEntraUsers } from '../../../hooks/useEntra';
import { useAuditLog } from '../../../hooks/useAuditLog';
import {
  useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useCreateAsset, useUpdateAsset, useDeleteAsset,
  useCreatePiiRecord, useDeletePiiRecord,
  useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  useCreateSupplierAsset, useDeleteSupplierAsset,
  type DepartmentFull,
} from '../../../hooks/useOrg';
import { SettingsOrgStructure } from './SettingsOrgStructure';
import toast from 'react-hot-toast';
import { useLmsDesignations, useRoleDefaults, useSetRoleDefaults } from '../../../hooks/useLms';

const NAV = [
  { id: 'profile',    label: 'Organization Profile' },
  { id: 'structure',  label: 'Org Structure', ceoCoOnly: true },
  { id: 'dpdp',       label: 'DPDP Classification' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing',    label: 'Billing & Plan', ceoOnly: true },
  { id: 'lms',        label: 'LMS Role Mapping', ceoCoOnly: true },
  { id: 'audit',      label: 'Audit Log' },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function OrgProfile() {
  const { data: status, isLoading } = useOnboardingStatus();
  const saveOrgDetails = useSaveOrgDetails();
  const t = status?.tenant;

  const [form, setForm] = useState<Record<string, string>>({});
  const f = (key: string, fallback = '') => form[key] !== undefined ? form[key] : (t as any)?.[key] ?? fallback;
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = () => {
    if (!t) return;
    saveOrgDetails.mutate({
      name:         f('name'),
      industry:     f('industry'),
      orgSize:      f('orgSize'),
      address:      f('address'),
      country:      f('country', 'India'),
      website:      f('website'),
      contactEmail: f('contactEmail'),
      panNumber:    f('panNumber'),
      gstNumber:    f('gstNumber'),
      dpoName:      f('dpoName'),
      dpoEmail:     f('dpoEmail'),
      dpoPhone:     f('dpoPhone'),
      ceoName:      f('ceoName'),
    });
  };

  if (isLoading) return <div className="animate-pulse space-y-3">{[...Array(6)].map((_,i) => <div key={i} className="h-10 bg-slate-100 rounded-lg" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Organization Profile</h2>
        <p className="text-[12px] text-slate-400">Update your organization's details and contact information.</p>
      </div>
      <div className="space-y-4">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Basic Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Organization Legal Name <span className="text-red-500">*</span></label>
            <input value={f('name')} onChange={set('name')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Industry / Sector <span className="text-red-500">*</span></label>
            <select value={f('industry')} onChange={set('industry')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
              {['Technology', 'Healthcare', 'Finance & Banking', 'E-commerce', 'Manufacturing', 'Government', 'Education'].map(o => <option key={o}>{o}</option>)}
            </select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Primary Address <span className="text-red-500">*</span></label>
            <textarea rows={2} value={f('address')} onChange={set('address')} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500 resize-none" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Primary Contact Email <span className="text-red-500">*</span></label>
            <input type="email" value={f('contactEmail')} onChange={set('contactEmail')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
        </div>
      </div>
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Data Protection Officer (DPO)</p>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Name <span className="text-red-500">*</span></label><input value={f('dpoName')} onChange={set('dpoName')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Email <span className="text-red-500">*</span></label><input type="email" value={f('dpoEmail')} onChange={set('dpoEmail')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Phone</label><input value={f('dpoPhone')} onChange={set('dpoPhone')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Organization Website</label><input value={f('website')} onChange={set('website')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
      </div>
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tax Identifiers (Optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">PAN Number</label><input value={f('panNumber')} onChange={set('panNumber')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" style={{ fontFamily: 'JetBrains Mono, monospace' }} /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">GST Number</label><input value={f('gstNumber')} onChange={set('gstNumber')} className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" style={{ fontFamily: 'JetBrains Mono, monospace' }} /></div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saveOrgDetails.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-60">
          {saveOrgDetails.isPending ? 'Saving...' : 'Save Changes →'}
        </button>
        <button onClick={() => setForm({})} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Reset</button>
      </div>
    </div>
  );
}

function DPDPClassification() {
  const { data: status } = useOnboardingStatus();
  const saveClassification = useSaveClassification();
  const current = status?.tenant?.classification;
  const [selected, setSelected] = useState<string>('');
  const [notSure, setNotSure] = useState(false);

  const toId = (c?: string) => c === 'Significant Data Fiduciary' ? 'sdf' : 'df';
  const toLabel = (id: string) => id === 'sdf' ? 'Significant Data Fiduciary' : 'Data Fiduciary';
  const effectiveId = selected || toId(current);

  const handleSave = () => {
    saveClassification.mutate({ classification: toLabel(effectiveId) as any, classUncertain: notSure });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP Classification</h2>
        <p className="text-[12px] text-slate-400">Your organization's classification determines which controls and obligations apply.</p>
      </div>
      {current && <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md"><span className="text-[11px] text-blue-600 font-medium">Current: {current}</span></div>}
      <div className="flex gap-4">
        {[
          { id: 'df', label: 'Data Fiduciary', desc: 'Determines purpose and means of processing personal data. Standard obligations under DPDP Act.', icon: '🛡️' },
          { id: 'sdf', label: 'Significant Data Fiduciary', desc: 'Higher volume or sensitive data processing. Additional obligations including DPIA and DPO requirements.', icon: '⚡' },
        ].map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${effectiveId === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
            <div className="text-[22px] mb-2">{c.icon}</div>
            <div className="flex items-center gap-2 mb-1">
              {effectiveId === c.id && <div className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
              <p className="text-[13.5px] font-bold text-slate-900">{c.label}</p>
            </div>
            <p className="text-[11.5px] text-slate-500">{c.desc}</p>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={notSure} onChange={e => setNotSure(e.target.checked)} className="accent-blue-600 w-4 h-4" />
        <span className="text-[12.5px] text-slate-700">I'm not sure about my classification</span>
      </label>
      {notSure && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /><p className="text-[12px] text-amber-700">Classification marked as uncertain. Your Compliance Officer will be notified.</p></div>}
      <button onClick={handleSave} disabled={saveClassification.isPending} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors disabled:opacity-60">
        {saveClassification.isPending ? 'Saving...' : 'Save →'}
      </button>
    </div>
  );
}

function Integrations() {
  const { data: entraStatus, isLoading } = useEntraStatus();
  const connectEntra = useConnectEntra();
  const disconnectEntra = useDisconnectEntra();
  const syncUsers = useSyncEntraUsers();
  const connected = entraStatus?.connected ?? false;

  const [showForm, setShowForm] = useState(false);
  const [creds, setCreds] = useState({ tenantDomain: '', clientId: '', clientSecret: '', azureTenantId: '' });

  if (isLoading) return <div className="animate-pulse space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}</div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Integrations</h2>
        <p className="text-[12px] text-slate-400">Connect external services to enhance your compliance workflow.</p>
      </div>
      <div className="space-y-3">
        <div className={`p-4 border rounded-lg ${connected ? 'border-green-200 bg-green-50/30' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-[18px] flex-shrink-0">⬡</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13.5px] font-bold text-slate-900">Microsoft Entra ID</p>
                {connected && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">● Connected</span>}
              </div>
              {connected ? (
                <div className="space-y-1 text-[12px] text-slate-600">
                  <p>Tenant: <span className="font-mono">{entraStatus?.tenantDomain}</span></p>
                  <p>Last synced: {entraStatus?.lastSyncAt ? new Date(entraStatus.lastSyncAt).toLocaleString('en-IN') : 'Never'} ·{' '}
                    <button onClick={() => syncUsers.mutate()} disabled={syncUsers.isPending} className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-60">
                      {syncUsers.isPending ? 'Syncing...' : 'Sync Now'}
                    </button>
                  </p>
                  <button onClick={() => disconnectEntra.mutate()} disabled={disconnectEntra.isPending} className="text-[11.5px] text-red-500 hover:text-red-700 font-medium mt-1 disabled:opacity-60">
                    {disconnectEntra.isPending ? 'Disconnecting...' : 'Disconnect →'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[12px] text-slate-500 mb-2">Connect your Microsoft directory to sync users and map groups to compliance roles.</p>
                  {!showForm ? (
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-blue-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Entra ID →</button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {[['tenantDomain','Tenant Domain (e.g. contoso.onmicrosoft.com)'],['azureTenantId','Azure Tenant ID'],['clientId','Client ID'],['clientSecret','Client Secret']].map(([k, lbl]) => (
                        <div key={k}>
                          <label className="block text-[11px] font-medium text-slate-600 mb-0.5">{lbl}</label>
                          <input type={k === 'clientSecret' ? 'password' : 'text'} value={(creds as any)[k]} onChange={e => setCreds(p => ({ ...p, [k]: e.target.value }))}
                            className="w-full h-8 px-2 rounded-md border border-slate-300 text-[12px] focus:outline-none focus:border-blue-500" />
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => connectEntra.mutate(creds)} disabled={connectEntra.isPending} className="px-4 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60">
                          {connectEntra.isPending ? 'Connecting...' : 'Connect'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-slate-300 text-[12px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {[{ name: 'Google Workspace', icon: '🔵' }, { name: 'Okta', icon: '🟢' }].map(i => (
          <div key={i.name} className="p-4 border border-slate-200 rounded-lg bg-slate-50 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[18px]">{i.icon}</div>
              <div><p className="text-[13px] font-semibold text-slate-700">{i.name}</p><p className="text-[11.5px] text-slate-400">Coming Soon</p></div>
              <span className="ml-auto text-[10.5px] border border-slate-300 text-slate-400 px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


function Notifications() {
  const PREFS = [
    { key: 'new_task', label: 'New task assigned to me', desc: 'When a compliance task is assigned to you' },
    { key: 'rejected', label: 'My evidence was rejected', desc: 'When an Internal Auditor rejects your submitted evidence' },
    { key: 'approved', label: 'My evidence was approved', desc: 'When your evidence is approved by the Internal Auditor' },
    { key: 'signed_off', label: 'Final sign-off completed', desc: 'When an External Auditor provides final sign-off' },
    { key: 'deadline', label: 'Assessment deadline approaching', desc: '7 days before an assessment is due' },
    { key: 'overdue', label: 'Task overdue reminder', desc: 'Daily reminder when a task is overdue' },
    { key: 'new_member', label: 'New team member joined', desc: 'When a team member accepts an invitation' },
  ];
  const [prefs, setPrefs] = useState<Record<string, boolean>>(Object.fromEntries(PREFS.map(p => [p.key, true])));
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Email Notification Preferences</h2>
        <p className="text-[12px] text-slate-400">Choose which events trigger email notifications. All events are always shown in-app alerts.</p>
      </div>
      <div className="space-y-2">
        {PREFS.map(p => (
          <div key={p.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div>
              <p className="text-[12.5px] font-semibold text-slate-800">{p.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
            </div>
            <Toggle enabled={prefs[p.key]} onToggle={() => setPrefs(prev => ({ ...prev, [p.key]: !prev[p.key] }))} />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Save Preferences →</button>
        <button className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Reset to defaults</button>
      </div>
    </div>
  );
}

function BillingPlan() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Billing & Plan</h2>
        <p className="text-[12px] text-slate-400">Manage your subscription and billing information.</p>
      </div>
      <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Enterprise Plan</p>
          <button className="px-4 py-2 bg-violet-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-violet-700 transition-colors">Upgrade Plan</button>
        </div>
        <ul className="space-y-1 text-[12px] text-slate-600 mb-3">
          {['Unlimited users', 'Unlimited assessments', 'All regulations included', 'Priority support', 'Entra ID integration', 'Custom controls'].map(f => (
            <li key={f} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />{f}</li>
          ))}
        </ul>
        <p className="text-[11.5px] text-slate-500">Renewal date: June 1, 2025 · ₹1,20,000 / month</p>
      </div>
      <div>
        <p className="text-[12px] font-bold text-slate-700 mb-3">Usage This Cycle</p>
        <div className="space-y-3">
          {[{ label: 'Users', used: 7, limit: 'Unlimited' }, { label: 'Active Assessments', used: 2, limit: 'Unlimited' }, { label: 'Storage Used', used: 1.2, limit: 50, unit: 'GB' }].map(u => (
            <div key={u.label}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-slate-700">{u.label}</p>
                <p className="text-[11.5px] text-slate-500">{u.used}{u.unit ? ` ${u.unit}` : ''} of {u.limit}{u.unit ? ` ${u.unit}` : ''}</p>
              </div>
              {typeof u.limit === 'number' && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(u.used) / u.limit) * 100}%` }} /></div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[12.5px] font-semibold text-slate-800">Invoice History</p>
        </div>
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-slate-100 text-slate-500 text-left"><th className="px-4 py-2 font-medium">Date</th><th className="px-4 py-2 font-medium">Amount</th><th className="px-4 py-2 font-medium">Status</th><th className="px-4 py-2 font-medium"></th></tr></thead>
          <tbody>
            {[['Apr 1, 2025', '₹1,20,000', 'Paid'], ['Mar 1, 2025', '₹1,20,000', 'Paid'], ['Feb 1, 2025', '₹1,20,000', 'Paid']].map(([d, a, s], i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-600">{d}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{a}</td>
                <td className="px-4 py-2.5"><span className="text-[10.5px] px-2 py-0.5 bg-green-50 text-green-700 rounded font-semibold">{s}</span></td>
                <td className="px-4 py-2.5"><button className="text-[11px] text-blue-600 hover:text-blue-700">Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLog() {
  const { data, isLoading } = useAuditLog({ limit: 50 });
  const logs = data?.rows ?? [];
  return (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-[12px] text-amber-700">Audit log entries cannot be deleted or modified.</p>
      </div>
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Organization Audit Log</h2>
        <p className="text-[12px] text-slate-400">Immutable record of all actions within your organization.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse p-4 space-y-2">{[...Array(5)].map((_,i) => <div key={i} className="h-8 bg-slate-100 rounded" />)}</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-[13px]">No audit entries yet.</div>
        ) : (
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
              {['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'].map(h => <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
            </tr></thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}>{new Date(l.timestamp).toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2.5 font-medium text-slate-800">{(l as any).user}</td>
                  <td className="px-3 py-2.5 text-slate-500">{(l as any).role}</td>
                  <td className="px-3 py-2.5 text-slate-700">{(l as any).action}</td>
                  <td className="px-3 py-2.5"><span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{(l as any).module}</span></td>
                  <td className="px-3 py-2.5 text-slate-400 max-w-xs"><p className="truncate">{typeof (l as any).details === 'string' ? (l as any).details : (l as any).targetName}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function OrgStructure() {
  const { data: depts = [], isLoading } = useListDepartments();
  const createDept = useCreateDepartment();
  const deleteDept = useDeleteDepartment();
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showAddDept, setShowAddDept] = useState(false);
  const [addingAssetFor, setAddingAssetFor] = useState<string | null>(null);
  const [deptName, setDeptName] = useState('');
  const [assetName, setAssetName] = useState('');

  if (isLoading) return <div className="animate-pulse space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Org Structure</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Manage departments and assets. Changes here affect all compliance workflows.</p>
        </div>
        <button onClick={() => setShowAddDept(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Department
        </button>
      </div>

      {showAddDept && (
        <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <input autoFocus value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="Department name" className="flex-1 h-8 px-3 rounded-md border border-slate-300 text-[12.5px] focus:outline-none focus:border-blue-500" />
          <button onClick={() => { if (deptName.trim()) { createDept.mutate({ name: deptName.trim(), description: '' }); setDeptName(''); setShowAddDept(false); } }} disabled={createDept.isPending} className="px-3 py-1.5 bg-blue-600 text-white text-[12px] rounded-lg hover:bg-blue-700 disabled:opacity-60">Add</button>
          <button onClick={() => setShowAddDept(false)} className="px-3 py-1.5 border border-slate-300 text-[12px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
        </div>
      )}

      {depts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-300 rounded-lg">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-500 font-medium">No departments yet</p>
          <p className="text-[11.5px] text-slate-400 mt-1">Add your first department to get started</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
          {depts.map((dept: any) => (
            <div key={dept.id}>
              <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50">
                <button onClick={() => setExpanded(p => ({ ...p, [dept.id]: !p[dept.id] }))} className="text-slate-400">
                  {expanded[dept.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="flex-1 text-[13px] font-semibold text-slate-800">{dept.name}</span>
                <span className="text-[11px] text-slate-400">{dept.assets?.length ?? 0} assets</span>
                <button onClick={() => { setAddingAssetFor(dept.id); setExpanded(p => ({ ...p, [dept.id]: true })); }} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">+ Asset</button>
                <button onClick={() => { if (confirm(`Delete "${dept.name}"?`)) deleteDept.mutate(dept.id); }} className="text-slate-300 hover:text-red-500 ml-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {expanded[dept.id] && (
                <div className="bg-slate-50 px-4 pb-3 space-y-1.5">
                  {addingAssetFor === dept.id && (
                    <div className="flex gap-2 mb-2">
                      <input autoFocus value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="Asset name" className="flex-1 h-7 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-blue-500" />
                      <button onClick={() => { if (assetName.trim()) { createAsset.mutate({ deptId: dept.id, name: assetName.trim(), assetType: 'SYSTEM_APPLICATION', description: '', hostingLocation: 'In-House', criticality: 'Medium', internetFacing: false, status: 'Active' }); setAssetName(''); setAddingAssetFor(null); } }} className="px-2.5 py-1 bg-blue-600 text-white text-[11.5px] rounded hover:bg-blue-700">Add</button>
                      <button onClick={() => setAddingAssetFor(null)} className="px-2 py-1 text-[11.5px] text-slate-500 hover:text-slate-700">✕</button>
                    </div>
                  )}
                  {(dept.assets ?? []).length === 0 && addingAssetFor !== dept.id && (
                    <p className="text-[11.5px] text-slate-400 italic py-1">No assets — click + Asset to add one</p>
                  )}
                  {(dept.assets ?? []).map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 pl-2">
                      <Database className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 text-[12.5px] text-slate-700">{a.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{a.assetType?.replace(/_/g,' ')}</span>
                      <button onClick={() => { if (confirm(`Delete asset "${a.name}"?`)) deleteAsset.mutate(a.id); }} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LMS Role Mapping ─────────────────────────────────────────────────────────

function LmsRoleMapping() {
  const { data: designations = [] } = useLmsDesignations();
  const { data: defaults = [] }     = useRoleDefaults();
  const setDefaultsMut              = useSetRoleDefaults();
  const [mappings, setMappings]     = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const m: Record<string, string> = {};
    (defaults as any[]).forEach((d: any) => { m[d.portalRole] = d.designation; });
    setMappings(m);
  }, [defaults]);

  const PORTAL_ROLES = [
    { role: 'CEO',              label: 'CEO',               desc: 'Chief Executive Officer' },
    { role: 'CO',               label: 'Compliance Officer', desc: 'Manages compliance across org' },
    { role: 'IT_ADMIN',         label: 'IT Admin',           desc: 'Handles technical tasks per asset' },
    { role: 'INTERNAL_AUDITOR', label: 'Internal Auditor',   desc: 'Reviews and approves evidence' },
    { role: 'EXTERNAL_AUDITOR', label: 'External Auditor',   desc: 'Third-party audit access' },
  ];

  const handleSave = () => {
    const mapped = Object.entries(mappings)
      .filter(([, d]) => !!d)
      .map(([portalRole, designation]) => ({ portalRole, designation }));
    setDefaultsMut.mutate(mapped);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>LMS Role Mapping</h2>
        <p className="text-[12.5px] text-slate-500">
          Map each portal role to a default LMS designation. New users with that role will automatically
          get this designation and be enrolled in mandatory courses.
        </p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-[12px] text-blue-700">
          <strong>How it works:</strong> When a new user accepts their invite or is synced via Entra ID,
          they automatically receive the LMS designation configured here for their role.
          You can always override a specific user's designation from the Users page (LMS button).
        </p>
      </div>

      <div className="space-y-3">
        {PORTAL_ROLES.map(pr => (
          <div key={pr.role} className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-slate-800">{pr.label}</p>
              <p className="text-[11.5px] text-slate-400">{pr.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">→ Default Designation:</span>
              <select
                value={mappings[pr.role] ?? ''}
                onChange={e => setMappings(prev => ({ ...prev, [pr.role]: e.target.value }))}
                className="h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-purple-400 bg-white min-w-[160px]">
                <option value="">None</option>
                {(designations as any[]).map((d: any) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={setDefaultsMut.isPending}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg flex items-center gap-2 transition-colors">
          {setDefaultsMut.isPending ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Save Defaults
        </button>
      </div>
    </div>
  );
}


export function SettingsPage() {
  const { role } = useApp();
  const isCEO = role === 'ceo';
  const isCO  = role === 'co';
  const [activeSection, setActiveSection] = useState('profile');

  const navItems = NAV.filter(n => {
    if ((n as any).ceoOnly && !isCEO) return false;
    if ((n as any).ceoCoOnly && !isCEO && !isCO) return false;
    return true;
  });

  const SECTION_MAP: Record<string, React.ReactNode> = {
    profile:      <OrgProfile />,
    structure:    <SettingsOrgStructure />,
    dpdp:         <DPDPClassification />,
    integrations: <Integrations />,
    lms:          <LmsRoleMapping />,
    notifications: <Notifications />,
    billing:      <BillingPlan />,
    audit:        <AuditLog />,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Settings</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Manage your organization settings and preferences</p>
      </div>
      <div className="flex gap-5">
        <div className="w-48 flex-shrink-0 space-y-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] font-medium transition-colors ${activeSection === item.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-100'}`}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-5">
          {SECTION_MAP[activeSection]}
        </div>
      </div>
    </div>
  );
}