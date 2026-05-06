import React, { useState } from 'react';
import { Shield, Check, AlertTriangle, Download, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV = [
  { id: 'profile', label: 'Organization Profile' },
  { id: 'dpdp', label: 'DPDP Classification' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'billing', label: 'Billing & Plan', ceoOnly: true },
  { id: 'audit', label: 'Audit Log' },
];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function OrgProfile() {
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
            <input defaultValue="TechNova Solutions Pvt. Ltd." className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Industry / Sector <span className="text-red-500">*</span></label>
            <select className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white">
              <option>Technology</option>
              {['Healthcare', 'Finance & Banking', 'E-commerce', 'Manufacturing', 'Government', 'Education'].map(o => <option key={o}>{o}</option>)}
            </select></div>
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-slate-700 mb-2">Organization Size <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            {['1–50', '51–200', '201–1000', '1000+'].map((s, i) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="orgSize" defaultChecked={i === 1} className="accent-blue-600" />
                <span className="text-[12.5px] text-slate-700">{s}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Primary Address <span className="text-red-500">*</span></label>
            <textarea rows={2} defaultValue="TechNova House, 42 Koramangala, Bangalore 560034" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] text-slate-900 focus:outline-none focus:border-blue-500 resize-none" /></div>
          <div>
            <div className="mb-3"><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Country of Operations <span className="text-red-500">*</span></label>
              <select className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500 bg-white"><option>India</option></select></div>
            <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Primary Contact Email <span className="text-red-500">*</span></label>
              <input type="email" defaultValue="contact@technova.in" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Data Protection Officer (DPO)</p>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Name <span className="text-red-500">*</span></label><input defaultValue="Priya Sharma" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Email <span className="text-red-500">*</span></label><input type="email" defaultValue="dpo@technova.in" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">DPO Phone</label><input defaultValue="+91 98765 43210" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">Organization Website</label><input defaultValue="https://technova.in" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" /></div>
      </div>
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Tax Identifiers (Optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">PAN Number</label><input defaultValue="AABCT1234H" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" style={{ fontFamily: 'JetBrains Mono, monospace' }} /></div>
          <div><label className="block text-[11.5px] font-medium text-slate-700 mb-1">GST Number</label><input defaultValue="29AABCT1234H1Z5" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 focus:outline-none focus:border-blue-500" style={{ fontFamily: 'JetBrains Mono, monospace' }} /></div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Save Changes →</button>
        <button className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function DPDPClassification() {
  const [selected, setSelected] = useState('df');
  const [notSure, setNotSure] = useState(false);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>DPDP Classification</h2>
        <p className="text-[12px] text-slate-400">Your organization's classification determines which controls and obligations apply.</p>
      </div>
      <div className="flex gap-4">
        {[
          { id: 'df', label: 'Data Fiduciary', desc: 'Determines purpose and means of processing personal data. Standard obligations under DPDP Act.', icon: '🛡️' },
          { id: 'sdf', label: 'Significant Data Fiduciary', desc: 'Higher volume or sensitive data processing. Additional obligations including DPIA and DPO requirements.', icon: '⚡' },
        ].map(c => (
          <button key={c.id} onClick={() => setSelected(c.id)}
            className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${selected === c.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
            <div className="text-[22px] mb-2">{c.icon}</div>
            <div className="flex items-center gap-2 mb-1">
              {selected === c.id && <div className="w-3 h-3 rounded-full bg-blue-600 flex items-center justify-center"><span className="w-1.5 h-1.5 rounded-full bg-white" /></div>}
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
      {notSure && <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /><p className="text-[12px] text-amber-700">Classification marked as uncertain. Your Compliance Officer has been notified.</p></div>}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <p className="text-[11.5px] font-semibold text-slate-700 mb-2">Regulations available on this platform</p>
        <div className="flex flex-wrap gap-2">
          {['DPDP Act 2023', 'RBI Data Localisation', 'SEBI Cybersecurity Framework', 'CERT-In 2022'].map(r => (
            <span key={r} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-[11.5px] rounded-md">{r}</span>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Select regulations when creating assessments.</p>
      </div>
      <button className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">Save →</button>
    </div>
  );
}

function Integrations() {
  const [connected, setConnected] = useState(true);
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
                {connected ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">● Connected</span>
                ) : null}
              </div>
              {connected ? (
                <div className="space-y-1 text-[12px] text-slate-600">
                  <p>Tenant: <span className="font-mono">technova.onmicrosoft.com</span></p>
                  <p>Last synced: 2 hours ago · <button className="text-blue-600 hover:text-blue-700 font-medium">Sync Now</button></p>
                  <p>Group mappings: 5 active · <button className="text-blue-600 hover:text-blue-700 font-medium">Manage Mappings →</button></p>
                  <button onClick={() => setConnected(false)} className="text-[11.5px] text-red-500 hover:text-red-700 font-medium mt-1">Disconnect →</button>
                </div>
              ) : (
                <div>
                  <p className="text-[12px] text-slate-500 mb-2">Connect your Microsoft directory to sync users and map groups to compliance roles.</p>
                  <p className="text-[11.5px] text-slate-400 mb-3">Benefits: Bulk user import, automatic role assignment, auto-deprovisioning when user leaves.</p>
                  <button onClick={() => setConnected(true)} className="px-4 py-2 bg-blue-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">Connect Entra ID →</button>
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
  const logs = [
    { ts: '2025-04-26 14:32', user: 'Priya Sharma', role: 'CO', action: 'Assessment created: Q2 2025 DPDP', module: 'Assessments', detail: 'Created assessment with 42 controls and 6 assets in scope' },
    { ts: '2025-04-26 11:05', user: 'Manish Kumar', role: 'IT Admin', action: 'Evidence uploaded for AES-256 encryption task', module: 'Tasks', detail: 'File: encryption-config-export.pdf' },
    { ts: '2025-04-25 17:42', user: 'Rahul Mehta', role: 'IA', action: 'Evidence approved: Data Retention Policy v2.1', module: 'Tasks', detail: 'Approved with note: Compliant with DPDP-CH2-005' },
    { ts: '2025-04-25 15:30', user: 'Amit Rao', role: 'CEO', action: 'User invited: sunita@audit.in (External Auditor)', module: 'Users', detail: 'Invitation sent, expires in 48 hours' },
    { ts: '2025-04-25 09:55', user: 'Priya Sharma', role: 'CO', action: 'DPDP Classification updated to Significant DF', module: 'Settings', detail: 'Previous: Data Fiduciary' },
  ];
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
      <div className="flex items-center gap-2">
        {[{ label: 'Date range', type: 'date' }, { label: 'From', type: 'date' }].map(f => (
          <input key={f.label} type={f.type} className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-blue-400" />
        ))}
        {[{ opts: ['All Modules', 'Assets', 'Assessments', 'Tasks', 'Users', 'Settings'] }, { opts: ['All Actions', 'Created', 'Updated', 'Deleted', 'Approved', 'Rejected'] }].map((f, i) => (
          <select key={i} className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-blue-400 bg-white">
            {f.opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 ml-auto">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-slate-500 text-left">
            {['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'].map(h => <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
          </tr></thead>
          <tbody>
            {logs.map((l, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-3 py-2.5 text-slate-400" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5 }}>{l.ts}</td>
                <td className="px-3 py-2.5 font-medium text-slate-800">{l.user}</td>
                <td className="px-3 py-2.5 text-slate-500">{l.role}</td>
                <td className="px-3 py-2.5 text-slate-700">{l.action}</td>
                <td className="px-3 py-2.5"><span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{l.module}</span></td>
                <td className="px-3 py-2.5 text-slate-400 max-w-xs"><p className="truncate">{l.detail}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { role } = useApp();
  const isCEO = role === 'ceo';
  const [activeSection, setActiveSection] = useState('profile');

  const navItems = NAV.filter(n => !n.ceoOnly || isCEO);

  const SECTION_MAP: Record<string, React.ReactNode> = {
    profile: <OrgProfile />,
    dpdp: <DPDPClassification />,
    integrations: <Integrations />,
    notifications: <Notifications />,
    billing: <BillingPlan />,
    audit: <AuditLog />,
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
