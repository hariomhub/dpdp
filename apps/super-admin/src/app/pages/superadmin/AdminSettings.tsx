import React, { useState } from 'react';
import { Palette, Mail, Zap, Lock, Check } from 'lucide-react';

const SECTIONS = [
  { id: 'branding', icon: Palette, label: 'Platform Branding' },
  { id: 'email', icon: Mail, label: 'Email Configuration' },
  { id: 'flags', icon: Zap, label: 'Feature Flags' },
  { id: 'security', icon: Lock, label: 'Security Settings' },
];

const FEATURE_FLAGS = [
  { key: 'lms', label: 'LMS Module', desc: 'Enable learning management system for all organizations', enabled: true },
  { key: 'risk', label: 'Risk Analysis', desc: 'Enable risk scoring and risk heatmap module', enabled: true },
  { key: 'entra', label: 'Microsoft Entra ID Integration', desc: 'Allow organizations to connect Entra ID for user sync', enabled: true },
  { key: 'reports', label: 'Reports Module', desc: 'Enable report generation and export across all organizations', enabled: true },
  { key: 'external_auditor', label: 'External Auditor Role', desc: 'Allow organizations to invite external auditors', enabled: true },
  { key: 'custom_controls', label: 'Custom Controls', desc: 'Allow Compliance Officers to create organization-specific controls', enabled: false },
  { key: 'sebi', label: 'SEBI Regulation', desc: 'Make SEBI Cybersecurity Framework available to organizations', enabled: false },
  { key: 'multi_reg', label: 'Multi-Regulation Assessments', desc: 'Allow assessments spanning multiple regulations', enabled: false },
];

