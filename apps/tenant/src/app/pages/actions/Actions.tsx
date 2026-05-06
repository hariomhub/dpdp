import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, PriorityChip, MonoBadge, DataTable, TR, TD, PageHeader, Btn, SearchInput } from '../../components/shared/DesignSystem';
import { ACTIONS } from '../../data/mockData';

const ALL_STATUSES = ['All', 'Pending', 'In Progress', 'Evidence Submitted', 'Under Review', 'Approved (Internal)', 'Final Review', 'Rejected', 'Overdue'];

export function ActionsPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const isCO = role === 'co';

  const rejected = ACTIONS.filter(a => a.status === 'Rejected');

  const filtered = ACTIONS.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = activeTab === 'All' || a.status === activeTab;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <PageHeader
        title="Actions"
        sub={`${ACTIONS.length} total actions`}
        actions={isCO ? (
          <Btn onClick={() => navigate('/org/actions/new')} icon={<Plus className="w-3.5 h-3.5" />}>Create Action</Btn>
        ) : undefined}
      />

      {/* Rejected alert for CO */}
      {isCO && rejected.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-[12.5px] font-semibold text-red-700">Requires Your Decision ({rejected.length} action{rejected.length > 1 ? 's' : ''} rejected)</span>
          </div>
          {rejected.map(r => (
            <div key={r.id} className="flex items-center justify-between p-2.5 bg-white border border-red-200 rounded mt-1.5">
              <span className="text-[12.5px] text-slate-800">{r.title}</span>
              <Btn size="sm" variant="danger" onClick={() => navigate(`/org/actions/${r.id}`)}>Review Decision</Btn>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SearchInput placeholder="Search actions..." value={search} onChange={setSearch} />
        <select className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option>All Assessments</option>
          <option>Q1 2025 DPDP Compliance Assessment</option>
          <option>AWS Infrastructure Audit 2025</option>
        </select>
        <select className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option>All Assets</option>
          <option>Customer Database</option>
          <option>AWS Cloud Infrastructure</option>
        </select>
        <select className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option>All Priorities</option>
          <option>Critical</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto mb-3">
        <div className="flex border-b border-slate-200 min-w-max">
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setActiveTab(s)}
              className={`px-3.5 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors
                ${activeTab === s ? 'text-blue-600 border-blue-600' : 'text-slate-500 border-transparent hover:text-slate-800'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <DataTable headers={['Title', 'Asset', 'Assessment', 'Priority', 'Assignee', 'Due Date', 'Status', 'Updated', '']}>
          {filtered.map(action => (
            <TR key={action.id} onClick={() => navigate(`/org/actions/${action.id}`)}>
              <TD>
                <div>
                  <p className="text-[12.5px] font-medium text-slate-800">{action.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{action.controlName}</p>
                </div>
              </TD>
              <TD>
                <span className="text-[12px] text-slate-500">{action.assetName}</span>
              </TD>
              <TD>
                <span className="text-[11px] text-slate-400 max-w-[120px] truncate block">Q1 2025 Assessment</span>
              </TD>
              <TD><PriorityChip priority={action.priority} /></TD>
              <TD>
                <span className="text-[12px] text-slate-600">{action.assignee}</span>
              </TD>
              <TD>
                <p className="text-[12px] text-slate-700">{action.dueDate}</p>
              </TD>
              <TD><StatusChip status={action.status} /></TD>
              <TD><span className="text-[11px] text-slate-400">2 days ago</span></TD>
              <TD>
                <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); navigate(`/org/actions/${action.id}`); }}>View</Btn>
              </TD>
            </TR>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
