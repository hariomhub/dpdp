import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Edit2, Archive, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, PageHeader, Btn, SearchInput } from '../../components/shared/DesignSystem';
import { POLICIES } from '../../data/mockData';

export function PoliciesPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const canManage = role === 'ceo' || role === 'co';

  const filtered = POLICIES.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Policies"
        sub={`${POLICIES.length} policies total`}
        actions={canManage ? (
          <Btn onClick={() => navigate('/org/policies/new')} icon={<Plus className="w-4 h-4" />}>Create Policy</Btn>
        ) : undefined}
      />

      <div className="flex items-center gap-3 mb-3">
        <SearchInput placeholder="Search policies..." value={search} onChange={setSearch} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[14px] focus:outline-none focus:border-[#1A3E5C]">
          <option value="All">All Statuses</option>
          <option>Active</option>
          <option>Draft</option>
          <option>Retired</option>
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map(policy => (
          <div key={policy.id}
            className={`bg-white border rounded-lg p-4 hover:shadow-sm cursor-pointer transition-all relative overflow-hidden
              ${policy.status === 'Retired' ? 'border-[#D4AF37]/35 opacity-60' : 'border-[#D4AF37]/35 hover:border-slate-300'}`}
            onClick={() => navigate(`/org/policies/${policy.id}`)}>

            {/* Retired stamp */}
            {policy.status === 'Retired' && (
              <div className="absolute top-3 right-12 rotate-[-15deg] border-2 border-slate-300 px-2 py-0.5 rounded">
                <span className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Retired</span>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-[15px] font-semibold text-slate-900">{policy.name}</h3>
                  <StatusChip status={policy.status} />
                  <span className="font-mono text-[13px] px-1.5 py-0.5 bg-slate-100 border border-[#D4AF37]/35 text-slate-500 rounded">{policy.version}</span>
                </div>
                <p className="text-[14px] text-slate-500 line-clamp-1 mb-2">{policy.description}</p>
                <div className="flex items-center gap-4 text-[13px] text-slate-400 flex-wrap">
                  <span>Owner: <span className="text-slate-600">{policy.owner}</span></span>
                  {policy.effectiveDate && <span>Effective: {policy.effectiveDate}</span>}
                  <span>{policy.linkedControls} controls linked</span>
                  <span>{policy.linkedAssets} assets linked</span>
                  <span>Updated: {policy.lastUpdated}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 ml-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="View">
                  <Eye className="w-4 h-4" />
                </button>
                {canManage && policy.status !== 'Retired' && (
                  <>
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
