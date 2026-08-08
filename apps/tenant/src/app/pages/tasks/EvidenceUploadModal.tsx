import React, { useState } from 'react';
import { X, Loader2, FileText, Upload } from 'lucide-react';
import { useUploadEvidence, type Action } from '../../../hooks/useTasks';

const EVIDENCE_TYPES = ['FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LOG', 'LINK', 'TEXT_NOTE'];
const FILE_BASED_TYPES = ['FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LOG'];

interface EvidenceUploadModalProps {
  taskId: string;
  actions: Action[];
  initialActionId?: string;
  initialProductId?: string;
  onClose: () => void;
}

export function EvidenceUploadModal({ taskId, actions, initialActionId, initialProductId, onClose }: EvidenceUploadModalProps) {
  const uploadMut = useUploadEvidence();

  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(
    new Set(initialActionId ? [initialActionId] : [])
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId ?? '');
  const [otherLabel, setOtherLabel]   = useState('');
  const [title, setTitle]             = useState('');
  const [type, setType]               = useState('DOCUMENT');
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl]         = useState('');
  const [textContent, setTextContent] = useState('');
  const [files, setFiles]             = useState<File[]>([]);
  const [uploading, setUploading]     = useState(false);

  const selectedActionsList = actions.filter(a => selectedActionIds.has(a.id));

  // Only offer products actually mapped to EVERY selected action — picking one that's
  // not relevant to one of the selected actions would be a meaningless tag on that action.
  const commonProducts = selectedActionsList.length > 0
    ? selectedActionsList.slice(1).reduce(
        (acc, a) => acc.filter(p => a.products.some(ap => ap.id === p.id)),
        selectedActionsList[0].products
      )
    : [];

  const masterEvidenceRefs = selectedProductId
    ? selectedActionsList
        .map(a => ({ action: a, me: a.products.find(p => p.id === selectedProductId)?.masterEvidence ?? null }))
        .filter((x): x is { action: Action; me: NonNullable<Action['products'][number]['masterEvidence']> } => !!x.me)
    : [];

  function toggleAction(id: string) {
    setSelectedActionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedProductId('');
  }

  function toggleAll() {
    setSelectedActionIds(prev => prev.size === actions.length ? new Set() : new Set(actions.map(a => a.id)));
    setSelectedProductId('');
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  const isFileBased = FILE_BASED_TYPES.includes(type);
  const canSubmit = title.trim().length > 1 && selectedActionIds.size > 0 &&
    (type === 'LINK' ? linkUrl.trim().length > 0 : type === 'TEXT_NOTE' ? textContent.trim().length > 0 : files.length > 0);

  async function handleSubmit() {
    const actionTags = [...selectedActionIds].map(actionId => ({
      actionId,
      ...(selectedProductId ? { productId: selectedProductId } : {}),
      ...(!selectedProductId && otherLabel.trim() ? { otherLabel: otherLabel.trim() } : {}),
    }));

    setUploading(true);
    try {
      if (isFileBased && files.length > 1) {
        // One evidence record per file, all tagged the same way — avoids re-running
        // the whole "which action / which product" flow for every additional file.
        for (const f of files) {
          await uploadMut.mutateAsync({
            taskId,
            input: {
              title: `${title.trim()} — ${f.name}`,
              type, description: description.trim() || undefined,
              file: f, actions: actionTags,
            },
          });
        }
      } else {
        await uploadMut.mutateAsync({
          taskId,
          input: {
            title: title.trim(), type,
            description: description.trim() || undefined,
            linkUrl: type === 'LINK' ? linkUrl.trim() : undefined,
            textContent: type === 'TEXT_NOTE' ? textContent.trim() : undefined,
            file: isFileBased ? files[0] : undefined,
            actions: actionTags,
          },
        });
      }
      onClose();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">Add Evidence</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Applies to */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[12.5px] font-semibold text-slate-600">Applies to</p>
              {actions.length > 1 && (
                <button onClick={toggleAll} className="text-[12px] text-blue-600 hover:underline">
                  {selectedActionIds.size === actions.length ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-100 rounded-lg p-2">
              {actions.map(a => (
                <label key={a.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selectedActionIds.has(a.id)} onChange={() => toggleAction(a.id)}
                    className="accent-slate-800" />
                  <span className="text-[13px] text-slate-700 truncate">{a.title}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Product picker — only products common to every selected action */}
          {selectedActionsList.length > 0 && (
            <div>
              <p className="text-[12.5px] font-semibold text-slate-600 mb-1.5">
                Which tool did you use for {selectedActionsList.length > 1 ? 'these actions' : 'this'}?
              </p>
              {commonProducts.length === 0 && selectedActionsList.length > 1 && (
                <p className="text-[12px] text-slate-400 italic mb-1">No tool is common to all the selected actions — use "Other" below, or tag each action separately for a product-specific match.</p>
              )}
              <div className="space-y-1">
                {commonProducts.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                    <input type="radio" name="product" checked={selectedProductId === p.id}
                      onChange={() => setSelectedProductId(p.id)} className="accent-slate-800" />
                    <span className="text-[13px] text-slate-700">{p.name}{p.vendor ? ` (${p.vendor})` : ''}</span>
                  </label>
                ))}
                <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="radio" name="product" checked={selectedProductId === ''}
                    onChange={() => setSelectedProductId('')} className="accent-slate-800" />
                  <span className="text-[13px] text-slate-700">Other tool / manual process</span>
                </label>
              </div>
              {selectedProductId === '' && (
                <input value={otherLabel} onChange={e => setOtherLabel(e.target.value)}
                  placeholder="Name the tool or process you used"
                  className="mt-1.5 w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
              )}
              {masterEvidenceRefs.map(({ action, me }) => (
                <div key={action.id} className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                  {selectedActionsList.length > 1 && (
                    <p className="text-[11.5px] font-semibold text-blue-800 mb-0.5">For "{action.title}"</p>
                  )}
                  <p className="text-[12.5px] font-semibold text-blue-700">Reference: {me.title}</p>
                  {me.description && <p className="text-[12px] text-blue-600 mt-0.5">{me.description}</p>}
                  {me.fileUrl && (
                    <a href={me.fileUrl} target="_blank" rel="noreferrer"
                      className="text-[12px] text-blue-500 underline mt-0.5 inline-block">View sample</a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Title / Type */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[12px] text-slate-500">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. MFA policy screenshot"
                className="w-full mt-0.5 px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Type</label>
              <select value={type} onChange={e => { setType(e.target.value); setFiles([]); }}
                className="w-full mt-0.5 px-2 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400">
                {EVIDENCE_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Content input by type */}
          {type === 'LINK' ? (
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…"
              className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400" />
          ) : type === 'TEXT_NOTE' ? (
            <textarea rows={3} value={textContent} onChange={e => setTextContent(e.target.value)}
              placeholder="Describe what was done…"
              className="w-full px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-400" />
          ) : (
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400">
                <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-[13px] text-slate-500">Choose one or more files to upload</span>
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
          )}

          <div>
            <label className="text-[12px] text-slate-500">Description (optional)</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full mt-0.5 px-3 py-1.5 text-[13px] border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-blue-400" />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!canSubmit || uploading}
            className="flex-1 py-2 bg-slate-900 text-white text-[14px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {files.length > 1 ? `Upload ${files.length} Files` : 'Upload Evidence'}
          </button>
        </div>
      </div>
    </div>
  );
}
