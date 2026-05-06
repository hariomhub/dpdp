import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle, CheckCircle2, Clock, ArrowRight, Search,
  User, Upload, Eye, ThumbsUp, ThumbsDown, X, FileText,
  Database, Shield, ChevronRight, Download, Edit2
} from 'lucide-react';
import { useApp, ROLE_COLORS, ROLE_LABELS } from '../../context/AppContext';

const TASKS = [
  { id: 'TSK-001', title: 'Implement AES-256 encryption for Customer DB', control: 'DPDP-CH2-006', controlName: 'Security Safeguards', asset: 'Customer Database', assetType: 'Data Asset', dept: 'Engineering', regulation: 'DPDP', assignee: 'Manish Kumar', assigneeRole: 'it_admin', priority: 'Critical', dueDate: '2025-05-15', daysLeft: 19, status: 'In Progress', updatedAt: '2 hrs ago', description: 'Enable AES-256 encryption at rest and in transit for all customer PII fields in the PostgreSQL database.', instructions: 'Coordinate with AWS RDS team to enable encryption. Test rollback plan. Update documentation.' },
  { id: 'TSK-002', title: 'Document data retention schedule', control: 'DPDP-CH2-005', controlName: 'Data Retention & Erasure', asset: 'Customer Database', assetType: 'Data Asset', dept: 'Engineering', regulation: 'DPDP', assignee: 'Manish Kumar', assigneeRole: 'it_admin', priority: 'High', dueDate: '2025-05-20', daysLeft: 24, status: 'Evidence Submitted', updatedAt: '1 day ago', description: 'Create and publish a data retention schedule for all personal data categories in Customer DB.', instructions: 'Work with legal team to define retention periods per data category.' },
  { id: 'TSK-003', title: 'Fix consent withdrawal mechanism', control: 'DPDP-CH2-002', controlName: 'Consent Management', asset: 'Customer Database', assetType: 'Data Asset', dept: 'Engineering', regulation: 'DPDP', assignee: 'Manish Kumar', assigneeRole: 'it_admin', priority: 'High', dueDate: '2025-04-30', daysLeft: 4, status: 'Pending', updatedAt: '3 days ago', description: 'Implement a user-accessible consent withdrawal feature in the customer portal.', instructions: 'Build API endpoint to revoke consent and cascade deletion.' },
  { id: 'TSK-004', title: 'Review AWS Data Processing Agreement', control: 'DPDP-CH2-007', controlName: 'Cross-Border Transfer', asset: 'AWS Cloud Infrastructure', assetType: 'Third-Party Vendor', dept: 'Engineering', regulation: 'DPDP', assignee: 'Manish Kumar', assigneeRole: 'it_admin', priority: 'Medium', dueDate: '2025-06-01', daysLeft: 36, status: 'Approved', updatedAt: '5 days ago', description: 'Review the current AWS Data Processing Agreement for DPDP compliance.', instructions: 'Coordinate with legal and AWS account team.' },
  { id: 'TSK-005', title: "Implement parental consent flow for children's data", control: 'DPDP-CH4-001', controlName: "Children's Data Protection", asset: 'Customer Database', assetType: 'Data Asset', dept: 'Engineering', regulation: 'DPDP', assignee: 'Manish Kumar', assigneeRole: 'it_admin', priority: 'Critical', dueDate: '2025-04-10', daysLeft: -16, status: 'Rejected', updatedAt: '1 week ago', description: 'Build age verification and parental consent collection for users under 18.', instructions: 'Implement age gate on signup flow. Store parental consent records.' },
  { id: 'TSK-006', title: 'Create purpose limitation documentation', control: 'DPDP-CH2-003', controlName: 'Purpose Limitation', asset: 'Payment Gateway', assetType: 'Data Flow', dept: 'Finance', regulation: 'RBI', assignee: 'Kavya Reddy', assigneeRole: 'it_admin', priority: 'High', dueDate: '2025-05-25', daysLeft: 29, status: 'Final Review', updatedAt: '2 days ago', description: 'Document all data processing purposes for payment gateway data flow.', instructions: 'Map each data element to a processing purpose.' },
  { id: 'TSK-007', title: 'Data localisation compliance check', control: 'RBI-CH1-001', controlName: 'Payment Data Storage', asset: 'Payment Gateway', assetType: 'Data Flow', dept: 'Finance', regulation: 'RBI', assignee: null, assigneeRole: null, priority: 'Critical', dueDate: '2025-05-10', daysLeft: 14, status: 'Unassigned', updatedAt: '4 days ago', description: 'Verify all payment data is stored within India as per RBI guidelines.', instructions: 'Audit all data storage locations. Document any cross-border flows.' },
  { id: 'TSK-008', title: 'Implement right to access endpoint', control: 'DPDP-CH3-001', controlName: 'Right to Access', asset: 'CRM Portal', assetType: 'System / App', dept: 'Sales', regulation: 'DPDP', assignee: 'Kavya Reddy', assigneeRole: 'it_admin', priority: 'Medium', dueDate: '2025-04-15', daysLeft: -11, status: 'Overdue', updatedAt: '10 days ago', description: 'Implement API endpoint allowing data principals to access their personal data.', instructions: 'Build read-only data export API. Include all personal data fields.' },
];

