import { useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  GitMerge, Plus, Search, Edit2, Trash2, X, ArrowLeft, Loader2, Check,
  AlertTriangle, Archive, Link2, ChevronRight, Lock,
} from 'lucide-react'
import {
  useMasterControls, useMasterControl, useCreateMasterControl, useUpdateMasterControl,
  useDeleteMasterControl, useCreateMasterAction, useUpdateMasterAction, useDeleteMasterAction,
  useSetControlMasterLink, MasterControlAction, MasterControlLinkedControl,
} from '../../../hooks/useMasterControls'
import { useControls } from '../../../hooks/useControls'
import { useRegulations } from '../../../hooks/useRegulations'
import { ControlDetailPanel } from './AdminControls'
import toast from 'react-hot-toast'

const EVIDENCE_TYPES = ['FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LINK', 'TEXT_NOTE', 'LOG']
const EVIDENCE_LABELS: Record<string, string> = {
  FILE: 'File', SCREENSHOT: 'Screenshot', CONFIG: 'Config',
  DOCUMENT: 'Document', LINK: 'Link', TEXT_NOTE: 'Text Note', LOG: 'Log',
}

// ─── Create Master Control ─────────────────────────────────────────────────
function CreateMasterControlModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const { mutate: create, isPending } = useCreateMasterControl()

  const submit = () => {
    if (title.trim().length < 5) { toast.error('Title must be at least 5 characters'); return }
    if (description.trim().length < 5) { toast.error('Description must be at least 5 characters'); return }
    create({ title: title.trim(), description: description.trim() }, {
      onSuccess: (res: any) => { const id = res?.data?.id; onClose(); if (id) onCreated(id) },
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[460px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <p className="text-[16px] font-bold text-slate-900">Create Master Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[13px] text-slate-400 leading-relaxed">
            The canonical, regulation-agnostic definition. Link existing per-regulation controls to it afterward — completing this control's actions once will be recognized as satisfying every regulation it's linked to.
          </p>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Title <span className="text-slate-300">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Multi-Factor Authentication for Privileged Access" autoFocus
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Description <span className="text-slate-300">*</span></label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="The underlying obligation this represents, independent of any one regulation's wording"
              className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800 resize-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Master Control'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Master Control (title/description) ──────────────────────────────
function EditMasterControlModal({ mc, onClose }: { mc: { id: string; title: string; description: string }; onClose: () => void }) {
  const [title, setTitle] = useState(mc.title)
  const [description, setDescription] = useState(mc.description)
  const { mutate: update, isPending } = useUpdateMasterControl()

  const submit = () => {
    if (title.trim().length < 5 || description.trim().length < 5) { toast.error('Title and description are required'); return }
    update({ id: mc.id, data: { title: title.trim(), description: description.trim() } }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[460px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <p className="text-[16px] font-bold text-slate-900">Edit Master Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Description</label>
            <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800 resize-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={isPending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Master Action form (create/edit) ──────────────────────────────────────
function MasterActionFormModal({ masterControlId, action, onClose }: {
  masterControlId: string
  action?: MasterControlAction
  onClose: () => void
}) {
  const isEdit = !!action
  const [title, setTitle] = useState(action?.title ?? '')
  const [description, setDescription] = useState(action?.description ?? '')
  const [evidenceTypes, setEvidenceTypes] = useState<string[]>(action?.evidenceTypes ?? [])
  const [dueDays, setDueDays] = useState(action?.suggestedDueDays ?? 30)
  const [priority, setPriority] = useState(action?.priority ?? 'HIGH')
  const { mutate: createAction, isPending: creating } = useCreateMasterAction()
  const { mutate: updateAction, isPending: updating } = useUpdateMasterAction()
  const pending = creating || updating

  const submit = () => {
    if (!title.trim() || !description.trim() || evidenceTypes.length === 0) {
      toast.error('Title, description and at least one evidence type are required'); return
    }
    const data = { title: title.trim(), description: description.trim(), evidenceTypes, suggestedDueDays: dueDays, priority }
    if (isEdit) {
      updateAction({ masterControlId, actionId: action!.id, data }, { onSuccess: onClose })
    } else {
      createAction({ masterControlId, ...data }, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[65]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white">
          <p className="text-[16px] font-bold text-slate-900">{isEdit ? 'Edit Master Action' : 'Add Master Action'}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Action Title *" autoFocus
            className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800" />
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What the tenant needs to do *"
            className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none" />
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Expected Evidence Types <span className="text-slate-300">*</span></label>
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => setEvidenceTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}
                  className={`px-2 py-0.5 rounded-md text-[12.5px] font-medium border transition-all ${evidenceTypes.includes(t) ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400 bg-white'}`}>
                  {EVIDENCE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Suggested Due Days</label>
              <input type="number" min={1} max={365} value={dueDays} onChange={e => setDueDays(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Priority</label>
              <div className="flex gap-1.5">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`flex-1 h-9 rounded-md text-[12px] font-medium border transition-all ${priority === p ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]' : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400 bg-white'}`}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Save Changes' : 'Add Action'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Link Existing Control (search picker) ─────────────────────────────────
function LinkControlModal({ masterControlId, onClose }: { masterControlId: string; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [regulationFilter, setRegulationFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const { data: regsData } = useRegulations({ limit: 1000 })
  const regulations = (regsData as any)?.data ?? []
  const { data: controlsData, isLoading } = useControls({
    search, limit: 50,
    ...(regulationFilter !== 'All' ? { regulationId: regulationFilter } : {}),
    ...(statusFilter !== 'All' ? { status: statusFilter } : {}),
  })
  const { mutate: setLink, isPending } = useSetControlMasterLink()
  const controls = (controlsData as any)?.data ?? []

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[75vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <p className="text-[16px] font-bold text-slate-900">Link Existing Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="px-5 pt-3 pb-2.5 border-b border-slate-100 flex-shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls by title…" autoFocus
              className="w-full pl-8 pr-3 h-9 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800" />
          </div>
          <div className="flex gap-2">
            <select value={regulationFilter} onChange={e => setRegulationFilter(e.target.value)}
              className="h-8 px-2 rounded-lg border border-[#64748B]/20 text-[13px] text-slate-700 focus:outline-none bg-white flex-1">
              <option value="All">All Regulations</option>
              {regulations.map((r: any) => <option key={r.id} value={r.id}>{r.shortCode}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-8 px-2 rounded-lg border border-[#64748B]/20 text-[13px] text-slate-700 focus:outline-none bg-white w-36">
              <option value="All">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-10"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : controls.length === 0 ? (
            <p className="text-center text-[14px] text-slate-400 py-10">No matching controls found.</p>
          ) : controls.map((c: any) => {
            const alreadyHere = c.masterControlId === masterControlId
            const linkedElsewhere = c.masterControlId && !alreadyHere
            return (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800 truncate">{c.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {(c.citedRegulationIds ?? []).length > 0 && (
                      <span className="text-[11.5px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {c.citedRegulationIds.length} regulation{c.citedRegulationIds.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className={`text-[11.5px] font-semibold px-1.5 py-0.5 rounded ${c.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                    {linkedElsewhere && (
                      <span className="text-[11.5px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Linked to "{c.masterControl?.title}"
                      </span>
                    )}
                  </div>
                </div>
                <button disabled={isPending || alreadyHere || linkedElsewhere}
                  title={linkedElsewhere ? 'Unlink it from its current master control first' : undefined}
                  onClick={() => setLink({ controlId: c.id, masterControlId })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors flex-shrink-0 ${
                    alreadyHere ? 'bg-slate-100 text-slate-400 cursor-default'
                      : linkedElsewhere ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                      : 'bg-[#1A3E5C] text-white hover:bg-[#15324a] disabled:opacity-50'
                  }`}>
                  {alreadyHere ? <><Check className="w-3.5 h-3.5" /> Linked</> : <><Link2 className="w-3.5 h-3.5" /> Link</>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm ─────────────────────────────────────────────────────────
function DeleteMasterControlModal({ mc, onClose, onDeleted }: { mc: { id: string; title: string }; onClose: () => void; onDeleted: () => void }) {
  const { mutate: del, isPending } = useDeleteMasterControl()
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[65]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-100 bg-red-50/60 rounded-t-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[16px] font-bold text-red-700 flex-1">Delete Master Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5">
          <p className="text-[14px] text-slate-700 leading-relaxed">
            Delete <span className="font-bold">{mc.title}</span>? Its master actions go with it. Linked controls are <span className="font-semibold">not</span> deleted — they just lose their master-control link.
          </p>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={() => del(mc.id, { onSuccess: onDeleted })} disabled={isPending}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Master Control Detail Page ────────────────────────────────────────────
function MasterControlDetailPage({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: mc, isLoading } = useMasterControl(id)
  const [tab, setTab] = useState<'Actions' | 'Linked Controls'>('Actions')
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showAddAction, setShowAddAction] = useState(false)
  const [editingAction, setEditingAction] = useState<MasterControlAction | null>(null)
  const [showLinkControl, setShowLinkControl] = useState(false)
  const [selectedControl, setSelectedControl] = useState<MasterControlLinkedControl | null>(null)
  const { mutate: updateMc } = useUpdateMasterControl()
  const { mutate: deleteAction } = useDeleteMasterAction()
  const { mutate: unlink } = useSetControlMasterLink()

  const copyId = () => { navigator.clipboard.writeText(id); toast.success('Master control ID copied') }

  if (isLoading || !mc) {
    return <div className="flex items-center justify-center py-16 gap-3 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Loading…</div>
  }

  const regulationCodes = Array.from(new Set(mc.controls.map(c => c.regulation?.shortCode).filter(Boolean))) as string[]

  return (
    <div className="space-y-4">
      {showEdit && <EditMasterControlModal mc={mc} onClose={() => setShowEdit(false)} />}
      {showDelete && <DeleteMasterControlModal mc={mc} onClose={() => setShowDelete(false)} onDeleted={onBack} />}
      {showAddAction && <MasterActionFormModal masterControlId={id} onClose={() => setShowAddAction(false)} />}
      {editingAction && <MasterActionFormModal masterControlId={id} action={editingAction} onClose={() => setEditingAction(null)} />}
      {showLinkControl && <LinkControlModal masterControlId={id} onClose={() => setShowLinkControl(false)} />}
      {selectedControl && <ControlDetailPanel control={selectedControl} onClose={() => setSelectedControl(null)} />}

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[14px] text-slate-500 hover:text-slate-800 border border-[#64748B]/20 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Master Controls
        </button>
        {regulationCodes.length > 0 && (
          <div className="flex gap-1.5">
            {regulationCodes.map(code => (
              <span key={code} className="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{code}</span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[12.5px] font-bold px-2 py-0.5 rounded bg-[#1A3E5C]/8 text-[#1A3E5C]">{mc.code}</span>
              <h2 className="text-[18px] font-bold text-slate-900">{mc.title}</h2>
              <button onClick={copyId} title={`Click to copy the full ID (${mc.id})`}
                className="text-[11px] text-slate-300 hover:text-slate-600 transition-colors">
                copy ID
              </button>
            </div>
            <p className="text-[14px] text-slate-500 mt-1">{mc.description}</p>
            <div className="flex gap-6 text-[13.5px] text-slate-500 mt-3">
              <div><span className="text-slate-400">Status: </span><span className="font-medium text-slate-700">{mc.status}</span></div>
              <div><span className="text-slate-400">Actions: </span><span className="font-medium text-slate-700">{mc.actions.length}</span></div>
              <div><span className="text-slate-400">Linked controls: </span><span className="font-medium text-slate-700">{mc.controls.length}</span></div>
            </div>
          </div>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-slate-600 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => updateMc({ id, data: { status: mc.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' } })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-slate-600 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
              <Archive className="w-3.5 h-3.5" /> {mc.status === 'ARCHIVED' ? 'Reactivate' : 'Archive'}
            </button>
            <button onClick={() => setShowDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-[#64748B]/20 gap-0">
        {(['Actions', 'Linked Controls'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${tab === t ? 'border-[#1A3E5C] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t} <span className="text-[12px] text-slate-400">({t === 'Actions' ? mc.actions.length : mc.controls.length})</span>
          </button>
        ))}
      </div>

      {tab === 'Actions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-400">Authored once here — every linked control's actions inherit from this list.</p>
            <button onClick={() => setShowAddAction(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium bg-[#1A3E5C] hover:bg-[#15324a] text-white rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Action
            </button>
          </div>
          {mc.actions.length === 0 ? (
            <div className="bg-white border border-[#64748B]/20 rounded-xl p-10 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <p className="text-[14.5px] text-slate-400">No actions yet.</p>
              <button onClick={() => setShowAddAction(true)} className="mt-3 text-[14.5px] text-slate-600 font-medium underline hover:text-slate-900">Add the first action</button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mc.actions.map((a, idx) => (
                <div key={a.id} className="bg-white border border-[#64748B]/20 rounded-xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14.5px] font-semibold text-slate-800 leading-snug flex-1">
                      <span className="text-slate-400 mr-1.5 font-normal text-[13px]">{idx + 1}.</span>{a.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{a.priority}</span>
                      <button onClick={() => setEditingAction(a)} className="p-1 text-slate-400 hover:text-[#1A3E5C] transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm(`Remove action "${a.title}"?`)) deleteAction({ masterControlId: id, actionId: a.id }) }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-600 mt-1.5">{a.description}</p>
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    {a.evidenceTypes.map(t => (
                      <span key={t} className="text-[12px] font-semibold px-1.5 py-0.5 bg-slate-50 border border-[#64748B]/20 text-slate-600 rounded">{EVIDENCE_LABELS[t] ?? t}</span>
                    ))}
                    <span className="text-[13px] text-slate-400">Due: {a.suggestedDueDays}d</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'Linked Controls' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-slate-400">Completing this control's actions for any one of these is recognized across the others.</p>
            <button onClick={() => setShowLinkControl(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium bg-[#1A3E5C] hover:bg-[#15324a] text-white rounded-lg transition-colors">
              <Link2 className="w-3.5 h-3.5" /> Link Existing Control
            </button>
          </div>
          {mc.controls.length === 0 ? (
            <div className="bg-white border border-[#64748B]/20 rounded-xl p-10 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <p className="text-[14.5px] text-slate-400">No controls linked yet.</p>
              <button onClick={() => setShowLinkControl(true)} className="mt-3 text-[14.5px] text-slate-600 font-medium underline hover:text-slate-900">Link the first control</button>
            </div>
          ) : (
            <div className="bg-white border border-[#64748B]/20 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)] divide-y divide-slate-50">
              {mc.controls.map((c: MasterControlLinkedControl) => {
                const total = c.predefinedActions.length
                const inherited = c.predefinedActions.filter(a => a.masterActionId).length
                const supplementary = total - inherited
                return (
                  <div key={c.id} onClick={() => setSelectedControl(c)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <span className="font-mono text-[12px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 flex-shrink-0">{c.regulation?.shortCode ?? '—'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-slate-800 truncate">{c.title}</p>
                      <p className="text-[12.5px] text-slate-400">
                        {inherited > 0 && <span>{inherited} inherited</span>}
                        {inherited > 0 && supplementary > 0 && <span> · </span>}
                        {supplementary > 0 && <span>{supplementary} of its own</span>}
                        {total === 0 && <span>No actions yet</span>}
                      </p>
                    </div>
                    <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${c.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{c.status}</span>
                    <button onClick={e => { e.stopPropagation(); if (confirm(`Unlink "${c.title}" from this master control?`)) unlink({ controlId: c.id, masterControlId: null }) }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0" title="Unlink">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export function AdminMasterControlsPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('id')
  const selectId = (id: string | null) => setSearchParams(id ? { id } : {}, { replace: true })
  const { data, isLoading } = useMasterControls({ limit: 100, ...(search ? { search } : {}) })
  const items = data?.data ?? []

  if (selectedId) {
    return <MasterControlDetailPage id={selectedId} onBack={() => selectId(null)} />
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {showCreate && <CreateMasterControlModal onClose={() => setShowCreate(false)} onCreated={id => selectId(id)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>Master Controls</h1>
          <p className="text-[14px] text-slate-400 mt-0.5">
            Cross-regulation equivalence — one canonical control, linked to whichever regulation-specific controls implement it.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] active:scale-[0.98] text-white text-[15px] font-medium rounded-lg transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Create Master Control
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search master controls…"
          className="w-full pl-8 pr-3 h-9 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-[15px]">Loading…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-[#64748B]/20 rounded-xl p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
          <GitMerge className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-slate-700">No master controls yet</p>
          <p className="text-[14px] text-slate-400 mt-1 mb-4">Create one to group equivalent controls across regulations.</p>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-[#1A3E5C] text-white text-[15px] font-medium rounded-lg hover:bg-[#15324a] transition-colors">
            Create First Master Control
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {items.map(mc => {
            const regulationCodes = Array.from(new Set((mc.controls ?? []).map(c => c.regulation?.shortCode).filter(Boolean))) as string[]
            return (
              <div key={mc.id} onClick={() => selectId(mc.id)}
                className="bg-white border border-[#64748B]/20 rounded-xl p-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all cursor-pointer group shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#1A3E5C]/8">
                    <GitMerge className="w-[18px] h-[18px] text-[#1A3E5C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-[#1A3E5C]/70">{mc.code}</span>
                    <p className="text-[15.5px] font-bold text-slate-900 leading-tight line-clamp-2">{mc.title}</p>
                    <p className="text-[12.5px] text-slate-400 mt-0.5 line-clamp-2">{mc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2 min-h-[22px]">
                  {regulationCodes.map(code => (
                    <span key={code} className="font-mono text-[11.5px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{code}</span>
                  ))}
                  {regulationCodes.length === 0 && <span className="text-[12px] text-slate-300 italic">Not linked yet</span>}
                </div>
                <div className="flex items-center justify-between text-[13px] text-slate-500 pt-2.5 border-t border-slate-100">
                  <span>{mc._count?.actions ?? 0} action{(mc._count?.actions ?? 0) !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-[#1A3E5C] font-medium group-hover:gap-1.5 transition-all">
                    View <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
