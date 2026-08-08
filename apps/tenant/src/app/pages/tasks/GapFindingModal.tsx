import React, { useState } from 'react';
import { X, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { useAddGapFinding, type Action, type GapReasonCode } from '../../../hooks/useTasks';

const REASON_OPTIONS: { value: GapReasonCode; label: string }[] = [
  { value: 'INSUFFICIENT_EVIDENCE',        label: 'Insufficient Evidence' },
  { value: 'NON_COMPLIANT_CONFIGURATION',  label: 'Non-compliant Configuration' },
  { value: 'MISSING_DOCUMENTATION',        label: 'Missing Documentation' },
  { value: 'INCORRECT_TOOL_USED',          label: 'Incorrect Tool Used' },
  { value: 'OUTDATED_EVIDENCE',            label: 'Outdated Evidence' },
  { value: 'OTHER',                        label: 'Other' },
];

interface GapFindingModalProps {
  taskId: string;
  actions: Action[];
  onClose: () => void;
  onRecorded: () => void;
}

export function GapFindingModal({ taskId, actions, onClose, onRecorded }: GapFindingModalProps) {
  const addFindingMut = useAddGapFinding();

  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(new Set());
  const [reasonCodes, setReasonCodes] = useState<Set<GapReasonCode>>(new Set());
  const [otherReason, setOtherReason] = useState('');
  const [remediation, setRemediation] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  function toggleAction(id: string) {
    setSelectedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedActionIds(prev => prev.size === actions.length ? new Set() : new Set(actions.map(a => a.id)));
  }

  function toggleReason(code: GapReasonCode) {
    setReasonCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  const canSubmit = selectedActionIds.size > 0 && reasonCodes.size > 0 && remediation.trim().length > 4 &&
    (!reasonCodes.has('OTHER') || otherReason.trim().length > 0);

  async function handleSubmit() {
    await addFindingMut.mutateAsync({
      taskId,
      input: {
        reasonCodes: [...reasonCodes],
        otherReason: reasonCodes.has('OTHER') ? otherReason.trim() : undefined,
        remediation: remediation.trim(),
        actionIds:   [...selectedActionIds],
        files,
      },
    });
    onRecorded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Record Gap Finding
          </p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Which actions have a gap */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12.5px] font-semibold text-slate-600">Which action(s) have a gap?</p>
              {actions.length > 1 && (
                <button onClick={toggleAll} className="text-[12px] text-blue-600 hover:underline">
                  {selectedActionIds.size === actions.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto border border-slate-100 rounded-lg p-2">
              {actions.map(a => (
                <label key={a.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedActionIds.has(a.id)} onChange={() => toggleAction(a.id)}
                    className="accent-red-600" />
                  <span className="text-[13px] text-slate-700 truncate">{a.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason codes */}
          <div>
            <p className="text-[12.5px] font-semibold text-slate-600 mb-1.5">Why is this being rejected?</p>
            <div className="grid grid-cols-2 gap-1">
              {REASON_OPTIONS.map(r => (
                <label key={r.value} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={reasonCodes.has(r.value)} onChange={() => toggleReason(r.value)}
                    className="accent-red-600" />
                  <span className="text-[12.5px] text-slate-700">{r.label}</span>
                </label>
              ))}
            </div>
            {reasonCodes.has('OTHER') && (
              <input value={otherReason} onChange={e => setOtherReason(e.target.value)}
                placeholder="Describe the reason"
                className="mt-1.5 w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-red-400" />
            )}
          </div>

          {/* Remediation */}
          <div>
            <label className="text-[12.5px] font-semibold text-slate-600">What should be done to fix this?</label>
            <textarea rows={3} value={remediation} onChange={e => setRemediation(e.target.value)}
              placeholder="Required — give the IT Admin explicit remediation instructions…"
              className="w-full mt-1 px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-red-400" />
          </div>

          {/* Supporting files */}
          <div className="space-y-1.5">
            <label className="text-[12.5px] font-semibold text-slate-600">Supporting files (optional)</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-red-400">
              <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-[13px] text-slate-500">Attach one or more files showing the gap</span>
              <input type="file" multiple className="hidden"
                onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])])} />
            </label>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-2.5 py-1 bg-slate-50 rounded text-[12.5px] text-slate-600">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 ml-2 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || addFindingMut.isPending}
            className="flex-1 py-2 bg-red-600 text-white text-[14px] font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {addFindingMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Record Finding
          </button>
        </div>
      </div>
    </div>
  );
}
