import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router';
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Monitor, ArrowLeftRight, Handshake, Globe, Server, Package, Cpu, Smartphone, HardDrive, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useListDepartments, useCreateAsset, useUpdateAsset, useCreatePiiRecord } from '../../../hooks/useOrg';
import { useListUsers } from '../../../hooks/useUsers';
import { ASSET_TYPE_LABELS, CRITICALITY_LABELS, ASSET_STATUS_LABELS } from '../../../lib/asset-enums';

// ── Exact same types & constants as OrgStructureGraph onboarding ──────────────
// NOTE: these are the human labels the backend's org.service.ts label→enum maps
// expect on create/update (mapAssetType/mapCrit/mapStatus etc.) — not the enum
// wire values themselves, which only come back on read (see lib/asset-enums.ts).
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
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'European Union', 'Germany', 'Singapore', 'Australia', 'Canada', 'UAE', 'Other'];
const PII_CATEGORIES = ['Name', 'Email', 'Phone', 'Address', 'Health Data', 'Financial Data', 'Biometric', 'Government ID', "Children's Data", 'Behavioural Data', 'Location Data', 'Other'];
const LEGAL_BASES = ['Consent', 'Contract', 'Legal Obligation', 'Legitimate Interest', 'Vital Interest'];
const SENSITIVITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const PRINCIPAL_TYPES = ['Customer', 'Employee', 'Vendor', 'Minor', 'Other'];

const VENDOR_TYPES = ['SaaS (Third-Party Hosted)', 'Outsourced / Managed Service', 'Third-Party (Cloud Hosted)', 'API / Integration Layer'];

