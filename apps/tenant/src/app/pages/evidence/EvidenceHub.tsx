import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Image, Link2, Code, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip, MonoBadge, DataTable, TR, TD, PageHeader, SearchInput } from '../../components/shared/DesignSystem';
import { EVIDENCE } from '../../data/mockData';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'File': <FileText className="w-4 h-4" />,
  'Screenshot': <Image className="w-4 h-4" />,
  'Link': <Link2 className="w-4 h-4" />,
  'Config': <Code className="w-4 h-4" />,
  'Log': <Clock className="w-4 h-4" />,
};

export function EvidenceHubPage() {
  const navigate = useNavigate();
  const { role } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const isEA = role === 'external_auditor';
  const filtered = EVIDENCE.filter(ev => {
    const matchSearch = ev.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || ev.status === statusFilter;
    const matchRole = !isEA || ['Approved (Internal)', 'Compliant'].includes(ev.status);
    return matchSearch && matchStatus && matchRole;
  });

  return (
    <div>
      <PageHeader
        title="Evidence Hub"
        sub="Central repository of all compliance evidence across all actions and assessments"
      />

      {isEA && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-[12px] text-amber-700">👁 As External Auditor, you can only view evidence that has been approved by the Internal Auditor.</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <SearchInput placeholder="Search evidence..." value={search} onChange={setSearch} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option value="All">All Statuses</option>
          <option>Evidence Submitted</option>
          <option>Under Review</option>
          <option>Approved (Internal)</option>
          <option>Non-Compliant</option>
        </select>
        <select className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option>All Assets</option>
          <option>Customer Database</option>
          <option>AWS Cloud Infrastructure</option>
        </select>
        <select className="h-8 px-2.5 rounded-md bg-white border border-slate-300 text-slate-700 text-[12px] focus:outline-none focus:border-blue-500">
          <option>All Types</option>
          <option>File</option>
          <option>Screenshot</option>
          <option>Link</option>
          <option>Config</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <DataTable headers={['Evidence Title', 'Asset', 'Action', 'Control', 'Type', 'Submitted By', 'Date', 'Version', 'Status', 'Auditor']}>
          {filtered.map(ev => (
            <TR key={ev.id} onClick={() => navigate(`/org/actions/${ev.action}`)}>
              <TD>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{TYPE_ICONS[ev.type] || <FileText className="w-4 h-4" />}</span>
                  <span className="text-[13px] font-medium text-slate-800">{ev.title}</span>
                </div>
              </TD>
              <TD><span className="text-[12px] text-slate-600">{ev.assetName}</span></TD>
              <TD><span className="text-[11px] text-slate-400 max-w-[140px] truncate block">{ev.actionTitle}</span></TD>
              <TD><MonoBadge>{ev.control}</MonoBadge></TD>
              <TD><span className="text-[12px] text-slate-500">{ev.type}</span></TD>
              <TD><span className="text-[12px] text-slate-600">{ev.submittedBy}</span></TD>
              <TD><span className="text-[11px] text-slate-400">{ev.submittedDate}</span></TD>
              <TD>
                <button className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700" onClick={e => e.stopPropagation()}>
                  <MonoBadge>{ev.version}</MonoBadge>
                </button>
              </TD>
              <TD><StatusChip status={ev.status} /></TD>
              <TD><span className="text-[12px] text-slate-500">{ev.auditor || '—'}</span></TD>
            </TR>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
