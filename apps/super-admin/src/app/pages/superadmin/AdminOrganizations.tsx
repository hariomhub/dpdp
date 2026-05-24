import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus, ArrowLeft, CheckCircle2, Mail, Search, Eye, Headphones,
  Ban, Building2, Users, Shield, ClipboardList, Activity, Clock,
  CreditCard, Download, Database, ChevronRight, ChevronDown,
  Package, AlertTriangle, X, Loader2
} from 'lucide-react'
import {
  useOrganizations,
  useOrganization,
  useCreateOrganization,
  useSuspendOrganization,
  useActivateOrganization,
  useResendInvite,
} from '../../../hooks/useOrganizations'


const INDUSTRIES = ['Technology', 'Healthcare', 'Finance & Banking', 'E-commerce', 'Manufacturing', 'Government', 'Education', 'Telecommunications', 'Media & Entertainment', 'Other'];
const PLANS = ['Starter', 'Professional', 'Enterprise'];
const STATUSES = ['All', 'Active', 'Onboarding', 'Inactive', 'Suspended'];

const ORGS = [
  { id: 'ORG-001', name: 'TechNova Solutions Pvt. Ltd.', industry: 'Technology', plan: 'Enterprise', status: 'Active', users: 48, assessments: 12, lastActive: '2 hrs ago', onboardedDate: '2024-03-12', ceo: 'Amit Rao', compliance: 74 },
  { id: 'ORG-002', name: 'Infosys BPO Ltd', industry: 'Technology', plan: 'Enterprise', status: 'Active', users: 210, assessments: 28, lastActive: '14 min ago', onboardedDate: '2023-11-05', ceo: 'Nandan Reddy', compliance: 88 },
  { id: 'ORG-003', name: 'RazorPay Pvt Ltd', industry: 'Finance & Banking', plan: 'Professional', status: 'Active', users: 76, assessments: 9, lastActive: '1 hr ago', onboardedDate: '2024-01-20', ceo: 'Harshil Mathur', compliance: 61 },
  { id: 'ORG-004', name: 'HDFC Bank Ltd', industry: 'Finance & Banking', plan: 'Enterprise', status: 'Active', users: 340, assessments: 42, lastActive: '7 hrs ago', onboardedDate: '2023-09-14', ceo: 'Sashidhar Jagdishan', compliance: 91 },
  { id: 'ORG-005', name: 'Zomato Ltd', industry: 'E-commerce', plan: 'Professional', status: 'Active', users: 95, assessments: 11, lastActive: '3 hrs ago', onboardedDate: '2024-02-08', ceo: 'Deepinder Goyal', compliance: 55 },
  { id: 'ORG-006', name: 'GlobalEdge IT Solutions', industry: 'Technology', plan: 'Starter', status: 'Inactive', users: 12, assessments: 2, lastActive: '45 days ago', onboardedDate: '2024-06-15', ceo: 'Ramesh Iyer', compliance: 23 },
  { id: 'ORG-007', name: "Byju's Learning", industry: 'Education', plan: 'Professional', status: 'Suspended', users: 140, assessments: 6, lastActive: '12 days ago', onboardedDate: '2024-04-01', ceo: 'Byju Raveendran', compliance: 42 },
  { id: 'ORG-008', name: 'MediCare Health Systems', industry: 'Healthcare', plan: 'Enterprise', status: 'Onboarding', users: 0, assessments: 0, lastActive: 'Never', onboardedDate: '2025-04-22', ceo: 'Dr. Sunita Rao', compliance: 0 },
  { id: 'ORG-009', name: 'PhonePe Pvt Ltd', industry: 'Finance & Banking', plan: 'Enterprise', status: 'Active', users: 187, assessments: 19, lastActive: '5 hrs ago', onboardedDate: '2023-12-10', ceo: 'Sameer Nigam', compliance: 74 },
  { id: 'ORG-010', name: 'UrbanCart Commerce', industry: 'E-commerce', plan: 'Starter', status: 'Inactive', users: 8, assessments: 1, lastActive: '31 days ago', onboardedDate: '2024-08-20', ceo: 'Kiran Rao', compliance: 15 },
];

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-green-50 text-green-700',
  Onboarding: 'bg-blue-50 text-blue-700',
  Inactive: 'bg-slate-100 text-slate-500',
  Suspended: 'bg-red-50 text-red-700',
  ACTIVE: 'bg-green-50 text-green-700',
  ONBOARDING: 'bg-blue-50 text-blue-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  SUSPENDED: 'bg-red-50 text-red-700',
};

