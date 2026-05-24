import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Edit2, Check,
  AlertTriangle, FileText, X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type PIIRecord = {
  id: string; categories: string[]; sensitivity: string;
  purpose: string; legalBasis: string; retention: string; deletionMechanism?: string;
  volume: string | number; crossBorderTransfer: boolean; crossBorderDestination?: string;
  principalType: string; sharedWithThirdParties: boolean;
};
export type Asset = {
  id: string; name: string; assetType: string; description?: string; assetOwner?: string;
  hostingLocation: string; vendorName?: string; criticality: string; internetFacing: boolean;
  status: string; piiRecords: PIIRecord[];
};
export type Supplier = {
  id: string; name: string; supplierType: string; contactName?: string; contactEmail: string;
  countryOfOperation: string; dpaSigned: boolean; contractReference?: string;
  criticality: string; status: string; assets: Asset[];
};
export type Department = {
  id: string; frontendId?: string; dbId?: string;
  name: string; description?: string;
  owner?: string; ownerEmail?: string;
  assets: Asset[]; suppliers: Supplier[];
};

export type InviteUser = {
  id: string; email: string; name: string; role: string; depts: string[]; status: string;
};
export const uid = () => Math.random().toString(36).slice(2, 9);

// ─── Constants ────────────────────────────────────────────────────────────────
const ASSET_TYPES = [
  'SaaS (Third-Party Hosted)', 'In-House (On-Premise)', 'In-House (Cloud Hosted)',
  'Outsourced / Managed Service', 'Third-Party (Cloud Hosted)', 'Physical / Hardware',
  'Database / Data Store', 'API / Integration Layer', 'Mobile Application', 'Legacy System',
];
const VENDOR_ASSET_TYPES = ['SaaS (Third-Party Hosted)', 'Outsourced / Managed Service', 'Third-Party (Cloud Hosted)'];
const SUPPLIER_TYPES = ['Cloud Provider', 'Analytics', 'Payroll', 'Marketing', 'IT Services', 'Legal', 'Other'];
const CRITICALITIES  = ['Low', 'Medium', 'High', 'Critical'];
const ASSET_STATUSES = ['Active', 'Inactive', 'Under Review'];
const SUPPLIER_STATUSES = ['Active', 'Inactive'];
const COUNTRIES = ['India','United States','United Kingdom','European Union','Germany','France','Netherlands','Singapore','Australia','Canada','Japan','UAE','Saudi Arabia','China','Brazil','South Africa','Other'];
const PII_CATEGORIES = ['Name','Email','Phone','Address','Health Data','Financial Data','Biometric','Government ID',"Children's Data",'Behavioural Data','Location Data','Other'];
const LEGAL_BASES = ['Consent','Contract','Legal Obligation','Legitimate Interest','Vital Interest'];
const PRINCIPAL_TYPES = ['Customer','Employee','Vendor','Minor','Other'];

// ─── Empty factories ──────────────────────────────────────────────────────────
export const emptyAsset    = (): Asset    => ({ id: uid(), name: '', assetType: '', description: '', assetOwner: '', hostingLocation: 'India', vendorName: '', criticality: '', internetFacing: false, status: 'Active', piiRecords: [] });
export const emptySupplier = (): Supplier => ({ id: uid(), name: '', supplierType: 'Cloud Provider', contactName: '', contactEmail: '', countryOfOperation: 'India', dpaSigned: false, contractReference: '', criticality: 'Medium', status: 'Active', assets: [] });
export const emptyPII      = (): PIIRecord=> ({ id: uid(), categories: [], sensitivity: 'Medium', purpose: '', legalBasis: 'Consent', retention: '', deletionMechanism: '', volume: 0, crossBorderTransfer: false, crossBorderDestination: 'India', principalType: 'Customer', sharedWithThirdParties: false });
export const emptyDept     = (): Department => ({ id: uid(), name: '', description: '', owner: '', ownerEmail: '', assets: [], suppliers: [] });

// ─── Validation helpers ───────────────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPositiveNumber = (v: string) => /^\d+$/.test(v.replace(/,/g, '')) && parseInt(v.replace(/,/g, '')) > 0;

