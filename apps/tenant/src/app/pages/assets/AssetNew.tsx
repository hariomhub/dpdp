import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, Check, AlertTriangle } from 'lucide-react';

// ── Exact same types & constants as OrgStructureGraph onboarding ──────────────
const ASSET_TYPES = [
  { value: 'Database / Data Store', icon: Database, desc: 'PostgreSQL, MySQL, MongoDB, S3 buckets storing personal data', example: '"Customer Database (PostgreSQL)"' },
  { value: 'SaaS (Third-Party Hosted)', icon: Globe, desc: 'External software your org subscribes to', example: '"Salesforce CRM", "Jira", "Slack"' },
  { value: 'In-House (On-Premise)', icon: Server, desc: 'Software built or hosted on your own servers', example: '"Internal HR Portal", "Finance App"' },
  { value: 'In-House (Cloud Hosted)', icon: Monitor, desc: 'Your own software running on cloud infra', example: '"Customer App on AWS"' },
  { value: 'Outsourced / Managed Service', icon: Handshake, desc: 'Fully managed by a third party on your behalf', example: '"Managed SOC", "IT Support Vendor"' },
  { value: 'Third-Party (Cloud Hosted)', icon: Package, desc: 'Third-party infrastructure your data flows through', example: '"AWS RDS", "Azure Blob Storage"' },
  { value: 'API / Integration Layer', icon: ArrowLeftRight, desc: 'Data flows and integrations between systems', example: '"Payment Gateway API", "Webhook bridge"' },
  { value: 'Mobile Application', icon: Smartphone, desc: 'Mobile app that processes personal data', example: '"Customer mobile app (iOS/Android)"' },
  { value: 'Legacy System', icon: HardDrive, desc: 'Older system still in use that handles personal data', example: '"Legacy ERP system"' },
  { value: 'Physical / Hardware', icon: Cpu, desc: 'Physical devices storing or processing personal data', example: '"Biometric scanner", "CCTV system"' },
];

const CRITICALITIES = ['Low', 'Medium', 'High', 'Critical'];
const ASSET_STATUSES = ['Active', 'Inactive', 'Under Review'];
const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Marketing', 'Sales', 'Legal', 'Operations', 'IT', 'Other'];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'European Union', 'Germany', 'Singapore', 'Australia', 'Canada', 'UAE', 'Other'];
const PII_CATEGORIES = ['Name', 'Email', 'Phone', 'Address', 'Health Data', 'Financial Data', 'Biometric', 'Government ID', "Children's Data", 'Behavioural Data', 'Location Data', 'Other'];
const LEGAL_BASES = ['Consent', 'Contract', 'Legal Obligation', 'Legitimate Interest', 'Vital Interest'];
const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const PRINCIPAL_TYPES = ['Customer', 'Employee', 'Vendor', 'Minor', 'Other'];

const VENDOR_TYPES = ['SaaS (Third-Party Hosted)', 'Outsourced / Managed Service', 'Third-Party (Cloud Hosted)', 'API / Integration Layer'];

const STEPS = ['Identity', 'Ownership', 'Technical', 'PII Data'];