const ROLE_COLORS: Record<string, string> = {
  CEO: '#8B5CF6', CO: '#3B82F6', 'IT Admin': '#F97316',
  'Internal Auditor': '#06B6D4', 'External Auditor': '#EAB308',
};

const ORG_TABS = ['Org Details', 'Organization Structure', 'Team Members', 'Assessments', 'Billing', 'Activity Log'];

//  Mock dept tree data 
const DEPT_TREE = [
  {
    id: 'd1', name: 'Engineering', owner: 'Manish Kumar', itAdmin: 'Manish Kumar', ia: 'Rahul Mehta',
    assets: [
      { id: 'a1', name: 'Customer Database', type: 'Database', criticality: 'Critical', pii: ['Name', 'Email', 'Financial'] },
      { id: 'a2', name: 'AWS Cloud Infrastructure', type: 'Cloud Infrastructure', criticality: 'High', pii: ['Config data'] },
    ],
    suppliers: [{ id: 's1', name: 'Amazon Web Services', type: 'Cloud Provider', dpa: true, assets: [{ id: 'va1', name: 'AWS RDS', type: 'Database' }] }],
  },
  {
    id: 'd2', name: 'Finance', owner: 'Kavya Reddy', itAdmin: 'Kavya Reddy', ia: 'Rahul Mehta',
    assets: [{ id: 'a3', name: 'Payment Gateway', type: 'Data Flow', criticality: 'Critical', pii: ['Financial', 'Government ID'] }],
    suppliers: [],
  },
  {
    id: 'd3', name: 'HR', owner: 'Suresh Patel', itAdmin: 'Suresh Patel', ia: 'Rahul Mehta',
    assets: [{ id: 'a4', name: 'HR Management System', type: 'System/App', criticality: 'High', pii: ['Name', 'Address', 'Government ID'] }],
    suppliers: [],
  },
];