function StepDot({ idx, current, label }: { idx: number; current: number; label: string }) {
  const done = idx < current;
  const active = idx === current;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13.5px] font-bold transition-all ${done ? 'bg-green-500 text-white' : active ? 'bg-[#1A3E5C] text-white' : 'border-2 border-[#D4AF37]/35 text-slate-400 bg-white'}`}>
        {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
      </div>
      <span className={`text-[14px] font-medium hidden sm:block ${active ? 'text-slate-900' : done ? 'text-green-600' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function FField({ label, value, onChange, placeholder, required, type = 'text', hint, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string; hint?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C] bg-white disabled:bg-slate-50 disabled:text-slate-400" />
      {hint && <p className="text-[12.5px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SField({ label, value, onChange, options, required, disabled }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; required?: boolean; disabled?: boolean }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-[#1A3E5C] bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400">
        <option value="">Select…</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-[14px] font-semibold text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2">
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`flex-1 h-9 text-[14.5px] font-medium rounded-lg border transition-colors ${value === v ? (v ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'bg-slate-600 text-white border-slate-600') : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {hint && <p className="text-[12.5px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function AssetNewPage() {
  const navigate = useNavigate();
  const { id: assetId } = useParams();
  const location = useLocation();
  const isEdit = !!assetId;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(!isEdit);

  const { data: departments = [], isLoading: loadingDepts } = useListDepartments();
  const { data: users = [] } = useListUsers();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const createPiiRecord = useCreatePiiRecord();

  const STEPS = isEdit ? ['Identity', 'Ownership', 'Technical'] : ['Identity', 'Ownership', 'Technical', 'PII Data'];

  const existingAsset = useMemo(() => {
    if (!isEdit) return null;
    for (const d of departments) {
      const a = d.assets.find(x => x.id === assetId);
      if (a) return { ...a, deptId: d.id, deptName: d.name };
    }
    return null;
  }, [departments, assetId, isEdit]);

  // Step 1 — Identity
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState('');

  // Step 2 — Ownership
  const [deptId, setDeptId] = useState((location.state as any)?.deptId ?? '');
  const [ownerId, setOwnerId] = useState('');
  const [status, setStatus] = useState('Active');

  // Step 3 — Technical
  const [hostingLocation, setHostingLocation] = useState('India');
  const [internetFacing, setInternetFacing] = useState(false);
  const [vendorName, setVendorName] = useState('');

  // Step 4 — PII (create only)
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

  // Prefill from the real asset once departments have loaded (edit mode only)
  useEffect(() => {
    if (!isEdit || prefilled || !existingAsset) return;
    setName(existingAsset.name);
    setAssetType(ASSET_TYPE_LABELS[existingAsset.assetType] ?? existingAsset.assetType);
    setDescription(existingAsset.description ?? '');
    setCriticality(CRITICALITY_LABELS[existingAsset.criticality] ?? existingAsset.criticality);
    setDeptId(existingAsset.deptId);
    setOwnerId(existingAsset.ownerId ?? '');
    setStatus(ASSET_STATUS_LABELS[existingAsset.status] ?? existingAsset.status);
    setHostingLocation(existingAsset.hostingLocation);
    setInternetFacing(existingAsset.internetFacing);
    setVendorName(existingAsset.vendorName ?? '');
    setPrefilled(true);
  }, [isEdit, prefilled, existingAsset]);

  const showVendor = VENDOR_TYPES.includes(assetType);

  const step1Valid = name.trim().length >= 2 && assetType && criticality;
  const step2Valid = !!deptId;
  const step3Valid = !!hostingLocation;
  const step4Valid = isEdit || hasPII === false || (hasPII === true && piiCategories.length > 0 && purpose.trim().length >= 10 && retention.trim() && volume.trim());

  const togglePIICat = (cat: string) => setPiiCategories(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat]);

  const canNext = [step1Valid, step2Valid, step3Valid, step4Valid][step];
  const isLastStep = step === STEPS.length - 1;

  const handleSubmit = async () => {
    if (!canNext || submitting) return;
    setSubmitting(true);
    try {
      if (isEdit && assetId) {
        await updateAsset.mutateAsync({
          id: assetId, name, description: description || undefined, hostingLocation,
          ownerId: ownerId || null, vendorName: vendorName || undefined,
          criticality, internetFacing, status,
        });
        navigate(`/org/assets/${assetId}`);
      } else {
        const asset = await createAsset.mutateAsync({
          deptId, name, assetType, description: description || undefined,
          hostingLocation, vendorName: vendorName || undefined, criticality, internetFacing, status,
        });
        if (ownerId) {
          await updateAsset.mutateAsync({ id: asset.id, ownerId });
        }
        if (hasPII) {
          await createPiiRecord.mutateAsync({
            assetId: asset.id, categories: piiCategories, sensitivity, purpose, legalBasis,
            retention, deletionMechanism: deletionMechanism || undefined, volume,
            crossBorderTransfer: crossBorder, crossBorderDestination: crossBorder ? crossBorderDest : undefined,
            principalType, sharedWithThirdParties,
          });
        }
        navigate(`/org/assets/${asset.id}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loadingDepts) {
    return <div className="text-center py-16 text-slate-500">Loading asset...</div>;
  }
  if (isEdit && !loadingDepts && !existingAsset) {
    return <div className="text-center py-16 text-slate-500">Asset not found.</div>;
  }

  const selectedTypeInfo = ASSET_TYPES.find(t => t.value === assetType);
  const SnapshotIcon = selectedTypeInfo?.icon ?? Database;
  const STEP_TIPS = [
    'A clear name and accurate criticality drive how many controls get auto-mapped once this asset is included in an assessment.',
    'The owner is who compliance tasks default to when this asset comes up in an assessment — pick whoever is actually responsible day-to-day.',
    'Internet-facing, third-party-hosted assets typically carry more DPDP obligations than internal-only systems.',
    'PII details here determine which data-protection controls apply — categories, sensitivity, and cross-border transfer all matter for DPDP scoping.',
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/org/assets')} className="flex items-center gap-1.5 text-[14.5px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Asset Register
      </button>

      {/* Step header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>{isEdit ? 'Edit Asset' : 'Register New Asset'}</h1>
        <p className="text-[13.5px] text-slate-400 mt-0.5">
          {isEdit ? 'Update this asset\'s details. PII records are managed from the Asset Detail page.' : 'Follow the onboarding-aligned steps to register an asset for compliance tracking'}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-5 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <StepDot idx={i} current={step} label={label} />
            {i < STEPS.length - 1 && <div className={`flex-1 h-px min-w-6 transition-colors ${i < step ? 'bg-green-400' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="flex gap-5 items-start">
      <div className="flex-1 space-y-3.5 min-w-0">

        {/* ── STEP 1: Identity ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-4 space-y-3.5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 mb-0.5">Asset Identity</h2>
              <p className="text-[13px] text-slate-400">What is this asset and how critical is it?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FField label="Asset Name" value={name} onChange={setName} placeholder="e.g., Customer Database" required />
              <div>
                <label className="block text-[14px] font-semibold text-slate-700 mb-2">Criticality Level <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CRITICALITIES.map(c => (
                    <button key={c} type="button" onClick={() => setCriticality(c)}
                      className={`h-9 rounded-lg text-[13px] font-medium border transition-all ${criticality === c
                        ? c === 'Critical' ? 'bg-red-600 text-white border-red-600'
                          : c === 'High' ? 'bg-orange-500 text-white border-orange-500'
                          : c === 'Medium' ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-green-600 text-white border-green-600'
                        : 'bg-white border-slate-300 text-slate-700 hover:border-[#1A3E5C]/40'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Asset Type selector — exact same types as onboarding */}
            <div>
              <label className="block text-[14px] font-semibold text-slate-700 mb-2">
                Asset Type <span className="text-red-500">*</span>
                {isEdit && <span className="text-[12.5px] font-normal text-slate-400 ml-2">(cannot be changed after registration)</span>}
              </label>
              <div className={`grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1 ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}>
                {ASSET_TYPES.map(t => {
                  const Icon = t.icon;
                  const sel = assetType === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => !isEdit && setAssetType(t.value)}
                      title={t.desc}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${sel ? 'border-[#1A3E5C]/40 bg-[#1A3E5C]/8' : 'border-[#D4AF37]/35 bg-white hover:border-[#D4AF37]/40 hover:bg-slate-50'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${sel ? 'bg-[#1A3E5C]' : 'bg-slate-100'}`}>
                        <Icon className={`w-3.5 h-3.5 ${sel ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13.5px] font-semibold leading-tight ${sel ? 'text-[#1A3E5C]' : 'text-slate-800'}`}>{t.value}</p>
                        <p className="text-[12px] text-slate-400 truncate">{t.desc}</p>
                      </div>
                      {sel && <Check className="w-3.5 h-3.5 text-[#1A3E5C] flex-shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-semibold text-slate-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                placeholder="Briefly describe what this asset does and what personal data it handles…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1A3E5C] resize-none" />
            </div>
          </div>
        )}

        {/* ── STEP 2: Ownership ────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-4 space-y-3.5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 mb-0.5">Ownership</h2>
              <p className="text-[13px] text-slate-400">Who owns this asset and which department does it belong to?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <SField label="Department / Business Unit" value={deptId} onChange={setDeptId} required disabled={isEdit}
                  options={departments.map(d => ({ value: d.id, label: d.name }))} />
                {isEdit && <p className="text-[12px] text-slate-400 mt-0.5">Cannot be changed after registration.</p>}
              </div>
              <SField label="Asset Owner" value={ownerId} onChange={setOwnerId}
                options={users.filter(u => u.status === 'ACTIVE').map(u => ({ value: u.id, label: `${u.name} (${u.roleLabel})` }))}
                required={false} />
            </div>
            <div>
              <label className="block text-[14px] font-semibold text-slate-700 mb-2">Status <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                {ASSET_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-[14px] font-medium border transition-all ${status === s ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'bg-white border-slate-300 text-slate-700 hover:border-[#1A3E5C]/40'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Technical ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-4 space-y-3.5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 mb-0.5">Technical Details</h2>
              <p className="text-[13px] text-slate-400">Where is this asset hosted and how is it accessed?</p>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <SField label="Hosting Location / Data Residency" value={hostingLocation} onChange={setHostingLocation} required
                options={COUNTRIES.map(c => ({ value: c, label: c }))} />
              <Toggle label="Internet Facing" value={internetFacing} onChange={setInternetFacing} />
            </div>
            {showVendor && (
              <FField label="Vendor / Provider Name" value={vendorName} onChange={setVendorName} placeholder="e.g., Amazon Web Services, Salesforce Inc." hint="Required for third-party and SaaS assets." />
            )}
          </div>
        )}

        {/* ── STEP 4: PII (create only) ────────────────────────────────────────── */}
        {step === 3 && !isEdit && (
          <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-4 space-y-3.5">
            <div>
              <h2 className="text-[15px] font-bold text-slate-800 mb-0.5">Personal Data (PII)</h2>
              <p className="text-[13px] text-slate-400">Does this asset store or process personal data? This determines which DPDP controls apply.</p>
            </div>

            <div className="p-3 border-2 border-[#D4AF37]/35 rounded-xl flex items-center justify-between gap-4">
              <p className="text-[14px] font-medium text-slate-700">Does this asset store or process personal data?</p>
              <div className="flex gap-2 flex-shrink-0">
                <button type="button" onClick={() => setHasPII(true)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13.5px] font-semibold border-2 transition-all ${hasPII === true ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#D4AF37]/35 text-slate-700 hover:border-[#1A3E5C]/30'}`}>
                  ✓ Yes
                </button>
                <button type="button" onClick={() => setHasPII(false)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13.5px] font-semibold border-2 transition-all ${hasPII === false ? 'bg-slate-600 text-white border-slate-600' : 'border-[#D4AF37]/35 text-slate-700 hover:border-slate-300'}`}>
                  No PII
                </button>
              </div>
            </div>

            {hasPII === true && (
              <div className="space-y-3.5 border-t border-slate-100 pt-3.5">
                <div>
                  <label className="block text-[14px] font-semibold text-slate-700 mb-2">PII Categories <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PII_CATEGORIES.map(cat => (
                      <button key={cat} type="button" onClick={() => togglePIICat(cat)}
                        className={`flex items-center gap-2 p-2 rounded-md border text-left text-[13.5px] transition-all ${piiCategories.includes(cat) ? 'border-[#1A3E5C]/40 bg-[#1A3E5C]/8 text-[#1A3E5C]' : 'border-[#D4AF37]/35 bg-white text-slate-600 hover:border-[#1A3E5C]/30'}`}>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${piiCategories.includes(cat) ? 'border-[#1A3E5C] bg-[#D4AF37]' : 'border-slate-300'}`}>
                          {piiCategories.includes(cat) && <span className="text-white text-[10px]">✓</span>}
                        </div>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SField label="Sensitivity Level" value={sensitivity} onChange={setSensitivity} required options={SENSITIVITY_LEVELS.map(v => ({ value: v, label: v }))} />
                  <SField label="Legal Basis for Processing" value={legalBasis} onChange={setLegalBasis} required options={LEGAL_BASES.map(v => ({ value: v, label: v }))} />
                </div>
                <FField label="Purpose of Collection" value={purpose} onChange={setPurpose} placeholder="e.g., Customer account management (min 10 chars)" required hint="Why is this personal data collected?" />
                <div className="grid grid-cols-2 gap-3">
                  <FField label="Retention Period" value={retention} onChange={setRetention} placeholder="e.g., 3 years" required />
                  <FField label="Volume (no. of data principals)" value={volume} onChange={setVolume} placeholder="e.g., 50000" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SField label="Data Principal Type" value={principalType} onChange={setPrincipalType} required options={PRINCIPAL_TYPES.map(v => ({ value: v, label: v }))} />
                  <FField label="Deletion Mechanism" value={deletionMechanism} onChange={setDeletionMechanism} placeholder="e.g., Hard delete + audit log" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Toggle label="Cross-Border Transfer" value={crossBorder} onChange={setCrossBorder} hint="Is data transferred outside India?" />
                  <Toggle label="Shared with Third Parties" value={sharedWithThirdParties} onChange={setSharedWithThirdParties} />
                </div>
                {crossBorder && (
                  <SField label="Transfer Destination Country" value={crossBorderDest} onChange={setCrossBorderDest} required options={COUNTRIES.map(c => ({ value: c, label: c }))} />
                )}
              </div>
            )}

            {hasPII === false && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[14px] text-amber-700 leading-relaxed">
                  This asset will be tracked without PII records. You can add PII records later from the Asset Detail page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 px-4 py-2 text-[15px] text-slate-600 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            : <div />
          }
          {!isLastStep
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                className={`flex items-center gap-2 px-5 py-2 text-[15px] font-semibold rounded-lg transition-all ${canNext ? 'bg-[#1A3E5C] hover:bg-[#15324a] text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            : <button onClick={handleSubmit} disabled={!canNext || submitting}
                className={`flex items-center gap-2 px-5 py-2 text-[15px] font-semibold rounded-lg transition-all ${canNext && !submitting ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Save Asset'}
              </button>
          }
        </div>
      </div>

      {/* Live snapshot + contextual guidance */}
      <div className="w-72 flex-shrink-0 sticky top-4 space-y-3 hidden lg:block">
        <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${assetType ? 'bg-[#1A3E5C]' : 'bg-slate-100'}`}>
              <SnapshotIcon className={`w-4.5 h-4.5 ${assetType ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-slate-900 truncate">{name || 'Untitled Asset'}</p>
              <p className="text-[12.5px] text-slate-400 truncate">{assetType || 'Asset type not selected'}</p>
            </div>
          </div>
          <div className="space-y-2 text-[13.5px] border-t border-slate-100 pt-3">
            {[
              ['Criticality', criticality || '—', criticality ? (criticality === 'Critical' ? 'text-red-600' : criticality === 'High' ? 'text-orange-600' : criticality === 'Medium' ? 'text-amber-600' : 'text-green-600') : 'text-slate-400'],
              ['Department', departments.find(d => d.id === deptId)?.name ?? '—', 'text-slate-700'],
              ['Owner', users.find(u => u.id === ownerId)?.name ?? 'Unassigned', 'text-slate-700'],
              ['Status', status, 'text-slate-700'],
              ['Hosting', hostingLocation || '—', 'text-slate-700'],
              ['Internet Facing', internetFacing ? '⚠ Yes' : '✓ Internal', internetFacing ? 'text-orange-600' : 'text-green-600'],
            ].map(([k, v, cls]) => (
              <div key={k as string} className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex-shrink-0">{k}</span>
                <span className={`font-semibold text-right truncate ${cls}`}>{v}</span>
              </div>
            ))}
            {!isEdit && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-slate-400">PII Data</span>
                <span className={`font-semibold text-right ${hasPII === true ? 'text-red-600' : hasPII === false ? 'text-green-600' : 'text-slate-400'}`}>
                  {hasPII === true ? `Yes · ${piiCategories.length} categories` : hasPII === false ? 'None declared' : 'Not answered yet'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="p-3.5 bg-[#1A3E5C]/[0.06] border border-[#1A3E5C]/20 rounded-xl">
          <p className="text-[12px] font-bold text-[#1A3E5C] uppercase tracking-wide mb-1">Why this matters</p>
          <p className="text-[13.5px] text-[#1A3E5C]/90 leading-relaxed">{STEP_TIPS[step]}</p>
        </div>
      </div>
      </div>
    </div>
  );
}