const SESSION_TIMEOUTS = ['15 minutes', '30 minutes', '1 hour', '2 hours', '4 hours', '8 hours', '24 hours'];

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="pb-3 border-b border-[#64748B]/20 mb-4">
      <p className="text-[17px] font-bold text-slate-900 tracking-tight">{title}</p>
      {sub && <p className="text-[14px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[13.5px] font-medium text-slate-600 mb-1">
      {children}{required && <span className="text-slate-400 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({ value, placeholder, type = 'text' }: { value?: string; placeholder?: string; type?: string }) {
  return (
    <input defaultValue={value} type={type} placeholder={placeholder}
      className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all bg-white" />
  );
}

export function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('branding');
  const [flags, setFlags] = useState<Record<string, boolean>>(Object.fromEntries(FEATURE_FLAGS.map(f => [f.key, f.enabled])));
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const toggleFlag = (key: string) => setFlags(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Platform Settings</h1>
        <p className="text-[14px] text-slate-400 mt-0.5">Configure platform-wide settings and defaults</p>
      </div>

      <div className="flex gap-5">
        {/* Section nav */}
        <div className="w-52 flex-shrink-0 space-y-0.5">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${activeSection === s.id ? 'bg-[#1A3E5C] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[14.5px] font-medium">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-5">
          {/* Platform Branding */}
          {activeSection === 'branding' && (
            <div className="space-y-4">
              <SectionHeader title="Platform Branding" sub="Customize the platform's name, logo and favicon." />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Platform Name</FieldLabel>
                    <TextInput value="NiyamSaathi" />
                  </div>
                  <div>
                    <FieldLabel>Platform Tagline</FieldLabel>
                    <TextInput value="Data Protection Compliance Made Simple" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Support Email</FieldLabel>
                    <TextInput value="support@niyamsaathi.in" type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Platform Logo</FieldLabel>
                    <div className="h-24 border-2 border-dashed border-[#64748B]/20 rounded-lg flex flex-col items-center justify-center text-[14px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors text-center px-2">
                      <Palette className="w-5 h-5 mb-1" />
                      Drag and drop logo here, or click to upload
                      <span className="text-[12.5px] mt-0.5">SVG, PNG — max 200KB · Recommended: 200×48px</span>
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Favicon</FieldLabel>
                    <div className="h-24 border-2 border-dashed border-[#64748B]/20 rounded-lg flex flex-col items-center justify-center text-[14px] text-slate-400 cursor-pointer hover:border-slate-400 hover:text-slate-600 transition-colors text-center px-2">
                      Upload favicon (ICO, PNG, 32×32px)
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] active:scale-[0.98] shadow-sm text-white text-[15px] font-semibold rounded-lg transition-colors">Save Changes →</button>
                <button className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Reset to Defaults</button>
              </div>
            </div>
          )}

          {/* Email Configuration */}
          {activeSection === 'email' && (
            <div className="space-y-4">
              <SectionHeader title="Email Configuration" sub="Configure SMTP settings for all outgoing platform emails." />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>SMTP Host</FieldLabel>
                  <TextInput value="smtp.gmail.com" />
                </div>
                <div>
                  <FieldLabel required>SMTP Port</FieldLabel>
                  <TextInput value="587" />
                </div>
                <div>
                  <FieldLabel required>SMTP Username</FieldLabel>
                  <TextInput value="noreply@niyamsaathi.in" />
                </div>
                <div>
                  <FieldLabel required>SMTP Password</FieldLabel>
                  <TextInput type="password" placeholder="••••••••••••" />
                </div>
                <div>
                  <FieldLabel required>From Name</FieldLabel>
                  <TextInput value="NiyamSaathi Platform" />
                </div>
                <div>
                  <FieldLabel required>From Email</FieldLabel>
                  <TextInput value="noreply@niyamsaathi.in" type="email" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Send Test Email</button>
                <button className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] active:scale-[0.98] shadow-sm text-white text-[15px] font-semibold rounded-lg transition-colors">Save Configuration →</button>
              </div>
            </div>
          )}

          {/* Feature Flags */}
          {activeSection === 'flags' && (
            <div className="space-y-4">
              <SectionHeader title="Feature Flags" sub="Enable or disable platform-wide features for all organizations." />
              <div className="grid grid-cols-2 gap-2">
                {FEATURE_FLAGS.map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3.5 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-[14.5px] font-semibold text-slate-800">{f.label}</p>
                      <p className="text-[13.5px] text-slate-400 mt-0.5">{f.desc}</p>
                    </div>
                    <Toggle enabled={flags[f.key]} onToggle={() => toggleFlag(f.key)} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] active:scale-[0.98] shadow-sm text-white text-[15px] font-semibold rounded-lg transition-colors">Save Feature Flags →</button>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <SectionHeader title="Security Settings" sub="Configure platform-wide security policies and access controls." />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Session Timeout</FieldLabel>
                    <select defaultValue="2 hours" className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all bg-white">
                      {SESSION_TIMEOUTS.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <p className="text-[12.5px] text-slate-400 mt-1">Auto logout after inactivity.</p>
                  </div>
                  <div>
                    <FieldLabel>Minimum Password Length</FieldLabel>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue={12} min={8} max={32}
                        className="w-24 h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all" />
                      <span className="text-[14px] text-slate-500">characters (8–32)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3.5 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-[14.5px] font-semibold text-slate-800">Enforce MFA for Super Admins</p>
                    <p className="text-[13.5px] text-slate-400 mt-0.5">Require multi-factor authentication for all Super Admin accounts</p>
                  </div>
                  <Toggle enabled={mfaEnabled} onToggle={() => setMfaEnabled(v => !v)} />
                </div>
                <div>
                  <FieldLabel>Allowed Domains for Registration</FieldLabel>
                  <input placeholder="e.g., technova.in — press Enter to add"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all mb-2" />
                  <div className="flex flex-wrap gap-2">
                    {['niyamsaathi.in', 'admin.niyamsaathi.in'].map(d => (
                      <span key={d} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-[13.5px] font-medium">
                        {d}
                        <button className="text-slate-400 hover:text-slate-600 transition-colors ml-0.5">×</button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[12.5px] text-slate-400 mt-1">Leave empty to allow any domain. Applies to Super Admin accounts only.</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button className="px-5 py-2 bg-[#15324a] hover:bg-[#1A3E5C] active:scale-[0.98] shadow-sm text-white text-[15px] font-semibold rounded-lg transition-colors">Save Security Settings →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
