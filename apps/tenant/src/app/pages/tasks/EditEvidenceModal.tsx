import React, { useState } from 'react';
import { X, Loader2, Save, Upload } from 'lucide-react';
import { useUpdateEvidence } from '../../../hooks/useTasks';

export interface EditableEvidence {
  id:          string;
  title:       string;
  type:        string;
  description: string | null;
  fileName:    string | null;
  linkUrl:     string | null;
  textContent: string | null;
}

interface EditEvidenceModalProps {
  taskId: string;
  evidence: EditableEvidence;
  onClose: () => void;
}

const FILE_BASED_TYPES = ['FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LOG'];

export function EditEvidenceModal({ taskId, evidence, onClose }: EditEvidenceModalProps) {
  const updateMut = useUpdateEvidence();
  const [title, setTitle]             = useState(evidence.title);
  const [description, setDescription] = useState(evidence.description ?? '');
  const [linkUrl, setLinkUrl]         = useState(evidence.linkUrl ?? '');
  const [textContent, setTextContent] = useState(evidence.textContent ?? '');
  const [file, setFile]               = useState<File | null>(null);

  const isFileBased = FILE_BASED_TYPES.includes(evidence.type);

  async function handleSubmit() {
    await updateMut.mutateAsync({
      taskId, evidenceId: evidence.id,
      input: {
        title: title.trim(),
        description: description.trim(),
        linkUrl: evidence.type === 'LINK' ? linkUrl.trim() : undefined,
        textContent: evidence.type === 'TEXT_NOTE' ? textContent.trim() : undefined,
        file: file ?? undefined,
      },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[440px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4AF37]/35">
          <p className="text-[17px] font-bold text-slate-900">Edit Evidence</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-4 space-y-3.5">
          <div>
            <label className="text-[14px] text-slate-500">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full mt-0.5 px-3 py-1.5 text-[15px] border border-[#D4AF37]/35 rounded-lg focus:outline-none focus:border-[#1A3E5C]/40" />
          </div>

          {evidence.type === 'LINK' ? (
            <div>
              <label className="text-[14px] text-slate-500">Link URL</label>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                className="w-full mt-0.5 px-3 py-1.5 text-[15px] border border-[#D4AF37]/35 rounded-lg focus:outline-none focus:border-[#1A3E5C]/40" />
            </div>
          ) : evidence.type === 'TEXT_NOTE' ? (
            <div>
              <label className="text-[14px] text-slate-500">Note</label>
              <textarea rows={3} value={textContent} onChange={e => setTextContent(e.target.value)}
                className="w-full mt-0.5 px-3 py-1.5 text-[15px] border border-[#D4AF37]/35 rounded-lg resize-none focus:outline-none focus:border-[#1A3E5C]/40" />
            </div>
          ) : isFileBased ? (
            <div>
              <label className="text-[14px] text-slate-500">File</label>
              <label className="mt-0.5 flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#1A3E5C]/40">
                <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-[15px] text-slate-500 truncate">{file ? file.name : `Current: ${evidence.fileName ?? '—'} (click to replace)`}</span>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ) : null}

          <div>
            <label className="text-[14px] text-slate-500">Description</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full mt-0.5 px-3 py-1.5 text-[15px] border border-[#D4AF37]/35 rounded-lg resize-none focus:outline-none focus:border-[#1A3E5C]/40" />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-[#D4AF37]/35">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[16px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={!title.trim() || updateMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[16px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
