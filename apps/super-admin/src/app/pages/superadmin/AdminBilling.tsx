import React, { useState } from 'react';
import { CreditCard, TrendingUp, Building2, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PLAN_DIST = [
  { plan: 'Starter', count: 14, price: 15000, color: '#F59E0B' },
  { plan: 'Professional', count: 21, price: 45000, color: '#3B82F6' },
  { plan: 'Enterprise', count: 13, price: 120000, color: '#8B5CF6' },
];

const MRR_DATA = [
  { month: 'Nov', mrr: 28.4 }, { month: 'Dec', mrr: 31.2 }, { month: 'Jan', mrr: 34.8 },
  { month: 'Feb', mrr: 37.1 }, { month: 'Mar', mrr: 40.5 }, { month: 'Apr', mrr: 43.2 },
];

const ORG_BILLING = [
  { org: 'TechNova Solutions', plan: 'Enterprise', mrr: '₹1,20,000', status: 'Paid', next: 'Jun 1, 2025' },
  { org: 'Infosys BPO Ltd', plan: 'Enterprise', mrr: '₹1,20,000', status: 'Paid', next: 'Jun 1, 2025' },
  { org: 'RazorPay Pvt Ltd', plan: 'Professional', mrr: '₹45,000', status: 'Paid', next: 'May 15, 2025' },
  { org: 'HDFC Bank Ltd', plan: 'Enterprise', mrr: '₹1,20,000', status: 'Paid', next: 'Jul 1, 2025' },
  { org: 'Zomato Ltd', plan: 'Professional', mrr: '₹45,000', status: 'Paid', next: 'May 20, 2025' },
  { org: 'Byju\'s Learning', plan: 'Professional', mrr: '₹45,000', status: 'Overdue', next: 'Apr 1, 2025' },
  { org: 'GlobalEdge IT', plan: 'Starter', mrr: '₹15,000', status: 'Paid', next: 'Jun 10, 2025' },
];

const totalMRR = PLAN_DIST.reduce((s, p) => s + p.count * p.price, 0);

export function AdminBillingPage() {
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[24px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Billing</h1>
        <p className="text-[14px] text-slate-400 mt-0.5">Platform-wide billing overview · All amounts in INR</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Monthly Recurring Revenue', value: `₹${(totalMRR / 100000).toFixed(1)}L`, sub: '+7.1% MoM', color: '#10B981' },
          { label: 'Annual Run Rate', value: `₹${(totalMRR * 12 / 1000000).toFixed(1)}Cr`, sub: 'Projected', color: '#3B82F6' },
          { label: 'Total Paying Orgs', value: '47', sub: '1 overdue', color: '#8B5CF6' },
          { label: 'Avg Revenue / Org', value: `₹${Math.round(totalMRR / 48).toLocaleString()}`, sub: 'Per month', color: '#F97316' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200">
            <div className="h-0.5 w-full" style={{ background: s.color }} />
            <div className="p-4">
              <p className="text-[12.5px] text-slate-400 uppercase tracking-wide font-semibold mb-1.5">{s.label}</p>
              <p className="text-[28px] font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <div className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-500" /><span className="text-[12.5px] text-slate-400">{s.sub}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* MRR Chart + Plan Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3">MRR Trend (₹ Lakhs)</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MRR_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: any) => [`₹${v}L`, 'MRR']} />
              <Bar dataKey="mrr" fill="#EF4444" radius={[3, 3, 0, 0]} name="MRR" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
          <p className="text-[15px] font-semibold text-slate-800 mb-3">Revenue by Plan</p>
          <div className="space-y-3">
            {PLAN_DIST.map(p => (
              <div key={p.plan}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-[14.5px] font-medium text-slate-800">{p.plan}</span>
                    <span className="text-[12.5px] text-slate-400">{p.count} orgs</span>
                  </div>
                  <span className="text-[14.5px] font-semibold text-slate-800">₹{(p.count * p.price / 100000).toFixed(1)}L</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(p.count * p.price / totalMRR) * 100}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Org Billing Table */}
      <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[15px] font-semibold text-slate-800">Organization Billing</p>
          <span className="text-[13px] text-slate-700 font-medium bg-red-50 px-2 py-0.5 rounded">1 overdue</span>
        </div>
        <table className="w-full text-[14px]">
          <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
            {['Organization', 'Plan', 'MRR', 'Status', 'Next Invoice', 'Actions'].map(h => <th key={h} className="px-4 py-2.5 text-[12.5px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>)}
          </tr></thead>
          <tbody>
            {ORG_BILLING.map((o, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{o.org}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[12.5px] font-medium ${o.plan === 'Enterprise' ? 'bg-violet-50 text-violet-700' : o.plan === 'Professional' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{o.plan}</span></td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{o.mrr}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-[12.5px] font-medium ${o.status === 'Paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-slate-800'}`}>{o.status}</span></td>
                <td className={`px-4 py-2.5 ${o.status === 'Overdue' ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>{o.next}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 text-[12.5px] border border-[#64748B]/20 rounded hover:bg-slate-50 text-slate-600">View</button>
                    {o.status === 'Overdue' && <button className="px-2 py-1 text-[12.5px] border border-[#64748B]/20 rounded hover:bg-slate-50 text-slate-700">Send Reminder</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