function OrgStructureTab() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['d1']));
  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400 mb-3">Read-only view of the organization's department and asset structure as built during onboarding.</p>
      {DEPT_TREE.map(dept => {
        const isOpen = expanded.has(dept.id);
        return (
          <div key={dept.id} className="border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => toggle(dept.id)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
              {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
              <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[12.5px] font-bold text-slate-800">{dept.name}</p>
                <p className="text-[10.5px] text-slate-400">IT Admin: {dept.itAdmin} · IA: {dept.ia}</p>
              </div>
              <span className="text-[10.5px] text-slate-400">{dept.assets.length} assets · {dept.suppliers.length} suppliers</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                {dept.assets.map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 p-2.5 bg-white border border-slate-100 rounded-lg">
                    <Database className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-slate-700">{asset.name}</p>
                      <p className="text-[10.5px] text-slate-400">{asset.type} · {asset.criticality}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {asset.pii.map(p => <span key={p} className="text-[9.5px] px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">{p}</span>)}
                    </div>
                  </div>
                ))}
                {dept.suppliers.map(sup => (
                  <div key={sup.id}>
                    <div className="flex items-center gap-3 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                      <Package className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[12px] font-semibold text-amber-800">{sup.name}</p>
                        <p className="text-[10.5px] text-amber-600">{sup.type} · DPA: {sup.dpa ? '✓ Signed' : '✗ Not Signed'}</p>
                      </div>
                    </div>
                    {sup.assets.map(va => (
                      <div key={va.id} className="flex items-center gap-3 p-2 ml-6 bg-white border border-slate-100 rounded-lg mt-1">
                        <Database className="w-3 h-3 text-slate-300 flex-shrink-0" />
                        <p className="text-[11.5px] text-slate-600">{va.name} <span className="text-slate-400">({va.type})</span></p>
                      </div>
                    ))}
                  </div>
                ))}
                {dept.assets.length === 0 && dept.suppliers.length === 0 && (
                  <p className="text-[11.5px] text-slate-400 italic text-center py-2">No assets or suppliers added yet.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrgDetailPage({ orgId, onBack }: { orgId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('Org Details');
  const { data: org, isLoading } = useOrganization(orgId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-[13px]">Loading organization details...</span>
    </div>;
  }

  if (!org) {
    return <div className="p-8 text-center text-red-500">Organization not found</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Organizations
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-[13px] font-semibold text-slate-800">{org.name}</span>
        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${STATUS_COLORS[org.status] || 'bg-slate-100 text-slate-600'}`}>{org.status}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{org.name}</h2>
              <p className="text-[12px] text-slate-400">{org.industry} · <span className={`font-medium ${org.plan === 'ENTERPRISE' ? 'text-violet-600' : org.plan === 'PROFESSIONAL' ? 'text-blue-600' : 'text-amber-600'}`}>{org.plan}</span> · CEO: {org.ceoName} · Onboarded {new Date(org.onboardedAt || org.createdAt).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Headphones className="w-3.5 h-3.5" /> Support Access
            </button>
            {org.status !== 'SUSPENDED' ? (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">
                <Ban className="w-3.5 h-3.5" /> Suspend Org
              </button>
            ) : (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-0 overflow-x-auto">
        {ORG_TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab 1: Org Details */}
      {activeTab === 'Org Details' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">Basic Information</p>
            <div className="grid grid-cols-3 gap-4 text-[12.5px]">
              {[
                ['Organization Name', org.name], ['Industry', org.industry], ['Plan', org.plan],
                ['Country', org.country || 'India'], ['Org Size', 'N/A'], ['Primary Email', org.ceoEmail],
                ['Tenant Code', org.tenantCode], ['PAN', 'N/A'], ['GST', 'N/A'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-slate-800 font-medium">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">DPO Details</p>
            <div className="grid grid-cols-3 gap-4 text-[12.5px]">
              {[['DPO Name', 'N/A'], ['DPO Email', 'N/A'], ['DPO Phone', 'N/A']].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{k}</p>
                  <p className="text-slate-800 font-medium">{v}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">DPDP Classification</p>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <p className="text-[13px] font-bold text-blue-800">Data Fiduciary</p>
                  <span className="ml-auto px-2 py-0.5 bg-green-50 text-green-700 text-[10.5px] rounded font-semibold">Active Classification</span>
                </div>
                <p className="text-[11.5px] text-blue-600">Standard obligations under DPDP Act. Subject to Chapters 2, 3, and provisions of Chapter 4.</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600">
                <p className="font-semibold text-slate-700 mb-1.5">Active Regulations</p>
                {['DPDP Act 2023', 'RBI Data Localisation'].map(r => <p key={r} className="flex items-center gap-1.5 mb-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{r}</p>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Organization Structure */}
      {activeTab === 'Organization Structure' && <OrgStructureTab />}

      {/* Tab 3: Team Members */}
      {activeTab === 'Team Members' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-[12px] text-slate-400">Read-only · {5} members</p>
          </div>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Name', 'Role', 'Department(s)', 'Email', 'Source', 'Status', 'Last Login'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                { name: 'Amit Rao', role: 'CEO', depts: [], email: 'amit@technova.in', source: 'Manual', status: 'Active', login: '2 hrs ago' },
                { name: 'Priya Sharma', role: 'CO', depts: [], email: 'priya@technova.in', source: 'Entra ID', status: 'Active', login: '1 hr ago' },
                { name: 'Manish Kumar', role: 'IT Admin', depts: ['Engineering', 'Infrastructure'], email: 'manish@technova.in', source: 'Entra ID', status: 'Active', login: '4 hrs ago' },
                { name: 'Rahul Mehta', role: 'Internal Auditor', depts: [], email: 'rahul@technova.in', source: 'Manual', status: 'Active', login: '1 day ago' },
                { name: 'Sunita Joshi', role: 'External Auditor', depts: [], email: 'sunita@audit.in', source: 'Manual', status: 'Active', login: '3 days ago' },
              ].map((u, i) => {
                const color = ROLE_COLORS[u.role] || '#64748b';
                return (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, color }}>
                          {u.name.split(' ').map(n => n[0]).join('')}
                        </span>
                        <p className="font-semibold text-slate-800">{u.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold" style={{ background: `${color}18`, color }}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.depts.length > 0
                        ? <div className="flex flex-wrap gap-1">{u.depts.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{d}</span>)}</div>
                        : <span className="text-slate-400">Org-wide</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${u.source === 'Entra ID' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{u.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10.5px] font-medium">{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{u.login}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Assessments */}
      {activeTab === 'Assessments' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100"><p className="text-[12px] text-slate-400">Read-only · 0 assessments</p></div>
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Assessment Name', 'Regulation', 'Department', 'Status', 'Compliance %', 'Period', 'Created By', 'Last Updated'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                { name: 'Q1 2025 DPDP Assessment', reg: 'DPDP', dept: 'Engineering', status: 'Active', pct: 67, period: 'Jan–Mar 2025', by: 'Priya Sharma', updated: '2 hrs ago' },
                { name: 'AWS Infrastructure Audit', reg: 'DPDP', dept: 'Engineering', status: 'Active', pct: 70, period: 'Feb–Apr 2025', by: 'Priya Sharma', updated: '1 day ago' },
                { name: 'Consent Mechanism Review', reg: 'DPDP', dept: 'Marketing', status: 'Completed', pct: 100, period: 'Oct–Dec 2024', by: 'Priya Sharma', updated: '4 months ago' },
              ].map((a, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{a.name}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10.5px] font-semibold">{a.reg}</span></td>
                  <td className="px-4 py-3 text-slate-500">{a.dept}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-medium ${a.status === 'Active' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${a.pct}%` }} />
                      </div>
                      <span className="font-semibold text-slate-800">{a.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.period}</td>
                  <td className="px-4 py-3 text-slate-500">{a.by}</td>
                  <td className="px-4 py-3 text-slate-400">{a.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Billing */}
      {activeTab === 'Billing' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold text-slate-800">Current Plan</p>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Downgrade Plan</button>
                <button className="px-3 py-1.5 text-[12px] text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors">Upgrade Plan</button>
              </div>
            </div>
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg">
              <p className="text-[15px] font-bold text-slate-900">{org.plan} Plan</p>
              <p className="text-[11.5px] text-slate-500 mt-0.5">Renews: Jun 1, 2025 · Unlimited seats · ₹1,20,000/mo</p>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-[11.5px] font-semibold text-slate-700">Usage This Cycle</p>
              {[
                { label: 'Users', used: 0, limit: 'Unlimited', pct: 0, showBar: false },
                { label: 'Active Assessments', used: 0, limit: 'Unlimited', pct: 0, showBar: false },
                { label: 'Storage Used', used: '0 GB', limit: '50 GB', pct: 0, showBar: true },
              ].map(u => (
                <div key={u.label}>
                  <div className="flex items-center justify-between mb-1 text-[12px]">
                    <span className="text-slate-600">{u.label}</span>
                    <span className="text-slate-500">{u.used} of {u.limit}</span>
                  </div>
                  {u.showBar && (
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${u.pct}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-slate-800">Invoice History</p>
            </div>
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Invoice', 'Date', 'Amount', 'Status', ''].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {[['INV-2025-04', 'Apr 1, 2025', '₹1,20,000', 'Paid'], ['INV-2025-03', 'Mar 1, 2025', '₹1,20,000', 'Paid'], ['INV-2025-02', 'Feb 1, 2025', '₹1,20,000', 'Paid']].map(([inv, date, amt, status], i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-[10.5px] text-slate-700">{inv}</td>
                    <td className="px-4 py-2.5 text-slate-600">{date}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{amt}</td>
                    <td className="px-4 py-2.5"><span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[10.5px] font-medium">{status}</span></td>
                    <td className="px-4 py-2.5"><button className="text-[11px] text-slate-600 hover:text-slate-800 flex items-center gap-1"><Download className="w-3 h-3" /> Download</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Activity Log */}
      {activeTab === 'Activity Log' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input type="date" className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400" />
            <input type="date" className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400" />
            <select className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All Users', 'Priya Sharma', 'Manish Kumar', 'Rahul Mehta'].map(u => <option key={u}>{u}</option>)}
            </select>
            <select className="h-8 px-2 rounded-md border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-400 bg-white">
              {['All Modules', 'Assets', 'Assessments', 'Tasks', 'Users', 'Settings'].map(m => <option key={m}>{m}</option>)}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 ml-auto">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
                {['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details'].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {[
                  { ts: '2025-04-26 14:22', user: 'Priya Sharma', role: 'CO', action: 'Assessment Created', module: 'Assessments', detail: 'Q2 2025 DPDP Assessment — 42 controls, 6 assets' },
                  { ts: '2025-04-25 11:05', user: 'Manish Kumar', role: 'IT Admin', action: 'Evidence Uploaded', module: 'Tasks', detail: 'AES-256 encryption config for Customer Database' },
                  { ts: '2025-04-25 09:30', user: 'Rahul Mehta', role: 'IA', action: 'Evidence Approved', module: 'Tasks', detail: 'Data Retention Policy v2.1 — DPDP-CH2-005' },
                  { ts: '2025-04-24 16:45', user: 'Amit Rao', role: 'CEO', action: 'User Invited', module: 'Users', detail: 'Sunita Joshi — External Auditor — invite expires 48h' },
                  { ts: '2025-04-23 10:00', user: 'Priya Sharma', role: 'CO', action: 'Classification Updated', module: 'Settings', detail: 'DPDP classification changed: DF → Significant DF' },
                  { ts: '2025-04-22 08:15', user: 'Manish Kumar', role: 'IT Admin', action: 'Asset Added', module: 'Assets', detail: 'New asset: Payment Analytics Dashboard (Finance)' },
                ].map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400 font-mono text-[10.5px]">{l.ts}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{l.user}</td>
                    <td className="px-4 py-2.5 text-slate-500">{l.role}</td>
                    <td className="px-4 py-2.5 text-slate-700">{l.action}</td>
                    <td className="px-4 py-2.5"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{l.module}</span></td>
                    <td className="px-4 py-2.5 text-slate-400 max-w-[220px]"><p className="truncate">{l.detail}</p></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    orgName: '',
    industry: 'Technology',
    country: 'India',
    plan: 'PROFESSIONAL',
    ceoName: '',
    ceoEmail: '',
    tenantPortalUrl: '',
    notes: '',
  })
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const { mutate: createOrg, isPending, error, isSuccess, data } = useCreateOrganization()

  const handleSubmit = () => {
    createOrg({
      name: form.orgName,
      industry: form.industry,
      country: form.country,
      plan: form.plan,
      ceoName: form.ceoName,
      ceoEmail: form.ceoEmail,
      internalNotes: form.notes || undefined,
      tenantPortalUrl: form.tenantPortalUrl || undefined,
    })
  }

  if (isSuccess) return (
    <div className="max-w-lg mx-auto text-center py-16">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-green-50">
        <CheckCircle2 className="w-9 h-9 text-green-600" />
      </div>
      <h2 className="text-[18px] font-bold text-slate-900 mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
        Invitation Sent Successfully
      </h2>
      <p className="text-[13px] text-slate-500 mb-1">
        A setup link has been sent to <strong className="text-slate-700">{form.ceoEmail}</strong>.
      </p>
      <p className="text-[12px] text-slate-400 mb-6">
        Organization will appear as "Onboarding" until the CEO completes setup.
      </p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onBack}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          View Organizations →
        </button>
        <button
          onClick={() => {
            setStep(1)
            setForm({
              orgName: '', industry: 'Technology', country: 'India',
              plan: 'PROFESSIONAL', ceoName: '', ceoEmail: '',
              tenantPortalUrl: '', notes: '',
            })
          }}
          className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-[13px] font-medium hover:bg-slate-50 transition-colors"
        >
          Onboard Another →
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Organizations
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-[13px] font-semibold text-slate-800">Onboard New Organization</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3 mb-5">
        {[1, 2].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 text-[12px] font-medium ${step === s ? 'text-slate-900' : step > s ? 'text-green-600' : 'text-slate-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step === s ? 'bg-slate-900 text-white' : step > s ? 'bg-green-500 text-white' : 'border-2 border-slate-200 text-slate-400'}`}>
                {step > s ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
              </div>
              {s === 1 ? 'Organization Details' : 'Review & Send'}
            </div>
            {s < 2 && <div className="h-px flex-1 bg-slate-200" />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-5">
        {step === 1 ? (
          <div className="space-y-4">
            <h2 className="text-[15px] font-bold text-slate-900">Organization Details</h2>
            <p className="text-[12px] text-slate-400">
              Enter details to create a new client tenant and send invitation to the CEO.
            </p>

            {[
              { label: 'Organization Name', key: 'orgName', type: 'text', placeholder: 'e.g., Acme Corp Pvt. Ltd.' },
              { label: 'CEO Full Name', key: 'ceoName', type: 'text', placeholder: 'e.g., Rahul Sharma' },
              { label: 'CEO Email Address', key: 'ceoEmail', type: 'email', placeholder: 'ceo@company.com' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  {f.label} <span className="text-slate-300 font-normal normal-case">*</span>
                </label>
                <input
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={e => up(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all"
                />
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Industry', key: 'industry', options: INDUSTRIES },
                { label: 'Country', key: 'country', options: ['India', 'United States', 'United Kingdom', 'Singapore', 'Other'] },
                { label: 'Billing Plan', key: 'plan', options: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                    {f.label} <span className="text-slate-300 font-normal normal-case">*</span>
                  </label>
                  <select
                    value={(form as any)[f.key]}
                    onChange={e => up(f.key, e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white transition-all"
                  >
                    {f.options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Tenant Portal URL{' '}
                <span className="text-slate-400 font-normal normal-case text-[10.5px]">
                  (optional · set after deployment)
                </span>
              </label>
              <input
                type="url"
                value={form.tenantPortalUrl}
                onChange={e => up('tenantPortalUrl', e.target.value)}
                placeholder="e.g., https://compliance.technova.in"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 transition-all"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">
                The URL where this org's compliance portal is deployed on their Azure.
                CEO invitation link will point here.
              </p>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Internal Notes{' '}
                <span className="text-slate-400 font-normal normal-case text-[10.5px]">
                  (optional · not shown to org)
                </span>
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={e => up('notes', e.target.value)}
                placeholder="e.g., Referred by partner Infosys. Priority onboarding."
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-900/6 resize-none transition-all"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep(2)}
                disabled={!form.orgName || !form.ceoEmail || !form.ceoName}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 text-white text-[13px] font-semibold rounded-lg transition-all"
              >
                Next: Review and Send →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-[15px] font-bold text-slate-900">Review and Send Invitation</h2>

            {error && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-[12.5px] text-red-700">
                  {(error as Error).message || 'Failed to create organization'}
                </p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              {[
                ['Organization', form.orgName],
                ['Industry', form.industry],
                ['Country', form.country],
                ['Plan', form.plan],
                ['CEO', form.ceoName],
                ['CEO Email', form.ceoEmail],
                ...(form.tenantPortalUrl ? [['Portal URL', form.tenantPortalUrl]] : []),
                ...(form.notes ? [['Notes', form.notes]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 text-[12.5px]">
                  <span className="text-slate-400 w-28 flex-shrink-0">{k}</span>
                  <span className="text-slate-800 font-medium">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-xl">
              <Mail className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 leading-relaxed">
                An invitation email will be sent to{' '}
                <strong>{form.ceoEmail}</strong>. The link expires in{' '}
                {48} hours. If unused,
                you can resend from the organization detail page.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating organization...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send CEO Invitation →
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function AdminOrganizationsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [industry, setIndustry] = useState('All')
  const [plan, setPlan] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null)

  const queryParams: Record<string, string> = {}
  if (search) queryParams.search = search
  if (status !== 'All') queryParams.status = status.toUpperCase()
  if (industry !== 'All') queryParams.industry = industry
  if (plan !== 'All') queryParams.plan = plan.toUpperCase()

  const { data: orgsData, isLoading } = useOrganizations(queryParams)
  const { mutate: suspendOrg } = useSuspendOrganization()
  const { mutate: activateOrg } = useActivateOrganization()

  const orgs = orgsData?.data ?? []
  const total = orgsData?.meta?.total ?? 0

  if (showForm) return <OnboardForm onBack={() => setShowForm(false)} />
  if (selectedOrg) return <OrgDetailPage orgId={selectedOrg} onBack={() => setSelectedOrg(null)} />

  const PLAN_BADGE: Record<string, string> = {
    ENTERPRISE: 'bg-violet-50 text-violet-700',
    PROFESSIONAL: 'bg-blue-50 text-blue-700',
    STARTER: 'bg-amber-50 text-amber-700',
  }

  const STATUS_BADGE: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700',
    ONBOARDING: 'bg-blue-50 text-blue-700',
    INACTIVE: 'bg-slate-100 text-slate-500',
    SUSPENDED: 'bg-red-50 text-red-700',
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[20px] font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            Organizations
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {total} total ·{' '}
            {orgs.filter((o: any) => o.status === 'ACTIVE').length} active
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Onboard New Organization
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
          />
        </div>
        {[
          { label: 'Status', val: status, set: setStatus, opts: STATUSES },
          { label: 'Industry', val: industry, set: setIndustry, opts: ['All', ...INDUSTRIES] },
          { label: 'Plan', val: plan, set: setPlan, opts: ['All', ...PLANS] },
        ].map(f => (
          <select
            key={f.label}
            value={f.val}
            onChange={e => f.set(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-slate-800 bg-white transition-colors"
          >
            {f.opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="ml-auto text-[11px] text-slate-400 font-medium">
          {total} result{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-[13px]">Loading organizations...</span>
          </div>
        ) : (
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                {[
                  'Org Name', 'Industry', 'Plan', 'Status',
                  'License', 'Onboarded', 'Actions'
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-slate-400">
                    No organizations found.{' '}
                    <button
                      onClick={() => setShowForm(true)}
                      className="text-slate-600 font-medium underline"
                    >
                      Onboard one
                    </button>
                  </td>
                </tr>
              ) : (
                orgs.map((org: any) => (
                  <tr
                    key={org.id}
                    className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${org.status === 'SUSPENDED' ? 'opacity-60' : ''
                      }`}
                    onClick={() => setSelectedOrg(org.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                        {org.name}
                      </p>
                      <p className="text-[10.5px] text-slate-400 mt-0.5">
                        CEO: {org.ceoName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{org.industry}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_BADGE[org.plan] ?? 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {org.plan.charAt(0) + org.plan.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[org.status] ?? 'bg-slate-100 text-slate-500'
                          }`}
                      >
                        {org.status.charAt(0) + org.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {org.licenseKey ? (
                        <div>
                          <span
                            className={`text-[10px] font-semibold ${org.licenseKey.status === 'ACTIVE'
                                ? 'text-green-600'
                                : 'text-red-600'
                              }`}
                          >
                            {org.licenseKey.status}
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Exp:{' '}
                            {new Date(org.licenseKey.expiresAt).toLocaleDateString(
                              'en-IN'
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10.5px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedOrg(org.id)}
                          className="flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-md text-[10.5px] text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 border border-slate-200 rounded-md text-[10.5px] text-slate-600 hover:bg-slate-100 transition-colors">
                          <Headphones className="w-3 h-3" /> Support
                        </button>
                        {org.status !== 'SUSPENDED' ? (
                          <button
                            onClick={() => suspendOrg(org.id)}
                            className="flex items-center gap-1 px-2 py-1 border border-rose-200 rounded-md text-[10.5px] text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Ban className="w-3 h-3" /> Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => activateOrg(org.id)}
                            className="flex items-center gap-1 px-2 py-1 border border-green-200 rounded-md text-[10.5px] text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}