// ─── Form primitives ──────────────────────────────────────────────────────────
function Ferr({ msg }: { msg?: string }) {
  return msg ? <p className="text-[10.5px] text-red-600 mt-0.5">{msg}</p> : null;
}
export function F({ label, value, onChange, placeholder, required, type = 'text', error, onBlur }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  required?: boolean; type?: string; error?: string; onBlur?: () => void;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
        className={`w-full h-8 px-3 rounded-md border text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors bg-white ${error ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
      <Ferr msg={error} />
    </div>
  );
}
function S({ label, value, onChange, options, required, error, onBlur, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
  required?: boolean; error?: string; onBlur?: () => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <select value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur}
        className={`w-full h-8 px-3 rounded-md border text-[13px] focus:outline-none focus:border-blue-500 transition-colors bg-white ${error ? 'border-red-400 bg-red-50 text-red-700' : value === '' ? 'border-slate-300 text-slate-400' : 'border-slate-300 text-slate-900'}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <Ferr msg={error} />
    </div>
  );
}
function Toggle({ label, value, onChange, required, error }: {
  label: string; value: boolean; onChange: (v: boolean) => void; required?: boolean; error?: string;
}) {
  return (
    <div>
      <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <div className="flex gap-2">
        {([true, false] as const).map(v => (
          <button key={String(v)} type="button" onClick={() => onChange(v)}
            className={`flex-1 h-8 text-[12px] font-medium rounded-md border transition-colors ${value === v ? (v ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-600 text-white border-slate-600') : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'}`}>
            {v ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      <Ferr msg={error} />
    </div>
  );
}
export function MultiSelect({ label, value, onChange, options, required, error }: {
  label: string; value: string[]; onChange: (v: string[]) => void; options: string[]; required?: boolean; error?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const toggle = (opt: string) => onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div ref={ref} className="relative">
      <label className="block text-[11.5px] font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <button onClick={() => setOpen(v => !v)} type="button"
        className={`w-full min-h-8 px-3 py-1.5 rounded-md border text-left flex items-center justify-between gap-2 focus:outline-none bg-white transition-colors ${error ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}>
        <span className={`flex-1 truncate text-[12.5px] ${value.length ? 'text-slate-900' : 'text-slate-400'}`}>
          {value.length ? value.join(', ') : 'Select categories…'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 max-h-44 overflow-y-auto">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} className="rounded" />
              <span className="text-[12px] text-slate-700">{o}</span>
            </label>
          ))}
        </div>
      )}
      <Ferr msg={error} />
    </div>
  );
}
export function G2({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-2 gap-3">{children}</div>; }
export function FormSaveBar({ onSave, onCancel, saveLabel = 'Save', disabled }: { onSave: () => void; onCancel: () => void; saveLabel?: string; disabled?: boolean; }) {
  return (
    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-100">
      <button type="button" onClick={onCancel} className="px-4 h-8 text-[12.5px] text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors">Cancel</button>
      <button type="button" onClick={onSave} disabled={disabled}
        className={`px-5 h-8 text-[12.5px] font-semibold text-white rounded-md transition-colors ${disabled ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
        {saveLabel}
      </button>
    </div>
  );
}

// ─── Department Form ──────────────────────────────────────────────────────────
export function DeptForm({ initial, existingNames, onSave, onCancel }: {
  initial: Partial<Department>; existingNames: string[];
  onSave: (d: Partial<Department>) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name || '');
  const [description, setDescription] = useState(initial.description || '');
  const [owner, setOwner] = useState(initial.owner || '');
  const [ownerEmail, setOwnerEmail] = useState(initial.ownerEmail || '');
  const [t, setT] = useState<Set<string>>(new Set());
  const touch = (f: string) => setT(prev => new Set([...prev, f]));

  const nameErr = !name.trim() ? 'Required' : name.trim().length < 2 ? 'Min 2 characters' : (existingNames.filter(n => n !== initial.name).includes(name.trim())) ? 'Name already exists' : undefined;
  const isValid = !nameErr;

  return (
    <div className="space-y-3">
      <F label="Department Name" value={name} onChange={setName} onBlur={() => touch('name')} placeholder="e.g., Engineering" required error={t.has('name') ? nameErr : undefined} />
      <F label="Description" value={description} onChange={setDescription} placeholder="What does this department handle?" />
      <G2>
        <F label="Department Owner" value={owner} onChange={setOwner} placeholder="e.g., Jane Doe" />
        <F label="Owner Email" value={ownerEmail} onChange={setOwnerEmail} placeholder="jane@company.com" type="email" />
      </G2>

      <FormSaveBar disabled={!isValid}
        onSave={() => { touch('name'); isValid && onSave({ name: name.trim(), description, owner, ownerEmail }); }}
        onCancel={onCancel} saveLabel="Save Department →" />
    </div>
  );
}

// ─── Asset Form ───────────────────────────────────────────────────────────────
export function AssetForm({ initial, existingNames, onSave, onCancel }: {
  initial: Partial<Asset>; existingNames: string[];
  onSave: (a: Asset) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Asset>({ ...emptyAsset(), ...initial });
  const [t, setT] = useState<Set<string>>(new Set());
  const up = (k: keyof Asset, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const touch = (k: string) => setT(prev => new Set([...prev, k]));
  const showVendor = VENDOR_ASSET_TYPES.includes(f.assetType);

  const errs = {
    name: !f.name.trim() ? 'Required' : f.name.trim().length < 2 ? 'Min 2 characters' : existingNames.filter(n => n !== initial.name).includes(f.name.trim()) ? 'Already exists in this department' : undefined,
    assetType: !f.assetType ? 'Required — select an asset type' : undefined,
    hostingLocation: !f.hostingLocation ? 'Required' : undefined,
    criticality: !f.criticality ? 'Required — select a criticality level' : undefined,
  };
  const isValid = !Object.values(errs).some(Boolean);

  return (
    <div className="space-y-3">
      <F label="Asset Name" value={f.name} onChange={v => up('name', v)} onBlur={() => touch('name')} placeholder="e.g., Customer Database" required error={t.has('name') ? errs.name : undefined} />
      <G2>
        <S label="Asset Type" value={f.assetType} onChange={v => up('assetType', v)} onBlur={() => touch('assetType')} options={ASSET_TYPES} required placeholder="Select type…" error={t.has('assetType') ? errs.assetType : undefined} />
        <S label="Criticality Level" value={f.criticality} onChange={v => up('criticality', v)} onBlur={() => touch('criticality')} options={CRITICALITIES} required placeholder="Select…" error={t.has('criticality') ? errs.criticality : undefined} />
      </G2>
      <F label="Description" value={f.description || ''} onChange={v => up('description', v)} placeholder="Brief description…" />
      <G2>
        <F label="Asset Owner" value={f.assetOwner || ''} onChange={v => up('assetOwner', v)} placeholder="Name or team" />
        <S label="Status" value={f.status} onChange={v => up('status', v)} options={ASSET_STATUSES} required />
      </G2>
      <G2>
        <S label="Hosting Location / Data Residency" value={f.hostingLocation} onChange={v => up('hostingLocation', v)} onBlur={() => touch('hostingLocation')} options={COUNTRIES} required placeholder="Select country…" error={t.has('hostingLocation') ? errs.hostingLocation : undefined} />
        <Toggle label="Internet Facing" value={f.internetFacing} onChange={v => up('internetFacing', v)} required />
      </G2>
      {showVendor && <F label="Vendor / Provider Name" value={f.vendorName || ''} onChange={v => up('vendorName', v)} placeholder="e.g., AWS, Salesforce" />}
      <FormSaveBar disabled={!isValid} onSave={() => { setT(new Set(['name','assetType','hostingLocation','criticality'])); isValid && onSave(f); }} onCancel={onCancel} saveLabel="Save Asset →" />
    </div>
  );
}

// ─── PII Form ─────────────────────────────────────────────────────────────────
export function PIIForm({ initial, onSave, onCancel }: {
  initial: Partial<PIIRecord>; onSave: (p: PIIRecord) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<PIIRecord>({ ...emptyPII(), ...initial });
  const [t, setT] = useState<Set<string>>(new Set());
  const up = (k: keyof PIIRecord, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const touch = (k: string) => setT(prev => new Set([...prev, k]));

  const errs = {
    categories: f.categories.length === 0 ? 'Select at least one category' : undefined,
    purpose: !f.purpose.trim() ? 'Required' : f.purpose.trim().length < 10 ? 'Min 10 characters' : undefined,
    retention: !f.retention.trim() ? 'Required' : undefined,
    volume: !String(f.volume).trim() ? 'Required' : !isPositiveNumber(String(f.volume)) ? 'Must be a positive number' : undefined,
    crossBorderDestination: f.crossBorderTransfer && !f.crossBorderDestination ? 'Required when transfer is Yes' : undefined,
  };
  const isValid = !Object.values(errs).some(Boolean);

  return (
    <div className="space-y-3">
      <MultiSelect label="PII Category" value={f.categories} onChange={v => { up('categories', v); touch('categories'); }} options={PII_CATEGORIES} required error={t.has('categories') ? errs.categories : undefined} />
      <G2>
        <S label="Sensitivity Level" value={f.sensitivity} onChange={v => up('sensitivity', v)} options={['Low','Medium','High','Critical']} required />
        <S label="Legal Basis for Processing" value={f.legalBasis} onChange={v => up('legalBasis', v)} options={LEGAL_BASES} required />
      </G2>
      <F label="Purpose of Collection" value={f.purpose} onChange={v => up('purpose', v)} onBlur={() => touch('purpose')} placeholder="e.g., Customer account management (min 10 chars)" required error={t.has('purpose') ? errs.purpose : undefined} />
      <G2>
        <F label="Retention Period" value={f.retention} onChange={v => up('retention', v)} onBlur={() => touch('retention')} placeholder="e.g., 3 years" required error={t.has('retention') ? errs.retention : undefined} />
        <F label="Volume (no. of data principals)" value={String(f.volume)} onChange={v => up('volume', v)} onBlur={() => touch('volume')} placeholder="e.g., 50000" required error={t.has('volume') ? errs.volume : undefined} />
      </G2>
      <G2>
        <S label="Data Principal Type" value={f.principalType} onChange={v => up('principalType', v)} options={PRINCIPAL_TYPES} required />
        <F label="Deletion Mechanism" value={f.deletionMechanism || ''} onChange={v => up('deletionMechanism', v)} placeholder="e.g., Hard delete + audit log" />
      </G2>
      <G2>
        <Toggle label="Cross-Border Transfer" value={f.crossBorderTransfer} onChange={v => { up('crossBorderTransfer', v); touch('crossBorderDestination'); }} required />
        <Toggle label="Shared with Third Parties" value={f.sharedWithThirdParties} onChange={v => up('sharedWithThirdParties', v)} required />
      </G2>
      {f.crossBorderTransfer && (
        <S label="Transfer Destination Country" value={f.crossBorderDestination || ''} onChange={v => up('crossBorderDestination', v)} options={['', ...COUNTRIES]} error={t.has('crossBorderDestination') ? errs.crossBorderDestination : undefined} placeholder="Select country…" />
      )}
      <FormSaveBar disabled={!isValid} onSave={() => { setT(new Set(['categories','purpose','retention','volume','crossBorderDestination'])); isValid && onSave(f); }} onCancel={onCancel} saveLabel="Save PII →" />
    </div>
  );
}

// ─── Supplier Form ────────────────────────────────────────────────────────────
export function SupplierForm({ initial, onSave, onCancel }: {
  initial: Partial<Supplier>; onSave: (s: Supplier) => void; onCancel: () => void;
}) {
  const [f, setF] = useState<Supplier>({ ...emptySupplier(), ...initial });
  const [t, setT] = useState<Set<string>>(new Set());
  const up = (k: keyof Supplier, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const touch = (k: string) => setT(prev => new Set([...prev, k]));

  const errs = {
    name: !f.name.trim() ? 'Required' : undefined,
    contactEmail: !f.contactEmail.trim() ? 'Required' : !isValidEmail(f.contactEmail) ? 'Enter a valid email address' : undefined,
    countryOfOperation: !f.countryOfOperation ? 'Required' : undefined,
  };
  const isValid = !Object.values(errs).some(Boolean);

  return (
    <div className="space-y-3">
      <F label="Supplier Name" value={f.name} onChange={v => up('name', v)} onBlur={() => touch('name')} placeholder="e.g., Amazon Web Services" required error={t.has('name') ? errs.name : undefined} />
      <G2>
        <S label="Supplier Type" value={f.supplierType} onChange={v => up('supplierType', v)} options={SUPPLIER_TYPES} required />
        <S label="Criticality" value={f.criticality} onChange={v => up('criticality', v)} options={CRITICALITIES} required />
      </G2>
      <G2>
        <F label="Contact Name" value={f.contactName || ''} onChange={v => up('contactName', v)} placeholder="Account manager" />
        <F label="Contact Email" value={f.contactEmail} onChange={v => up('contactEmail', v)} onBlur={() => touch('contactEmail')} placeholder="contact@supplier.com" type="email" required error={t.has('contactEmail') ? errs.contactEmail : undefined} />
      </G2>
      <G2>
        <S label="Country of Operation" value={f.countryOfOperation} onChange={v => up('countryOfOperation', v)} onBlur={() => touch('countryOfOperation')} options={COUNTRIES} required placeholder="Select country…" error={t.has('countryOfOperation') ? errs.countryOfOperation : undefined} />
        <S label="Status" value={f.status} onChange={v => up('status', v)} options={SUPPLIER_STATUSES} required />
      </G2>
      <G2>
        <Toggle label="DPA Signed" value={f.dpaSigned} onChange={v => up('dpaSigned', v)} required />
        <F label="Contract / DPA Reference" value={f.contractReference || ''} onChange={v => up('contractReference', v)} placeholder="e.g., DPA-2024-001" />
      </G2>
      <FormSaveBar disabled={!isValid} onSave={() => { setT(new Set(['name','contactEmail','countryOfOperation'])); isValid && onSave(f); }} onCancel={onCancel} saveLabel="Save Supplier →" />
    </div>
  );
}

// ─── Panel state type ─────────────────────────────────────────────────────────
type PanelState =
  | null
  | { type: 'addDept' }
  | { type: 'promptDept'; deptId: string }
  | { type: 'addAsset'; deptId: string }
  | { type: 'promptAsset'; deptId: string; assetId: string }
  | { type: 'addPII'; deptId: string; assetId: string }
  | { type: 'promptOwnPII'; deptId: string; assetId: string }
  | { type: 'addSupplier'; deptId: string }
  | { type: 'promptSupplier'; deptId: string; suppId: string }
  | { type: 'addSuppAsset'; deptId: string; suppId: string }
  | { type: 'promptSuppAsset'; deptId: string; suppId: string; suppAssetId: string }
  | { type: 'addSuppPII'; deptId: string; suppId: string; suppAssetId: string }
  | { type: 'promptSuppPII'; deptId: string; suppId: string; suppAssetId: string }
  | { type: 'editDept'; deptId: string }
  | { type: 'editAsset'; deptId: string; assetId: string }
  | { type: 'editPII'; deptId: string; assetId: string; piiId: string }
  | { type: 'editSupplier'; deptId: string; suppId: string }
  | { type: 'editSuppAsset'; deptId: string; suppId: string; suppAssetId: string }
  | { type: 'editSuppPII'; deptId: string; suppId: string; suppAssetId: string; piiId: string };

// ─── Enhanced Tree Node ───────────────────────────────────────────────────────
const TYPE_META = {
  dept:      { emoji: '🏢', badge: 'DEPT',         badgeCls: 'bg-blue-100 text-blue-700' },
  asset:     { emoji: '🗄️', badge: 'OWN ASSET',    badgeCls: 'bg-green-100 text-green-700' },
  supplier:  { emoji: '🤝', badge: 'SUPPLIER',      badgeCls: 'bg-orange-100 text-orange-700' },
  suppAsset: { emoji: '📦', badge: 'VENDOR ASSET',  badgeCls: 'bg-amber-100 text-amber-700' },
  pii:       { emoji: '🔴', badge: 'PII RECORD',    badgeCls: 'bg-red-100 text-red-700' },
} as const;

function TreeNodeRow({
  nodeType, label, summary, depth, isSelected, isExpanded, warning,
  onToggle, onSelect, onEdit, onDelete, onAdd,
}: {
  nodeType: keyof typeof TYPE_META; label: string; summary?: string; depth: number;
  isSelected?: boolean; isExpanded?: boolean; warning?: string;
  onToggle?: () => void; onSelect: () => void; onEdit: () => void; onDelete: () => void;
  onAdd?: () => void;
}) {
  const [hov, setHov] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const meta = TYPE_META[nodeType];

  return (
    <div>
      <div
        className={`flex items-start gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-50 border border-blue-200' : hov ? 'bg-slate-50 border border-transparent' : 'border border-transparent'}`}
        style={{ paddingLeft: depth * 14 + 8 }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={onSelect}
      >
        {/* Expand toggle — always visible */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onToggle?.(); }}
          className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-slate-400 mt-0.5 hover:text-slate-700"
        >
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Emoji */}
        <span className="text-[13px] flex-shrink-0 mt-0.5 leading-none">{meta.emoji}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12.5px] font-semibold text-slate-800 truncate">{label || <span className="text-slate-400 italic">Unnamed</span>}</span>
            <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${meta.badgeCls}`}>{meta.badge}</span>
          </div>
          {summary && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{summary}</p>}
          {warning && (
            <p className="text-[10.5px] text-orange-500 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" />{warning}
            </p>
          )}
        </div>

        {/* Hover actions */}
        {hov && !confirming && (
          <div className="flex items-center gap-0.5 flex-shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
            {onAdd && (
              <button type="button" onClick={onAdd} title="Add child" className="p-1 text-slate-300 hover:text-green-600 rounded transition-colors"><Plus className="w-3.5 h-3.5" /></button>
            )}
            <button type="button" onClick={onEdit} title="Edit" className="p-1 text-slate-300 hover:text-blue-600 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setConfirming(true)} title="Delete" className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Inline delete confirm */}
      {confirming && (
        <div
          className="flex items-center gap-2 px-3 py-2 mx-2 mb-1 bg-red-50 border border-red-200 rounded-lg text-[11.5px]"
          style={{ marginLeft: depth * 14 + 8 + 22 }}
        >
          <span className="flex-1 text-red-700 font-medium">Delete this?</span>
          <button type="button" onClick={() => { setConfirming(false); onDelete(); }}
            className="px-3 py-1 bg-red-500 text-white rounded text-[11px] font-semibold hover:bg-red-600 transition-colors">Yes, Delete</button>
          <button type="button" onClick={() => setConfirming(false)}
            className="px-3 py-1 border border-red-200 text-red-600 rounded text-[11px] hover:bg-red-50 transition-colors">Cancel</button>
        </div>
      )}
    </div>
  );
}

// ─── Enhanced Tree ────────────────────────────────────────────────────────────
function EnhancedTree({ departments, setDepartments, panel, setPanel, selectedId, setSelectedId }: {
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  panel: PanelState;
  setPanel: (p: PanelState) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const [exp, setExp] = useState<Set<string>>(new Set(departments.map(d => d.id)));
  const tog = (id: string) => setExp(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Ensure new depts are auto-expanded
  useEffect(() => {
    setExp(prev => {
      const n = new Set(prev);
      departments.forEach(d => n.add(d.id));
      return n;
    });
  }, [departments.length]);

  const upDepts = (fn: (p: Department[]) => Department[]) => setDepartments(fn);

  const deptPII = (dept: Department) =>
    dept.assets.reduce((s, a) => s + a.piiRecords.length, 0) +
    dept.suppliers.reduce((s, sup) => s + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0);

  return (
    <div className="space-y-0.5">
      {departments.length === 0 && (
        <div className="text-center py-8 px-4">
          <p className="text-[12px] text-slate-400">No departments yet.</p>
          <p className="text-[11px] text-slate-400 mt-1">Use "+ Add Department" below to start.</p>
        </div>
      )}
      {departments.map(dept => {
        const dExp = exp.has(dept.id);
        return (
          <div key={dept.id}>
            <TreeNodeRow
              nodeType="dept" depth={0}
              label={dept.name}
              summary={`${dept.assets.length} assets · ${dept.suppliers.length} suppliers · ${deptPII(dept)} PII records`}
              isSelected={selectedId === dept.id} isExpanded={dExp}
              onToggle={() => tog(dept.id)}
              onSelect={() => setSelectedId(dept.id)}
              onAdd={() => { setSelectedId(dept.id); setPanel({ type: 'promptDept', deptId: dept.id }); }}
              onEdit={() => { setSelectedId(dept.id); setPanel({ type: 'editDept', deptId: dept.id }); }}
              onDelete={() => { upDepts(p => p.filter(d => d.id !== dept.id)); setSelectedId(null); setPanel(null); }}
            />
            {dExp && (
              <div>
                {dept.assets.map(asset => {
                  const aExp = exp.has(asset.id);
                  return (
                    <div key={asset.id}>
                      <TreeNodeRow
                        nodeType="asset" depth={1}
                        label={asset.name}
                        summary={`${asset.assetType || '—'} · ${asset.criticality || '—'}`}
                        warning={asset.piiRecords.length === 0 ? 'No PII records added' : undefined}
                        isSelected={selectedId === asset.id} isExpanded={aExp}
                        onToggle={() => tog(asset.id)}
                        onSelect={() => setSelectedId(asset.id)}
                        onAdd={() => { setSelectedId(asset.id); setPanel({ type: 'addPII', deptId: dept.id, assetId: asset.id }); }}
                        onEdit={() => { setSelectedId(asset.id); setPanel({ type: 'editAsset', deptId: dept.id, assetId: asset.id }); }}
                        onDelete={() => { upDepts(p => p.map(d => d.id === dept.id ? { ...d, assets: d.assets.filter(a => a.id !== asset.id) } : d)); setSelectedId(null); setPanel(null); }}
                      />
                      {aExp && asset.piiRecords.map(pii => (
                        <TreeNodeRow key={pii.id}
                          nodeType="pii" depth={2}
                          label={`PII: ${pii.categories.join(', ') || 'No categories'}`}
                          summary={`${pii.sensitivity} · ${pii.principalType} · ${pii.legalBasis}`}
                          isSelected={selectedId === pii.id}
                          onToggle={() => tog(pii.id)}
                          onSelect={() => setSelectedId(pii.id)}
                          onEdit={() => { setSelectedId(pii.id); setPanel({ type: 'editPII', deptId: dept.id, assetId: asset.id, piiId: pii.id }); }}
                          onDelete={() => { upDepts(p => p.map(d => d.id === dept.id ? { ...d, assets: d.assets.map(a => a.id === asset.id ? { ...a, piiRecords: a.piiRecords.filter(pi => pi.id !== pii.id) } : a) } : d)); setSelectedId(null); setPanel(null); }}
                        />
                      ))}
                    </div>
                  );
                })}
                {dept.suppliers.map(sup => {
                  const sExp = exp.has(sup.id);
                  return (
                    <div key={sup.id}>
                      <TreeNodeRow
                        nodeType="supplier" depth={1}
                        label={sup.name}
                        summary={`${sup.supplierType} · ${sup.assets.length} asset${sup.assets.length !== 1 ? 's' : ''}`}
                        isSelected={selectedId === sup.id} isExpanded={sExp}
                        onToggle={() => tog(sup.id)}
                        onSelect={() => setSelectedId(sup.id)}
                        onAdd={() => { setSelectedId(sup.id); setPanel({ type: 'addSuppAsset', deptId: dept.id, suppId: sup.id }); }}
                        onEdit={() => { setSelectedId(sup.id); setPanel({ type: 'editSupplier', deptId: dept.id, suppId: sup.id }); }}
                        onDelete={() => { upDepts(p => p.map(d => d.id === dept.id ? { ...d, suppliers: d.suppliers.filter(s => s.id !== sup.id) } : d)); setSelectedId(null); setPanel(null); }}
                      />
                      {sExp && sup.assets.map(sa => {
                        const saExp = exp.has(sa.id);
                        return (
                          <div key={sa.id}>
                            <TreeNodeRow
                              nodeType="suppAsset" depth={2}
                              label={sa.name}
                              summary={`${sa.assetType || '—'} · ${sa.criticality || '—'}`}
                              warning={sa.piiRecords.length === 0 ? 'No PII records added' : undefined}
                              isSelected={selectedId === sa.id} isExpanded={saExp}
                              onToggle={() => tog(sa.id)}
                              onSelect={() => setSelectedId(sa.id)}
                              onAdd={() => { setSelectedId(sa.id); setPanel({ type: 'addSuppPII', deptId: dept.id, suppId: sup.id, suppAssetId: sa.id }); }}
                              onEdit={() => { setSelectedId(sa.id); setPanel({ type: 'editSuppAsset', deptId: dept.id, suppId: sup.id, suppAssetId: sa.id }); }}
                              onDelete={() => { upDepts(p => p.map(d => d.id === dept.id ? { ...d, suppliers: d.suppliers.map(s => s.id === sup.id ? { ...s, assets: s.assets.filter(a => a.id !== sa.id) } : s) } : d)); setSelectedId(null); setPanel(null); }}
                            />
                            {saExp && sa.piiRecords.map(pii => (
                              <TreeNodeRow key={pii.id}
                                nodeType="pii" depth={3}
                                label={`PII: ${pii.categories.join(', ') || 'No categories'}`}
                                summary={`${pii.sensitivity} · ${pii.principalType} · ${pii.legalBasis}`}
                                isSelected={selectedId === pii.id}
                                onToggle={() => tog(pii.id)}
                                onSelect={() => setSelectedId(pii.id)}
                                onEdit={() => { setSelectedId(pii.id); setPanel({ type: 'editSuppPII', deptId: dept.id, suppId: sup.id, suppAssetId: sa.id, piiId: pii.id }); }}
                                onDelete={() => { upDepts(p => p.map(d => d.id === dept.id ? { ...d, suppliers: d.suppliers.map(s => s.id === sup.id ? { ...s, assets: s.assets.map(a => a.id === sa.id ? { ...a, piiRecords: a.piiRecords.filter(pi => pi.id !== pii.id) } : a) } : s) } : d)); setSelectedId(null); setPanel(null); }}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Guided prompt helpers ────────────────────────────────────────────────────
function SuccessBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <Check className="w-3 h-3 text-white" />
      </div>
      <p className="text-[12.5px] font-semibold text-green-800">{msg}</p>
    </div>
  );
}
function PromptBtn({ label, primary, sub, onClick }: { label: string; primary?: boolean; sub?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${primary ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
      <p className={`text-[13px] font-semibold ${primary ? 'text-white' : 'text-slate-800'}`}>{label}</p>
      {sub && <p className={`text-[11px] mt-0.5 ${primary ? 'text-blue-100' : 'text-slate-400'}`}>{sub}</p>}
    </button>
  );
}

// ─── Right Form Panel ─────────────────────────────────────────────────────────
function FormPanel({ panel, setPanel, departments, setDepartments, onSkipToTeam }: {
  panel: PanelState;
  setPanel: (p: PanelState) => void;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  onSkipToTeam: () => void;
}) {
  const upDepts = (fn: (p: Department[]) => Department[]) => setDepartments(fn);
  const getDept    = (id: string) => departments.find(d => d.id === id);
  const getAsset   = (dId: string, aId: string) => getDept(dId)?.assets.find(a => a.id === aId);
  const getSupp    = (dId: string, sId: string) => getDept(dId)?.suppliers.find(s => s.id === sId);
  const getSA      = (dId: string, sId: string, aId: string) => getSupp(dId, sId)?.assets.find(a => a.id === aId);
  const getPII     = (dId: string, aId: string, pId: string) => getAsset(dId, aId)?.piiRecords.find(p => p.id === pId);
  const getSuppPII = (dId: string, sId: string, aId: string, pId: string) => getSA(dId, sId, aId)?.piiRecords.find(p => p.id === pId);
  const allDeptNames = departments.map(d => d.name);

  if (!panel) return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <FileText className="w-10 h-10 text-slate-200 mb-3" />
      <p className="text-[13.5px] font-semibold text-slate-600 mb-1">Select any item in the tree to edit</p>
      <p className="text-[12px] text-slate-400 mb-6 leading-relaxed">or use the + buttons to add new items.</p>
      <div className="w-full max-w-xs">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Add</p>
        <button type="button" onClick={() => setPanel({ type: 'addDept' })}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors text-[13px] font-medium justify-center">
          <Plus className="w-4 h-4" /> Department
        </button>
      </div>
    </div>
  );

  // ── Add Department ────────────────────────────────────────────────────────
  if (panel.type === 'addDept') return (
    <div>
      <p className="text-[15px] font-bold text-slate-900 mb-4">Add Department</p>
      <DeptForm key="addDept" initial={{}} existingNames={allDeptNames}
        onCancel={() => setPanel(null)}
        onSave={data => {
          const nd = { ...emptyDept(), ...data };
          upDepts(p => [...p, nd]);
          setPanel({ type: 'promptDept', deptId: nd.id });
        }} />
    </div>
  );

  // ── Prompt: after dept saved ───────────────────────────────────────────────
  if (panel.type === 'promptDept') {
    const d = getDept(panel.deptId);
    if (!d) return null;
    return (
      <div>
        <SuccessBanner msg={`${d.name} saved`} />
        <p className="text-[15px] font-bold text-slate-900 mb-1">What would you like to add to <span className="text-blue-600">{d.name}</span>?</p>
        <p className="text-[12px] text-slate-400 mb-4">You can always come back and add more later.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button type="button" onClick={() => setPanel({ type: 'addAsset', deptId: panel.deptId })}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-green-400 hover:bg-green-50 text-left transition-all group">
            <span className="text-[20px] block mb-2">🗄️</span>
            <p className="text-[13px] font-bold text-slate-800 mb-1">Own Asset</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">Systems, databases, and applications your department owns</p>
          </button>
          <button type="button" onClick={() => setPanel({ type: 'addSupplier', deptId: panel.deptId })}
            className="p-4 border-2 border-slate-200 rounded-xl hover:border-orange-400 hover:bg-orange-50 text-left transition-all">
            <span className="text-[20px] block mb-2">🤝</span>
            <p className="text-[13px] font-bold text-slate-800 mb-1">Supplier</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">Third-party vendors your department works with</p>
          </button>
        </div>
        <div className="space-y-1.5 pt-3 border-t border-slate-100">
          <button type="button" onClick={() => setPanel({ type: 'addDept' })} className="w-full text-left text-[12.5px] text-blue-600 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Add Another Department</button>
          <button type="button" onClick={onSkipToTeam} className="w-full text-left text-[12px] text-slate-400 px-3 py-2 rounded-lg hover:bg-slate-50">Skip to Team →</button>
        </div>
      </div>
    );
  }

  // ── Add Asset ─────────────────────────────────────────────────────────────
  if (panel.type === 'addAsset') {
    const d = getDept(panel.deptId);
    return (
      <div>
        <p className="text-[12px] text-slate-400 mb-1">Adding to <span className="font-semibold text-slate-700">{d?.name}</span></p>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Add Own Asset</p>
        <AssetForm key={`addAsset-${panel.deptId}`} initial={{}} existingNames={(d?.assets || []).map(a => a.name)}
          onCancel={() => setPanel({ type: 'promptDept', deptId: panel.deptId })}
          onSave={data => {
            upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, assets: [...d.assets, data] } : d));
            setPanel({ type: 'promptAsset', deptId: panel.deptId, assetId: data.id });
          }} />
      </div>
    );
  }

  // ── Prompt: after asset saved — does it have PII? ─────────────────────────
  if (panel.type === 'promptAsset') {
    const a = getAsset(panel.deptId, panel.assetId);
    return (
      <div>
        <SuccessBanner msg={`${a?.name} saved`} />
        <div className="p-5 border-2 border-slate-200 rounded-xl text-center">
          <span className="text-[32px] block mb-2">📋</span>
          <p className="text-[15px] font-bold text-slate-900 mb-2">Does this asset store or process personal data?</p>
          <p className="text-[12px] text-slate-400 mb-5 max-w-sm mx-auto leading-relaxed">Personal data includes names, emails, phone numbers, health records, financial data, or any information that identifies a person.</p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={() => setPanel({ type: 'addPII', deptId: panel.deptId, assetId: panel.assetId })}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add PII Record
            </button>
            <button type="button" onClick={() => setPanel({ type: 'promptDept', deptId: panel.deptId })}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Skip — No PII
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add PII (own asset) ───────────────────────────────────────────────────
  if (panel.type === 'addPII') {
    const a = getAsset(panel.deptId, panel.assetId);
    return (
      <div>
        <p className="text-[12px] text-slate-400 mb-1">Adding PII to <span className="font-semibold text-slate-700">{a?.name}</span></p>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Add PII Record</p>
        <PIIForm key={`addPII-${panel.assetId}`} initial={{}}
          onCancel={() => setPanel({ type: 'promptAsset', deptId: panel.deptId, assetId: panel.assetId })}
          onSave={data => {
            upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, assets: d.assets.map(a => a.id === panel.assetId ? { ...a, piiRecords: [...a.piiRecords, data] } : a) } : d));
            setPanel({ type: 'promptOwnPII', deptId: panel.deptId, assetId: panel.assetId });
          }} />
      </div>
    );
  }

  // ── Prompt: after own PII saved ───────────────────────────────────────────
  if (panel.type === 'promptOwnPII') {
    const d = getDept(panel.deptId);
    const a = getAsset(panel.deptId, panel.assetId);
    return (
      <div>
        <SuccessBanner msg="PII Record saved" />
        <p className="text-[15px] font-bold text-slate-900 mb-3">What would you like to do next?</p>
        <div className="space-y-2">
          <PromptBtn primary label="+ Add Another PII Record" onClick={() => setPanel({ type: 'addPII', deptId: panel.deptId, assetId: panel.assetId })} />
          <PromptBtn label={`+ Add Another Asset to ${d?.name}`} onClick={() => setPanel({ type: 'addAsset', deptId: panel.deptId })} />
          <PromptBtn label={`+ Add Supplier to ${d?.name}`} onClick={() => setPanel({ type: 'addSupplier', deptId: panel.deptId })} />
          <PromptBtn label="+ Add Another Department" onClick={() => setPanel({ type: 'addDept' })} />
          <button type="button" onClick={onSkipToTeam} className="w-full text-left text-[12px] text-slate-400 px-4 py-2 rounded-lg hover:bg-slate-50">Skip to Team →</button>
        </div>
      </div>
    );
  }

  // ── Add Supplier ──────────────────────────────────────────────────────────
  if (panel.type === 'addSupplier') {
    const d = getDept(panel.deptId);
    return (
      <div>
        <p className="text-[12px] text-slate-400 mb-1">Adding to <span className="font-semibold text-slate-700">{d?.name}</span></p>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Add Supplier</p>
        <SupplierForm key={`addSup-${panel.deptId}`} initial={{}}
          onCancel={() => setPanel({ type: 'promptDept', deptId: panel.deptId })}
          onSave={data => {
            upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: [...d.suppliers, data] } : d));
            setPanel({ type: 'promptSupplier', deptId: panel.deptId, suppId: data.id });
          }} />
      </div>
    );
  }

  // ── Prompt: after supplier saved ──────────────────────────────────────────
  if (panel.type === 'promptSupplier') {
    const s = getSupp(panel.deptId, panel.suppId);
    return (
      <div>
        <SuccessBanner msg={`${s?.name} saved`} />
        <div className="p-5 border-2 border-slate-200 rounded-xl text-center">
          <span className="text-[32px] block mb-2">📦</span>
          <p className="text-[15px] font-bold text-slate-900 mb-2">Add assets that <span className="text-orange-600">{s?.name}</span> manages on your behalf</p>
          <p className="text-[12px] text-slate-400 mb-5 max-w-sm mx-auto leading-relaxed">Vendor assets are systems, storage, or services the supplier operates with access to your data.</p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={() => setPanel({ type: 'addSuppAsset', deptId: panel.deptId, suppId: panel.suppId })}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-[13px] font-semibold rounded-lg hover:bg-amber-600 transition-colors">
              <Plus className="w-4 h-4" /> Add Supplier Asset
            </button>
            <button type="button" onClick={() => setPanel({ type: 'promptDept', deptId: panel.deptId })}
              className="px-4 py-2.5 border border-slate-300 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors">Skip</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add Supplier Asset ────────────────────────────────────────────────────
  if (panel.type === 'addSuppAsset') {
    const s = getSupp(panel.deptId, panel.suppId);
    return (
      <div>
        <p className="text-[12px] text-slate-400 mb-1">Vendor asset for <span className="font-semibold text-slate-700">{s?.name}</span></p>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Add Supplier Asset</p>
        <AssetForm key={`addSA-${panel.suppId}`} initial={{}} existingNames={(s?.assets || []).map(a => a.name)}
          onCancel={() => setPanel({ type: 'promptSupplier', deptId: panel.deptId, suppId: panel.suppId })}
          onSave={data => {
            upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: d.suppliers.map(s => s.id === panel.suppId ? { ...s, assets: [...s.assets, data] } : s) } : d));
            setPanel({ type: 'promptSuppAsset', deptId: panel.deptId, suppId: panel.suppId, suppAssetId: data.id });
          }} />
      </div>
    );
  }

  // ── Prompt: after supplier asset saved — PII? ─────────────────────────────
  if (panel.type === 'promptSuppAsset') {
    const sa = getSA(panel.deptId, panel.suppId, panel.suppAssetId);
    return (
      <div>
        <SuccessBanner msg={`${sa?.name} saved`} />
        <div className="p-5 border-2 border-slate-200 rounded-xl text-center">
          <span className="text-[32px] block mb-2">📋</span>
          <p className="text-[15px] font-bold text-slate-900 mb-2">Does <span className="text-amber-600">{sa?.name}</span> store or process personal data?</p>
          <div className="flex gap-3 justify-center mt-4">
            <button type="button" onClick={() => setPanel({ type: 'addSuppPII', deptId: panel.deptId, suppId: panel.suppId, suppAssetId: panel.suppAssetId })}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Add PII Record
            </button>
            <button type="button" onClick={() => setPanel({ type: 'promptDept', deptId: panel.deptId })}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-600 text-[13px] rounded-lg hover:bg-slate-50 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Skip — No PII
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Add Supplier PII ──────────────────────────────────────────────────────
  if (panel.type === 'addSuppPII') {
    const sa = getSA(panel.deptId, panel.suppId, panel.suppAssetId);
    return (
      <div>
        <p className="text-[12px] text-slate-400 mb-1">Adding PII to <span className="font-semibold text-slate-700">{sa?.name}</span></p>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Add PII Record</p>
        <PIIForm key={`addSuppPII-${panel.suppAssetId}`} initial={{}}
          onCancel={() => setPanel({ type: 'promptSuppAsset', deptId: panel.deptId, suppId: panel.suppId, suppAssetId: panel.suppAssetId })}
          onSave={data => {
            upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: d.suppliers.map(s => s.id === panel.suppId ? { ...s, assets: s.assets.map(a => a.id === panel.suppAssetId ? { ...a, piiRecords: [...a.piiRecords, data] } : a) } : s) } : d));
            setPanel({ type: 'promptSuppPII', deptId: panel.deptId, suppId: panel.suppId, suppAssetId: panel.suppAssetId });
          }} />
      </div>
    );
  }

  // ── Prompt: after supplier PII saved ─────────────────────────────────────
  if (panel.type === 'promptSuppPII') {
    const d = getDept(panel.deptId);
    return (
      <div>
        <SuccessBanner msg="PII Record saved" />
        <p className="text-[15px] font-bold text-slate-900 mb-3">What would you like to do next?</p>
        <div className="space-y-2">
          <PromptBtn primary label="+ Add Another PII Record" onClick={() => setPanel({ type: 'addSuppPII', deptId: panel.deptId, suppId: panel.suppId, suppAssetId: panel.suppAssetId })} />
          <PromptBtn label={`+ Add Another Supplier Asset`} onClick={() => setPanel({ type: 'addSuppAsset', deptId: panel.deptId, suppId: panel.suppId })} />
          <PromptBtn label={`+ Back to ${d?.name}`} onClick={() => setPanel({ type: 'promptDept', deptId: panel.deptId })} />
          <PromptBtn label="+ Add Another Department" onClick={() => setPanel({ type: 'addDept' })} />
          <button type="button" onClick={onSkipToTeam} className="w-full text-left text-[12px] text-slate-400 px-4 py-2 rounded-lg hover:bg-slate-50">Skip to Team →</button>
        </div>
      </div>
    );
  }

  // ── Edit forms ────────────────────────────────────────────────────────────
  if (panel.type === 'editDept') {
    const d = getDept(panel.deptId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit Department</p>
        <DeptForm key={`ed-${panel.deptId}`} initial={d || {}} existingNames={allDeptNames}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, ...data } : d)); setPanel(null); }} />
      </div>
    );
  }
  if (panel.type === 'editAsset') {
    const d = getDept(panel.deptId); const a = getAsset(panel.deptId, panel.assetId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit Own Asset</p>
        <AssetForm key={`ea-${panel.assetId}`} initial={a || {}} existingNames={(d?.assets || []).filter(x => x.id !== panel.assetId).map(x => x.name)}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, assets: d.assets.map(a => a.id === panel.assetId ? { ...a, ...data } : a) } : d)); setPanel(null); }} />
      </div>
    );
  }
  if (panel.type === 'editPII') {
    const pii = getPII(panel.deptId, panel.assetId, panel.piiId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit PII Record</p>
        <PIIForm key={`ep-${panel.piiId}`} initial={pii || {}}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, assets: d.assets.map(a => a.id === panel.assetId ? { ...a, piiRecords: a.piiRecords.map(pi => pi.id === panel.piiId ? { ...pi, ...data } : pi) } : a) } : d)); setPanel(null); }} />
      </div>
    );
  }
  if (panel.type === 'editSupplier') {
    const s = getSupp(panel.deptId, panel.suppId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit Supplier</p>
        <SupplierForm key={`es-${panel.suppId}`} initial={s || {}}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: d.suppliers.map(s => s.id === panel.suppId ? { ...s, ...data } : s) } : d)); setPanel(null); }} />
      </div>
    );
  }
  if (panel.type === 'editSuppAsset') {
    const s = getSupp(panel.deptId, panel.suppId); const sa = getSA(panel.deptId, panel.suppId, panel.suppAssetId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit Vendor Asset</p>
        <AssetForm key={`esa-${panel.suppAssetId}`} initial={sa || {}} existingNames={(s?.assets || []).filter(x => x.id !== panel.suppAssetId).map(x => x.name)}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: d.suppliers.map(s => s.id === panel.suppId ? { ...s, assets: s.assets.map(a => a.id === panel.suppAssetId ? { ...a, ...data } : a) } : s) } : d)); setPanel(null); }} />
      </div>
    );
  }
  if (panel.type === 'editSuppPII') {
    const pii = getSuppPII(panel.deptId, panel.suppId, panel.suppAssetId, panel.piiId);
    return (
      <div>
        <p className="text-[15px] font-bold text-slate-900 mb-4">Edit PII Record</p>
        <PIIForm key={`esp-${panel.piiId}`} initial={pii || {}}
          onCancel={() => setPanel(null)}
          onSave={data => { upDepts(p => p.map(d => d.id === panel.deptId ? { ...d, suppliers: d.suppliers.map(s => s.id === panel.suppId ? { ...s, assets: s.assets.map(a => a.id === panel.suppAssetId ? { ...a, piiRecords: a.piiRecords.map(pi => pi.id === panel.piiId ? { ...pi, ...data } : pi) } : a) } : s) } : d)); setPanel(null); }} />
      </div>
    );
  }

  return null;
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export interface OrgStructureStepProps {
  orgName: string;
  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;
  onSkipToTeam: () => void;
}

export function OrgStructureStep({ orgName, departments, setDepartments, onSkipToTeam }: OrgStructureStepProps) {
  const [panel, setPanel] = useState<PanelState>(departments.length === 0 ? { type: 'addDept' } : null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const totalAssets    = departments.reduce((s, d) => s + d.assets.length, 0);
  const totalSuppliers = departments.reduce((s, d) => s + d.suppliers.length, 0);
  const totalSuppAssets= departments.reduce((s, d) => s + d.suppliers.reduce((ss, sup) => ss + sup.assets.length, 0), 0);
  const totalPII       = departments.reduce((s, d) => s + d.assets.reduce((sa, a) => sa + a.piiRecords.length, 0) + d.suppliers.reduce((ss, sup) => ss + sup.assets.reduce((sa, a) => sa + a.piiRecords.length, 0), 0), 0);
  const incompleteCount= departments.reduce((s, d) => s + d.assets.filter(a => a.piiRecords.length === 0).length + d.suppliers.reduce((ss, sup) => ss + sup.assets.filter(a => a.piiRecords.length === 0).length, 0), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Two-panel content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tree panel (40%) */}
        <div className="w-[40%] flex-shrink-0 border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
            <p className="text-[10.5px] font-bold text-slate-500 uppercase tracking-widest">{orgName || 'Organization'}</p>
            <span className="text-[10px] text-slate-400">✏ edit · hover to delete</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <EnhancedTree
              departments={departments}
              setDepartments={setDepartments}
              panel={panel}
              setPanel={setPanel}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
            />
          </div>
          {/* Pinned add dept button */}
          <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-white">
            <button type="button" onClick={() => setPanel({ type: 'addDept' })}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-[12.5px] font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Department
            </button>
          </div>
        </div>

        {/* Form panel (60%) */}
        <div className="flex-1 overflow-y-auto p-5">
          <FormPanel
            panel={panel}
            setPanel={setPanel}
            departments={departments}
            setDepartments={setDepartments}
            onSkipToTeam={onSkipToTeam}
          />
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-5 py-2.5 flex items-center gap-4 flex-wrap">
        {[
          { v: departments.length, l: 'Departments',  c: '#4F46E5' },
          { v: totalAssets,        l: 'Own Assets',   c: '#16A34A' },
          { v: totalSuppliers,     l: 'Suppliers',    c: '#EA580C' },
          { v: totalSuppAssets,    l: 'Vendor Assets',c: '#D97706' },
          { v: totalPII,           l: 'PII Records',  c: '#DC2626' },
        ].map(s => (
          <span key={s.l} className="text-[11.5px]" style={{ color: s.c }}>
            <span className="font-bold">{s.v}</span>{' '}
            <span className="text-slate-500 font-normal">{s.l}</span>
          </span>
        ))}
        {incompleteCount > 0 && (
          <span className="flex items-center gap-1 text-[11.5px] text-orange-600 font-semibold ml-auto">
            <AlertTriangle className="w-3.5 h-3.5" /> {incompleteCount} Asset{incompleteCount !== 1 ? 's' : ''} incomplete
          </span>
        )}
      </div>
    </div>
  );
}