function StepDot({ idx, current, label }: { idx: number; current: number; label: string }) {
  const done = idx < current;
  const active = idx === current;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11.5px] font-bold transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'border-2 border-slate-200 text-slate-400 bg-white'}`}>
        {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
      </div>
      <span className={`text-[12px] font-medium hidden sm:block ${active ? 'text-slate-900' : done ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function FField({ label, value, onChange, placeholder, required, type = 'text', hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 bg-white" />
      {hint && <p className="text-[10.5px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SField({ label, value, onChange, options, required }: { label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500 bg-white text-slate-900">
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2">
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`flex-1 h-9 text-[12.5px] font-medium rounded-lg border transition-colors ${value === v ? (v ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-600 text-white border-slate-600') : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {hint && <p className="text-[10.5px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function AssetNewPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Step 1 — Identity
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState('');

  // Step 2 — Ownership
  const [department, setDepartment] = useState('');
  const [assetOwner, setAssetOwner] = useState('');
  const [status, setStatus] = useState('Active');

  // Step 3 — Technical
  const [hostingLocation, setHostingLocation] = useState('India');
  const [internetFacing, setInternetFacing] = useState(false);
  const [vendorName, setVendorName] = useState('');

  // Step 4 — PII
  const [hasPII, setHasPII] = useState<boolean | null>(null);
  const [piiCategories, setPiiCategories] = useState<string[]>([]);
  const [sensitivity, setSensitivity] = useState('Medium');
  const [legalBasis, setLegalBasis] = useState('Consent');
  const [purpose, setPurpose] = useState('');
  const [retention, setRetention] = useState('');
  const [volume, setVolume] = useState('');
  const [crossBorder, setCrossBorder] = useState(false);
  const [crossBorderDest, setCrossBorderDest] = useState('');
  const [principalType, setPrincipalType] = useState('Customer');
  const [deletionMechanism, setDeletionMechanism] = useState('');
  const [sharedWithThirdParties, setSharedWithThirdParties] = useState(false);

  const showVendor = VENDOR_TYPES.includes(assetType);

  const step1Valid = name.trim().length >= 2 && assetType && criticality;
  const step2Valid = department && assetOwner.trim();
  const step3Valid = hostingLocation;
  const step4Valid = hasPII === false || (hasPII === true && piiCategories.length > 0 && purpose.trim().length >= 10 && retention.trim() && volume.trim());

  const estimatedControls = assetType && criticality
    ? (criticality === 'Critical' ? 22 : criticality === 'High' ? 16 : criticality === 'Medium' ? 10 : 6) + piiCategories.length * 2
    : 0;

  const togglePIICat = (cat: string) => setPiiCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);

  const canNext = [step1Valid, step2Valid, step3Valid, step4Valid][step];

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/org/assets')} className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
      </button>

      {/* Step header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Register New Asset</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">Follow the onboarding-aligned steps to register an asset for compliance tracking</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <StepDot idx={i} current={step} label={label} />
            {i < STEPS.length - 1 && <div className={`flex-1 h-px min-w-6 transition-colors ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="max-w-2xl space-y-4">

        {/* ── STEP 1: Identity ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 mb-0.5">Asset Identity</h2>
              <p className="text-[11.5px] text-slate-400">What is this asset and how critical is it?</p>
            </div>
            <FField label="Asset Name" value={name} onChange={setName} placeholder="e.g., Customer Database, HR Portal" required hint="Use a clear, descriptive name — same as how it appears in your systems." />

            {/* Asset Type selector — exact same types as onboarding */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-2">Asset Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
                {ASSET_TYPES.map(t => {
                  const Icon = t.icon;
                  const sel = assetType === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => setAssetType(t.value)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${sel ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sel ? 'bg-blue-600' : 'bg-slate-100'}`}>
                        <Icon className={`w-4 h-4 ${sel ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12.5px] font-semibold ${sel ? 'text-blue-700' : 'text-slate-800'}`}>{t.value}</p>
                        <p className="text-[11px] text-slate-500">{t.desc}</p>
                        <p className="text-[10.5px] text-slate-400 italic mt-0.5">e.g., {t.example}</p>
                      </div>
                      {sel && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                placeholder="Briefly describe what this asset does and what personal data it handles…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-2">Criticality Level <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-4 gap-2">
                {CRITICALITIES.map(c => (
                  <button key={c} type="button" onClick={() => setCriticality(c)}
                    className={`py-2 px-3 rounded-lg text-[12px] font-medium border transition-all ${criticality === c
                      ? c === 'Critical' ? 'bg-red-600 text-white border-red-600'
                        : c === 'High' ? 'bg-orange-500 text-white border-orange-500'
                        : c === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-green-600 text-white border-green-600'
                      : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Ownership ────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 mb-0.5">Ownership</h2>
              <p className="text-[11.5px] text-slate-400">Who owns this asset and which department does it belong to?</p>
            </div>
            <SField label="Department / Business Unit" value={department} onChange={setDepartment} options={DEPARTMENTS} required />
            <FField label="Asset Owner" value={assetOwner} onChange={setAssetOwner} placeholder="e.g., Manish Kumar" required hint="The person responsible for this asset's compliance." />
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-2">Status <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {ASSET_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-[12.5px] font-medium border transition-all ${status === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Technical ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 mb-0.5">Technical Details</h2>
              <p className="text-[11.5px] text-slate-400">Where is this asset hosted and how is it accessed?</p>
            </div>
            <SField label="Hosting Location / Data Residency" value={hostingLocation} onChange={setHostingLocation} options={COUNTRIES} required />
            <Toggle label="Internet Facing" value={internetFacing} onChange={setInternetFacing} hint="Is this asset accessible from the public internet?" />
            {showVendor && (
              <FField label="Vendor / Provider Name" value={vendorName} onChange={setVendorName} placeholder="e.g., Amazon Web Services, Salesforce Inc." hint="Required for third-party and SaaS assets." />
            )}
            {estimatedControls > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-blue-700">
                  Based on type <strong>{assetType}</strong> and criticality <strong>{criticality}</strong>, approximately <strong>{estimatedControls} controls</strong> will be auto-mapped to this asset.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: PII ──────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-[14px] font-bold text-slate-800 mb-0.5">Personal Data (PII)</h2>
              <p className="text-[11.5px] text-slate-400">Does this asset store or process personal data? This determines which DPDP controls apply.</p>
            </div>

            {/* Yes / No gate — matches onboarding prompt */}
            <div className="p-4 border-2 border-slate-200 rounded-xl text-center">
              <span className="text-3xl block mb-2">📋</span>
              <p className="text-[14px] font-bold text-slate-900 mb-1">Does this asset store or process personal data?</p>
              <p className="text-[12px] text-slate-500 mb-4 max-w-md mx-auto leading-relaxed">Personal data includes names, emails, phone numbers, health records, financial data, or any information that can identify a person.</p>
              <div className="flex gap-3 justify-center">
                <button type="button" onClick={() => setHasPII(true)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold border-2 transition-all ${hasPII === true ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                  ✓ Yes, it does
                </button>
                <button type="button" onClick={() => setHasPII(false)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold border-2 transition-all ${hasPII === false ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> No PII
                </button>
              </div>
            </div>

            {hasPII === true && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {/* PII Categories — same list as OrgStructureGraph */}
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-2">PII Categories <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PII_CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => togglePIICat(cat)}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left text-[11.5px] transition-all ${piiCategories.includes(cat) ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'}`}>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${piiCategories.includes(cat) ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                          {piiCategories.includes(cat) && <span className="text-white text-[8px]">✓</span>}
                        </div>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SField label="Sensitivity Level" value={sensitivity} onChange={setSensitivity} options={SENSITIVITY_LEVELS} required />
                  <SField label="Legal Basis for Processing" value={legalBasis} onChange={setLegalBasis} options={LEGAL_BASES} required />
                </div>
                <FField label="Purpose of Collection" value={purpose} onChange={setPurpose} placeholder="e.g., Customer account management (min 10 chars)" required hint="Why is this personal data collected?" />
                <div className="grid grid-cols-2 gap-3">
                  <FField label="Retention Period" value={retention} onChange={setRetention} placeholder="e.g., 3 years" required />
                  <FField label="Volume (no. of data principals)" value={volume} onChange={setVolume} placeholder="e.g., 50000" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SField label="Data Principal Type" value={principalType} onChange={setPrincipalType} options={PRINCIPAL_TYPES} required />
                  <FField label="Deletion Mechanism" value={deletionMechanism} onChange={setDeletionMechanism} placeholder="e.g., Hard delete + audit log" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Toggle label="Cross-Border Transfer" value={crossBorder} onChange={setCrossBorder} hint="Is data transferred outside India?" />
                  <Toggle label="Shared with Third Parties" value={sharedWithThirdParties} onChange={setSharedWithThirdParties} />
                </div>
                {crossBorder && (
                  <SField label="Transfer Destination Country" value={crossBorderDest} onChange={setCrossBorderDest} options={COUNTRIES} required />
                )}
              </div>
            )}

            {hasPII === false && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-amber-700 leading-relaxed">
                  This asset will be tracked without PII records. You can add PII records later from the Asset Detail page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Review summary on last step */}
        {step === 3 && name && assetType && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-[12px]">
            <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Summary</p>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {[['Asset', name], ['Type', assetType], ['Criticality', criticality], ['Department', department], ['Owner', assetOwner], ['Hosting', hostingLocation], ['Internet Facing', internetFacing ? 'Yes' : 'No'], ['Status', status]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-slate-400">{k}</span>
                  <span className="font-medium text-slate-800 text-right">{v}</span>
                </div>
              ))}
            </div>
            {estimatedControls > 0 && (
              <p className="text-[11.5px] text-blue-600 font-medium mt-1">~{estimatedControls} controls will be auto-mapped</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 text-[13px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            : <div />
          }
          {step < STEPS.length - 1
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-lg transition-all ${canNext ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            : <button onClick={() => navigate('/org/assets')} disabled={!canNext}
                className={`flex items-center gap-2 px-5 py-2 text-[13px] font-semibold rounded-lg transition-all ${canNext ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                <CheckCircle2 className="w-4 h-4" /> Save Asset
              </button>
          }
        </div>
      </div>
    </div>
  );
}