const PRIORITY_COLORS: Record<string, string> = { Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
const STATUS_CHIPS: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#1A1200', text: '#F59E0B' },
  'In Progress': { bg: '#052A3D', text: '#38BDF8' },
  'Evidence Submitted': { bg: '#0A1A3D', text: '#60A5FA' },
  'Under Review': { bg: '#0A1A3D', text: '#60A5FA' },
  Approved: { bg: '#052E1A', text: '#22C55E' },
  'Final Review': { bg: '#2A1A00', text: '#FBBF24' },
  Compliant: { bg: '#052E1A', text: '#22C55E' },
  Rejected: { bg: '#2A0505', text: '#F87171' },
  Overdue: { bg: '#2A0000', text: '#EF4444' },
  Unassigned: { bg: '#1A1200', text: '#F59E0B' },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_CHIPS[status] || { bg: '#1e293b', text: '#94a3b8' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.text}30` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />
      {status}
    </span>
  );
}

// ─── Task Detail Page ─────────────────────────────────────────────────────────
function TaskDetail({ taskId, onBack }: { taskId: string; onBack: () => void }) {
  const { role } = useApp();
  const task = TASKS.find(t => t.id === taskId) || TASKS[0];
  const [feedback, setFeedback] = useState('');
  const [coDecision, setCoDecision] = useState('');
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [taskStarted, setTaskStarted] = useState(false);
  const [showSignOffConfirm, setShowSignOffConfirm] = useState(false);

  const isIT = role === 'it_admin';
  const isIA = role === 'internal_auditor';
  const isEA = role === 'external_auditor';
  const isCO = role === 'co' || role === 'ceo';

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] text-slate-400">
        <button onClick={onBack} className="hover:text-blue-600 transition-colors">Compliance Tasks</button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-800 font-medium truncate max-w-sm">{task.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <StatusChip status={task.status} />
              <span className="text-[10.5px] px-2 py-0.5 rounded font-semibold" style={{ background: `${PRIORITY_COLORS[task.priority]}18`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
            </div>
            <h1 className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{task.title}</h1>
          </div>
        </div>
        {/* Context chain */}
        <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
          {[`Assessment: Q1 2025 DPDP`, `Regulation: ${task.regulation}`, `Dept: ${task.dept}`, `Control: ${task.control}`, `Asset: ${task.asset}`].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
              <button className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors font-medium">{item}</button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-4">
        {/* Left: Main Content (60%) */}
        <div className="flex-1 space-y-4">
          {/* Task Information */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
            <p className="text-[12.5px] text-slate-700">{task.description}</p>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[11.5px] font-semibold text-blue-700 mb-0.5">Instructions from CO</p>
              <p className="text-[12px] text-blue-800">{task.instructions}</p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-[11.5px] font-semibold text-amber-700 mb-0.5">Evidence Required</p>
              <p className="text-[12px] text-amber-800">Screenshot of encryption settings, DB configuration export, AWS compliance certificate or signed DPA.</p>
            </div>
            {task.assignee ? (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11.5px] text-slate-600 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                This task was auto-assigned to <strong>{task.assignee}</strong> based on department IT Admin mapping for <strong>{task.dept}</strong>.
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11.5px] text-amber-700 flex items-center justify-between">
                <span><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />This task is unassigned. Assign it to an IT Admin to begin work.</span>
                {isCO && <button className="font-semibold hover:text-amber-900">Assign →</button>}
              </div>
            )}
          </div>

          {/* Evidence Section */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-slate-800">Evidence</p>
              {((isIT && task.status === 'In Progress') || isIA) && (
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload Evidence
              </button>
            )}
            </div>

            {/* IT Admin: Start task button */}
            {isIT && task.status === 'Pending' && !taskStarted && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <button onClick={() => setTaskStarted(true)} className="px-6 py-2.5 bg-blue-600 text-white text-[13px] font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                  ▶ Start Working on This Task
                </button>
                <p className="text-[11px] text-blue-500 mt-2">Click to acknowledge this task and begin working. Status will change to In Progress.</p>
              </div>
            )}

            {/* Evidence items */}
            {!['Pending', 'Unassigned'].includes(task.status) || taskStarted ? (
              <div className="space-y-2">
                {[
                  { title: 'Encryption Configuration Export', type: 'Config', date: '2025-03-08', version: 'v2', status: 'Under Review' },
                  { title: 'AWS RDS Encryption Screenshot', type: 'Screenshot', date: '2025-03-08', version: 'v1', status: 'Under Review' },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[12.5px] font-semibold text-slate-800">{ev.title}</p>
                      <p className="text-[10.5px] text-slate-400">
                        {ev.type} · Uploaded {ev.date} · <span className="font-mono">{ev.version}</span> · <button className="text-blue-500 hover:text-blue-700">View version history</button>
                      </p>
                    </div>
                    <StatusChip status={ev.status} />
                    {isIA && (
                      <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1 text-[11px]"><Edit2 className="w-3 h-3" /> Modify</button>
                    )}
                    <button className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400 italic py-4 text-center">No evidence submitted yet.</p>
            )}

            {/* IA review section */}
            {isIA && ['Evidence Submitted', 'Under Review'].includes(task.status) && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11.5px] font-semibold text-slate-700 mb-1">Context: Asset Details</p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    {[['Asset', task.asset], ['Type', task.assetType], ['Dept', task.dept], ['Criticality', 'High'], ['Hosting', 'India (AWS Mumbai)'], ['PII Categories', 'Name, Email, Financial']].map(([k, v]) => (
                      <div key={k}><span className="text-slate-400">{k}: </span><span className="font-medium">{v}</span></div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Review Notes</label>
                  <textarea rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Add notes about your review..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
                  <p className="text-[10.5px] text-slate-400 mt-0.5">Required when rejecting. Min 20 characters.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <ThumbsUp className="w-4 h-4" /> Approve Evidence
                  </button>
                  <button className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <ThumbsDown className="w-4 h-4" /> Reject and Flag Gap
                  </button>
                </div>
              </div>
            )}

            {/* CO decision for rejected */}
            {isCO && task.status === 'Rejected' && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-[12px] font-semibold text-amber-800 mb-1">Internal Auditor Feedback — Rahul Mehta, Apr 10, 2025</p>
                  <p className="text-[11.5px] text-amber-700">Evidence does not sufficiently demonstrate compliance. Please provide complete configuration export including all encryption settings and a signed verification checklist.</p>
                </div>
                <p className="text-[12.5px] font-semibold text-slate-800">What would you like to do next?</p>
                {[
                  { val: 'redelegate', label: 'Re-delegate to same IT Admin', sub: 'Send back with updated instructions', field: 'Updated Instructions for IT Admin (required)' },
                  { val: 'new', label: 'Create new approach', sub: 'Start fresh with different instructions', field: 'Instructions for new task (required)' },
                  { val: 'escalate', label: 'Escalate / Note as known risk', sub: 'Document as a known compliance risk', field: 'Risk documentation note (required)' },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setCoDecision(opt.val)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${coDecision === opt.val ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${coDecision === opt.val ? 'border-blue-600 bg-blue-600' : 'border-slate-300'}`} />
                      <p className="text-[12.5px] font-semibold text-slate-800">{opt.label}</p>
                    </div>
                    <p className="text-[11px] text-slate-400 ml-5">{opt.sub}</p>
                    {coDecision === opt.val && (
                      <textarea rows={2} placeholder={opt.field} className="w-full mt-2 px-3 py-2 rounded-md border border-slate-300 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
                    )}
                  </button>
                ))}
                {coDecision && <button className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold rounded-lg transition-colors">Submit Decision →</button>}
              </div>
            )}

            {/* EA sign-off */}
            {isEA && task.status === 'Final Review' && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600">
                  Internally approved by <strong>Rahul Mehta (IA)</strong> on Apr 20, 2025
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">Sign-off Notes (required for rejection)</label>
                  <textarea rows={2} placeholder="Add any final notes or reasons for rejection..." className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSignOffConfirm(true)} className="flex-1 h-10 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-bold rounded-lg transition-colors">Provide Final Sign-Off</button>
                  <button className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <ThumbsDown className="w-4 h-4" /> Reject & Return
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar (40%) */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Task Info */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-3">Task Info</p>
            <div className="space-y-2.5 text-[12px]">
              {[
                { label: 'Status', val: <StatusChip status={task.status} /> },
                { label: 'Priority', val: <span className="font-semibold" style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span> },
                { label: 'Due Date', val: task.dueDate },
                { label: 'Assignee', val: task.assignee || 'Unassigned' },
                { label: 'Regulation', val: task.regulation },
                { label: 'Asset', val: task.asset },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-800 font-medium">{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Auto-assigned based on dept mapping
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status Timeline</p>
            <div className="space-y-3">
              {[
                { state: 'Created', user: 'Priya Sharma', role: 'co', time: 'Apr 10, 2025 · 09:30', done: true },
                { state: 'Assigned', user: 'Auto-assigned to Manish Kumar', role: 'it_admin', time: 'Apr 10, 2025 · 09:31', done: true },
                { state: 'In Progress', user: 'Manish Kumar', role: 'it_admin', time: 'Apr 15, 2025 · 11:00', done: task.status !== 'Pending' },
                { state: 'Evidence Submitted', user: 'Manish Kumar', role: 'it_admin', time: 'Apr 20, 2025 · 14:22', done: ['Evidence Submitted', 'Under Review', 'Approved', 'Final Review', 'Rejected', 'Compliant'].includes(task.status) },
                { state: 'Under Review', user: 'Rahul Mehta', role: 'internal_auditor', time: 'Apr 21, 2025 · 10:05', done: ['Under Review', 'Approved', 'Final Review', 'Rejected', 'Compliant'].includes(task.status) },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${item.done ? '' : 'border-2 border-slate-200 bg-white'}`}
                    style={item.done ? { background: ROLE_COLORS[item.role as keyof typeof ROLE_COLORS] } : {}}>
                    {item.done && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className="text-[11.5px] font-semibold text-slate-800">{item.state}</p>
                    <p className="text-[10.5px] text-slate-500">{item.user}</p>
                    <p className="text-[10px] text-slate-300">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Due Date Tracker */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest">Due Date</p>
              {isCO && <button className="text-[10.5px] text-blue-600 hover:text-blue-700">Change</button>}
            </div>
            <p className="text-[13px] font-bold text-slate-800">{task.dueDate}</p>
            {task.daysLeft < 0 ? (
              <p className="text-[11px] font-bold text-red-600 mt-0.5">OVERDUE by {Math.abs(task.daysLeft)} days</p>
            ) : (
              <p className={`text-[11px] font-medium mt-0.5 ${task.daysLeft < 7 ? 'text-red-500' : task.daysLeft <= 14 ? 'text-amber-500' : 'text-green-600'}`}>{task.daysLeft} days remaining</p>
            )}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, ((36 - task.daysLeft) / 36) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Sign-off confirmation modal */}
      {showSignOffConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-[400px] p-5">
            <h3 className="text-[15px] font-bold text-slate-900 mb-2">Confirm Final Sign-Off?</h3>
            <p className="text-[12.5px] text-slate-600 mb-4">This will mark the control as <strong>Compliant</strong> on <strong>{task.asset}</strong>. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowSignOffConfirm(false)} className="flex-1 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={() => setShowSignOffConfirm(false)} className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[13px] font-bold rounded-lg transition-colors">Confirm Sign-Off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Task List Page ───────────────────────────────────────────────────────────
export function ComplianceTasksPage() {
  const { role } = useApp();
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewAllRejected, setViewAllRejected] = useState(false);
  const [viewAllUnassigned, setViewAllUnassigned] = useState(false);

  const rejectedTasks = TASKS.filter(t => t.status === 'Rejected');
  const unassignedTasks = TASKS.filter(t => t.status === 'Unassigned');

  // Role-specific filtering
  const roleFiltered = TASKS.filter(t => {
    if (role === 'it_admin') return t.assigneeRole === 'it_admin' && t.assignee === 'Manish Kumar';
    if (role === 'internal_auditor') return ['Evidence Submitted', 'Under Review'].includes(t.status);
    if (role === 'external_auditor') return t.status === 'Final Review';
    return true;
  });

  const filtered = roleFiltered.filter(t =>
    (activeTab === 'All' || t.status === activeTab) &&
    (search === '' || t.title.toLowerCase().includes(search.toLowerCase()) || t.asset.toLowerCase().includes(search.toLowerCase()))
  );

  const ALL_TABS = ['All', 'Pending', 'In Progress', 'Evidence Submitted', 'Under Review', 'Approved', 'Final Review', 'Compliant', 'Rejected', 'Overdue', 'Unassigned'];

  if (selectedTaskId) return <TaskDetail taskId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;

  // ── IT ADMIN VIEW ──────────────────────────────────────────────────────────
  if (role === 'it_admin') {
    const itTabs = ['All', 'Pending', 'In Progress', 'Evidence Submitted', 'Rejected', 'Compliant'];
    return (
      <div className="space-y-4">
        <div><h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>My Tasks</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{roleFiltered.length} tasks assigned to you</p></div>
        <div className="flex items-center gap-0 border-b border-slate-200">
          {itTabs.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {tab} <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{roleFiltered.filter(t => tab === 'All' || t.status === tab).length}</span>
          </button>))}
        </div>
        <div className="space-y-3">
          {roleFiltered.filter(t => activeTab === 'All' || t.status === activeTab).map(task => (
            <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusChip status={task.status} />
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[task.priority]}15`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{task.regulation}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">{task.dept}</span>
                </div>
                <p className="text-[13px] font-bold text-slate-900 mb-1">{task.title}</p>
                <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                  <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {task.asset}</span>
                  <span>·</span><span>{task.controlName}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <p className={`text-[11.5px] font-semibold ${task.daysLeft < 0 ? 'text-red-600' : task.daysLeft < 7 ? 'text-amber-600' : 'text-slate-500'}`}>
                  {task.daysLeft < 0 ? `${Math.abs(task.daysLeft)}d overdue` : `${task.daysLeft}d left`} · {task.dueDate}
                </p>
                <button onClick={() => setSelectedTaskId(task.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-semibold rounded-lg transition-colors">Open Task →</button>
              </div>
            </div>
          ))}
          {roleFiltered.filter(t => activeTab === 'All' || t.status === activeTab).length === 0 && (
            <div className="py-12 text-center bg-white border border-slate-200 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500">No tasks in this category</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── INTERNAL AUDITOR VIEW ──────────────────────────────────────────────────
  if (role === 'internal_auditor') {
    const recentlyReviewed = TASKS.filter(t => ['Approved', 'Compliant', 'Rejected'].includes(t.status)).slice(0, 5);
    return (
      <div className="space-y-5">
        <div><h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Evidence Review Queue</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{roleFiltered.length} items awaiting your review</p></div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 mb-3">Evidence Pending Your Review</p>
          <div className="space-y-3">
            {roleFiltered.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><StatusChip status={task.status} />
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{task.regulation}</span></div>
                  <p className="text-[13px] font-bold text-slate-900">{task.title}</p>
                  <div className="flex items-center gap-3 text-[11.5px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {task.asset}</span>
                    <span>·</span><span>{task.dept}</span>
                    <span>·</span><span>By: {task.assignee}</span>
                    <span>·</span><span className="text-amber-600 font-medium">Submitted {task.updatedAt}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTaskId(task.id)} className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-lg transition-colors flex-shrink-0">Review Evidence →</button>
              </div>
            ))}
            {roleFiltered.length === 0 && <div className="py-10 text-center bg-white border border-slate-200 rounded-lg"><CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /><p className="text-[13px] text-slate-500">No evidence awaiting review</p></div>}
          </div>
        </div>
        {recentlyReviewed.length > 0 && (
          <div>
            <p className="text-[13px] font-bold text-slate-800 mb-2">Recently Reviewed</p>
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {recentlyReviewed.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0">
                  {t.status === 'Rejected' ? <ThumbsDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /> : <ThumbsUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                  <div className="flex-1"><p className="text-[12px] font-medium text-slate-800">{t.title}</p><p className="text-[10.5px] text-slate-400">{t.asset} · {t.updatedAt}</p></div>
                  <StatusChip status={t.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EXTERNAL AUDITOR VIEW ──────────────────────────────────────────────────
  if (role === 'external_auditor') {
    return (
      <div className="space-y-5">
        <div><h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Final Sign-Off Queue</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{roleFiltered.length} items ready for final sign-off</p></div>
        <div>
          <p className="text-[13px] font-bold text-slate-800 mb-3">Items Ready for Final Sign-Off</p>
          <div className="space-y-3">
            {roleFiltered.map(task => (
              <div key={task.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><StatusChip status={task.status} />
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{task.regulation}</span></div>
                  <p className="text-[13px] font-bold text-slate-900">{task.title}</p>
                  <div className="flex items-center gap-3 text-[11.5px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {task.asset}</span>
                    <span>·</span><span>{task.dept}</span>
                    <span>·</span><span className="text-green-600 font-medium">Approved by: Rahul Mehta (IA) · Apr 21, 2025</span>
                  </div>
                </div>
                <button onClick={() => setSelectedTaskId(task.id)} className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-[12px] font-bold rounded-lg transition-colors flex-shrink-0">Review and Sign Off →</button>
              </div>
            ))}
            {roleFiltered.length === 0 && <div className="py-10 text-center bg-white border border-slate-200 rounded-lg"><CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" /><p className="text-[13px] text-slate-500">No items awaiting final sign-off</p></div>}
          </div>
        </div>
      </div>
    );
  }

  // ── CEO / CO VIEW (3-section layout) ──────────────────────────────────────
  const isCO = role === 'co';

  if (viewAllRejected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewAllRejected(false)} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-blue-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">← Compliance Tasks</button>
          <span className="text-[13px] font-semibold text-slate-800">All Rejected Tasks ({rejectedTasks.length})</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Task', 'Asset', 'Regulation', 'Rejected By', 'Date', ''].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
            </tr></thead>
            <tbody>
              {rejectedTasks.map(t => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedTaskId(t.id); setViewAllRejected(false); }}>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.title}</td>
                  <td className="px-4 py-3 text-slate-600">{t.asset}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{t.regulation}</span></td>
                  <td className="px-4 py-3 text-slate-500">Rahul Mehta (IA)</td>
                  <td className="px-4 py-3 text-slate-400">Apr 10, 2025</td>
                  <td className="px-4 py-3">{isCO && <button onClick={e => { e.stopPropagation(); setSelectedTaskId(t.id); setViewAllRejected(false); }} className="px-2.5 py-1 text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors">Decide →</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (viewAllUnassigned) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setViewAllUnassigned(false)} className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-blue-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50">← Compliance Tasks</button>
          <span className="text-[13px] font-semibold text-slate-800">All Unassigned Tasks ({unassignedTasks.length})</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Task', 'Control', 'Asset', 'Department', 'Regulation', 'Created', ''].map(h => <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide">{h}</th>)}
            </tr></thead>
            <tbody>
              {unassignedTasks.map(t => (
                <tr key={t.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.title}</td>
                  <td className="px-4 py-3"><span className="font-mono text-[10.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t.control}</span></td>
                  <td className="px-4 py-3 text-slate-600">{t.asset}</td>
                  <td className="px-4 py-3 text-slate-500">{t.dept}</td>
                  <td className="px-4 py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{t.regulation}</span></td>
                  <td className="px-4 py-3 text-slate-400">{t.updatedAt}</td>
                  <td className="px-4 py-3">{isCO && <button onClick={() => { setSelectedTaskId(t.id); setViewAllUnassigned(false); }} className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11.5px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"><User className="w-3 h-3" /> Assign →</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-[20px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Compliance Tasks</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">All compliance remediation work · {TASKS.length} total tasks</p></div>

      {/* Section 1: Rejected Tasks */}
      {rejectedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Rejected Tasks
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{rejectedTasks.length}</span>
            </p>
            <button onClick={() => setViewAllRejected(true)} className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">View All Rejected Tasks →</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {rejectedTasks.slice(0, 3).map(t => (
              <div key={t.id} className="bg-white border border-amber-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedTaskId(t.id)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{t.regulation}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">Apr 10, 2025</span>
                </div>
                <p className="text-[12.5px] font-bold text-slate-900 leading-tight mb-1">{t.title}</p>
                <p className="text-[11px] text-slate-500 mb-2">{t.asset}</p>
                <div className="p-2 bg-amber-50 rounded text-[10.5px] text-amber-700 line-clamp-2">
                  IA Feedback: Evidence does not sufficiently demonstrate compliance. Please provide complete configuration export…
                </div>
                {isCO && <p className="text-[10.5px] text-blue-600 font-medium mt-2">Click to decide next step →</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Unassigned Tasks
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">{unassignedTasks.length}</span>
            </p>
            <button onClick={() => setViewAllUnassigned(true)} className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">View All Unassigned Tasks →</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {unassignedTasks.slice(0, 3).map(t => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3.5 cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setSelectedTaskId(t.id)}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">{t.dept}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{t.regulation}</span>
                </div>
                <p className="text-[12.5px] font-bold text-slate-900 leading-tight mb-1">{t.title}</p>
                <p className="text-[11px] text-slate-500 mb-1">{t.asset}</p>
                <p className="text-[10.5px] text-slate-400 truncate">{t.controlName}</p>
                {isCO && <p className="text-[10.5px] text-blue-600 font-medium mt-2 flex items-center gap-1"><User className="w-3 h-3" /> Assign to IT Admin →</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: All Tasks */}
      <div className="space-y-3">
        <p className="text-[13px] font-bold text-slate-800">All Tasks</p>
        <div className="flex items-center gap-0 border-b border-slate-200 overflow-x-auto">
          {ALL_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[12px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab ? 'border-blue-500 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              {tab} <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded">{TASKS.filter(t => tab === 'All' || t.status === tab).length}</span>
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
            className="w-full pl-8 pr-3 h-8 rounded-md border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500" />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead><tr className="border-b border-slate-100 bg-slate-50 text-left text-slate-500">
              {['Task', 'Asset', 'Dept', 'Reg', 'Assignee', 'Priority', 'Due Date', 'Status', 'Updated', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {TASKS.filter(t => (activeTab === 'All' || t.status === activeTab) && (search === '' || t.title.toLowerCase().includes(search.toLowerCase()))).map(task => (
                <tr key={task.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTaskId(task.id)}>
                  <td className="px-3 py-3"><p className="font-semibold text-slate-800 max-w-[200px] truncate">{task.title}</p><p className="text-[10.5px] text-slate-400 truncate">{task.controlName}</p></td>
                  <td className="px-3 py-3"><div className="flex items-center gap-1.5"><Database className="w-3 h-3 text-blue-400 flex-shrink-0" /><span className="text-slate-700 font-medium truncate max-w-[100px]">{task.asset}</span></div></td>
                  <td className="px-3 py-3 text-slate-500">{task.dept}</td>
                  <td className="px-3 py-3"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">{task.regulation}</span></td>
                  <td className="px-3 py-3">{task.assignee ? <span className="text-slate-600">{task.assignee}</span> : <span className="text-amber-500 font-medium">Unassigned</span>}</td>
                  <td className="px-3 py-3"><span className="text-[10.5px] font-semibold" style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span></td>
                  <td className={`px-3 py-3 font-medium ${task.daysLeft < 0 ? 'text-red-600' : 'text-slate-600'}`}>{task.dueDate}</td>
                  <td className="px-3 py-3"><StatusChip status={task.status} /></td>
                  <td className="px-3 py-3 text-slate-400">{task.updatedAt}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedTaskId(task.id)} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">View <ArrowRight className="w-3 h-3" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {TASKS.filter(t => (activeTab === 'All' || t.status === activeTab) && (search === '' || t.title.toLowerCase().includes(search.toLowerCase()))).length === 0 && (
            <div className="py-14 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-300 mx-auto mb-3" />
              <p className="text-[13.5px] font-semibold text-slate-600">No tasks found</p>
              <p className="text-[12px] text-slate-400 mt-1">All caught up.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}