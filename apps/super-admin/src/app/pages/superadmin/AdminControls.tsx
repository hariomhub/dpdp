import React, { useState } from 'react'
import {
  Plus, Shield, Scale, BarChart2, Search, Eye, Edit2, Archive,
  ChevronDown, ChevronRight, Trash2, X, ArrowLeft, Loader2, Check
} from 'lucide-react'
import {
  useRegulations,
  useCreateRegulation,
  useArchiveRegulation,
  useRegulationChapters,
  useCreateChapter,
} from '../../../hooks/useRegulations'
import {
  useControls,
  useCreateControl,
  usePublishControl,
} from '../../../hooks/useControls'
import { apiClient } from '../../../lib/api-client'
import toast from 'react-hot-toast'

const EVIDENCE_TYPES = ['FILE', 'SCREENSHOT', 'CONFIG', 'DOCUMENT', 'LINK', 'TEXT_NOTE', 'LOG']
const EVIDENCE_LABELS: Record<string, string> = {
  FILE: 'File', SCREENSHOT: 'Screenshot', CONFIG: 'Config',
  DOCUMENT: 'Document', LINK: 'Link', TEXT_NOTE: 'Text Note', LOG: 'Log'
}

type ActionEntry = {
  id: string
  title: string
  desc: string
  evidenceTypes: string[]
  dueDays: number
  priority: string
}

// ─── Regulation Form ──────────────────────────────────────────────────────────
function RegulationForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', shortCode: '', authority: '', desc: '',
    jurisdiction: 'India', effectiveDate: '', status: 'DRAFT'
  })
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const { mutate: createRegulation, isPending } = useCreateRegulation()

  const handleSave = () => {
    if (!form.name || !form.shortCode || !form.authority || !form.desc || !form.effectiveDate) {
      toast.error('Please fill all required fields')
      return
    }
    createRegulation({
      name: form.name,
      shortCode: form.shortCode,
      issuingAuthority: form.authority,
      description: form.desc,
      jurisdiction: form.jurisdiction,
      effectiveDate: form.effectiveDate,
      status: form.status,
    }, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[760px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <p className="text-[15px] font-bold text-slate-900">Create New Regulation</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[12px] text-slate-400">Define a regulation that organizations can assess against.</p>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Regulation Name <span className="text-slate-300">*</span>
            </label>
            <input value={form.name} onChange={e => up('name', e.target.value)}
              placeholder="e.g., Digital Personal Data Protection Act 2023"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Short Code <span className="text-slate-300">*</span>
                <span className="text-slate-400 font-normal normal-case ml-1">(max 10 chars)</span>
              </label>
              <input value={form.shortCode}
                onChange={e => up('shortCode', e.target.value.toUpperCase().slice(0, 10))}
                placeholder="e.g., DPDP"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 font-mono transition-colors" />
              <p className="text-[10.5px] text-slate-400 mt-0.5">Used as a tag throughout the platform. Must be unique.</p>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Issuing Authority <span className="text-slate-300">*</span>
              </label>
              <input value={form.authority} onChange={e => up('authority', e.target.value)}
                placeholder="e.g., Ministry of Electronics and IT"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-slate-300">*</span>
            </label>
            <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)}
              placeholder="Full description of what this regulation covers and who it applies to."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Jurisdiction <span className="text-slate-300">*</span>
              </label>
              <select value={form.jurisdiction} onChange={e => up('jurisdiction', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white">
                {['India', 'European Union', 'United States', 'United Kingdom', 'Singapore', 'Global'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Effective Date <span className="text-slate-300">*</span>
              </label>
              <input type="date" value={form.effectiveDate} onChange={e => up('effectiveDate', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Status <span className="text-slate-300">*</span>
            </label>
            <div className="flex gap-4">
              {[
                { val: 'DRAFT', label: 'Draft', desc: 'Hidden from organizations' },
                { val: 'ACTIVE', label: 'Active', desc: 'Visible to all organizations' }
              ].map(s => (
                <label key={s.val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="regStatus" checked={form.status === s.val}
                    onChange={() => up('status', s.val)} className="accent-slate-800" />
                  <div>
                    <p className="text-[12.5px] font-medium text-slate-800">{s.label}</p>
                    <p className="text-[10.5px] text-slate-400">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Regulation →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Control Form ─────────────────────────────────────────────────────────────
function ControlForm({ onClose, regulations, preselectedRegId }: {
  onClose: () => void
  regulations: any[]
  preselectedRegId?: string
}) {
  const [form, setForm] = useState({
    title: '', desc: '',
    regIds: preselectedRegId ? [preselectedRegId] : [] as string[],
    chapterId: '', section: '', applicableTo: 'BOTH', status: 'DRAFT'
  })
  const [actions, setActions] = useState<ActionEntry[]>([{
    id: '1', title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH'
  }])
  const { mutate: createControl, isPending } = useCreateControl()

  // Chapter dropdown state
  const firstRegId = form.regIds[0] ?? ''
  const { data: chaptersData, isLoading: chaptersLoading } = useRegulationChapters(firstRegId)
  const chapters = chaptersData ?? []
  const { mutate: createChapter, isPending: creatingChapter } = useCreateChapter()
  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')
  const [newChapterTitle, setNewChapterTitle] = useState('')

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
  const up = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const addAction = () => setActions(p => [...p, {
    id: String(Date.now()), title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH'
  }])
  const upAction = (id: string, k: string, v: any) =>
    setActions(p => p.map(a => a.id === id ? { ...a, [k]: v } : a))

  const handleSave = () => {
    if (!form.title || !form.desc || form.regIds.length === 0) {
      toast.error('Title, description and at least one regulation are required')
      return
    }
    if (actions.some(a => !a.title || !a.desc || a.evidenceTypes.length === 0)) {
      toast.error('All actions must have title, description and evidence types')
      return
    }
    createControl({
      title: form.title,
      description: form.desc,
      chapterId: form.chapterId || undefined,
      sectionReference: form.section || undefined,
      applicableTo: form.applicableTo as any,
      status: form.status as any,
      regulationIds: form.regIds,
      predefinedActions: actions.map((a, i) => ({
        title: a.title,
        description: a.desc,
        evidenceTypes: a.evidenceTypes as any[],
        suggestedDueDays: a.dueDays,
        priority: a.priority as any,
        orderIndex: i,
      })),
    }, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-50" onClick={onClose}>
      <div className="w-[860px] h-full bg-white border-l border-slate-100 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <p className="text-[15px] font-bold text-slate-900">Create Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Control Title <span className="text-slate-300">*</span>
            </label>
            <input value={form.title} onChange={e => up('title', e.target.value)}
              placeholder="e.g., Implement valid consent mechanism"
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-slate-300">*</span>
            </label>
            <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)}
              placeholder="Describe the control objective and requirements…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none transition-colors" />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Regulation(s) <span className="text-slate-300">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {regulations.map((r: any) => (
                <button key={r.id} onClick={() => up('regIds', toggleArr(form.regIds, r.id))}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border-2 transition-all ${
                    form.regIds.includes(r.id)
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}>
                  {r.shortCode}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">
              Select all regulations this control applies to.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Chapter
              </label>
              {form.regIds.length === 0 ? (
                <div className="h-10 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-400 flex items-center">
                  Select a regulation first
                </div>
              ) : chaptersLoading ? (
                <div className="h-10 px-3 rounded-lg border border-slate-200 flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[12px]">Loading chapters...</span>
                </div>
              ) : (
                <>
                  <select
                    value={form.chapterId}
                    onChange={e => {
                      if (e.target.value === '__new__') {
                        setShowNewChapter(true)
                      } else {
                        up('chapterId', e.target.value)
                        setShowNewChapter(false)
                      }
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white transition-colors">
                    <option value="">No chapter</option>
                    {chapters.map((ch: any) => (
                      <option key={ch.id} value={ch.id}>{ch.name}{ch.title ? ` — ${ch.title}` : ''}</option>
                    ))}
                    <option value="__new__">+ Add new chapter...</option>
                  </select>
                  {showNewChapter && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                      <input
                        value={newChapterName}
                        onChange={e => setNewChapterName(e.target.value)}
                        placeholder="Chapter name e.g. Chapter 2 *"
                        className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
                      <input
                        value={newChapterTitle}
                        onChange={e => setNewChapterTitle(e.target.value)}
                        placeholder="Optional title e.g. Obligations of Data Fiduciary"
                        className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!newChapterName.trim()) { toast.error('Chapter name is required'); return }
                            createChapter({ regulationId: firstRegId, name: newChapterName.trim(), title: newChapterTitle.trim() || undefined }, {
                              onSuccess: (data: any) => {
                                const newId = data?.data?.id
                                if (newId) up('chapterId', newId)
                                setShowNewChapter(false)
                                setNewChapterName('')
                                setNewChapterTitle('')
                              }
                            })
                          }}
                          disabled={creatingChapter}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-60">
                          {creatingChapter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Add
                        </button>
                        <button onClick={() => { setShowNewChapter(false); setNewChapterName(''); setNewChapterTitle('') }}
                          className="px-3 py-1.5 text-[11.5px] text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Section Reference
              </label>
              <input value={form.section} onChange={e => up('section', e.target.value)}
                placeholder="e.g., Section 4"
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Applicable To <span className="text-slate-300">*</span>
              </label>
              <select value={form.applicableTo} onChange={e => up('applicableTo', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white">
                <option value="DATA_FIDUCIARY">Data Fiduciary</option>
                <option value="SIGNIFICANT_DF">Significant Data Fiduciary</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <div className="flex gap-2">
              {['DRAFT', 'PUBLISHED'].map(s => (
                <button key={s} onClick={() => up('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    form.status === s
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Predefined Actions */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[13px] font-bold text-slate-800">Pre-defined Actions</p>
                <p className="text-[11px] text-slate-400">
                  Auto-created when this control is included in an assessment. At least one required.
                </p>
              </div>
              <button onClick={addAction}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div key={action.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11.5px] font-semibold text-slate-700">Action {idx + 1}</p>
                    {actions.length > 1 && (
                      <button onClick={() => setActions(p => p.filter(a => a.id !== action.id))}
                        className="text-[11px] text-slate-400 hover:text-slate-800 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                  <input value={action.title} onChange={e => upAction(action.id, 'title', e.target.value)}
                    placeholder="Action Title *"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 bg-white transition-colors" />
                  <textarea rows={2} value={action.desc} onChange={e => upAction(action.id, 'desc', e.target.value)}
                    placeholder="Detailed steps for the IT Admin to complete this action"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none bg-white transition-colors" />
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Expected Evidence Types <span className="text-slate-300">*</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {EVIDENCE_TYPES.map(t => (
                        <button key={t}
                          onClick={() => upAction(action.id, 'evidenceTypes',
                            action.evidenceTypes.includes(t)
                              ? action.evidenceTypes.filter((e: string) => e !== t)
                              : [...action.evidenceTypes, t]
                          )}
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium border transition-all ${
                            action.evidenceTypes.includes(t)
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                          }`}>
                          {EVIDENCE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Suggested Due Days <span className="text-slate-300">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={action.dueDays}
                          onChange={e => upAction(action.id, 'dueDays', Number(e.target.value))}
                          min={1} max={365}
                          className="w-20 h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white" />
                        <span className="text-[12px] text-slate-500">days from assignment</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Priority <span className="text-slate-300">*</span>
                      </label>
                      <div className="flex gap-2">
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                          <button key={p} onClick={() => upAction(action.id, 'priority', p)}
                            className={`px-2 py-1 rounded-md text-[10.5px] font-medium border transition-all ${
                              action.priority === p
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                            }`}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Control →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Control Detail Panel ─────────────────────────────────────────────────────
function ControlDetailPanel({
  control,
  onClose,
}: {
  control: any
  onClose: () => void
}) {
  const { mutate: publishControl, isPending: publishing } = usePublishControl()

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-amber-50 text-amber-700',
    HIGH: 'bg-orange-50 text-orange-700',
    CRITICAL: 'bg-red-50 text-red-700',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[480px] bg-white border-l border-slate-100 shadow-[0_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col"
        style={{ fontFamily: 'DM Sans, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-900 leading-snug mb-2">
              {control.title}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${
                control.status === 'PUBLISHED'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {control.status}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                {control.applicableTo === 'DATA_FIDUCIARY' ? 'Data Fiduciary'
                  : control.applicableTo === 'SIGNIFICANT_DF' ? 'Significant DF' : 'Both'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Section 1 — Basic Info */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Basic Info</p>

            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-[13px] text-slate-700 leading-relaxed">{control.description}</p>
            </div>

            {control.chapter?.name && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Chapter</p>
                <p className="text-[13px] text-slate-700">
                  {control.chapter.name}
                  {control.chapter.title && (
                    <span className="text-slate-400 ml-1">— {control.chapter.title}</span>
                  )}
                </p>
              </div>
            )}

            {control.sectionReference && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Section Reference</p>
                <p className="text-[13px] text-slate-700">{control.sectionReference}</p>
              </div>
            )}

            {control.regulationMappings?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Regulations</p>
                <div className="flex gap-1.5 flex-wrap">
                  {control.regulationMappings.map((m: any) => (
                    <span
                      key={m.regulation?.id ?? m.id}
                      className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                    >
                      {m.regulation?.shortCode}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2 — Pre-defined Actions */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Pre-defined Actions
              <span className="ml-2 font-semibold text-slate-300 normal-case tracking-normal">
                ({control.predefinedActions?.length ?? 0})
              </span>
            </p>

            {(control.predefinedActions ?? []).length === 0 ? (
              <p className="text-[12.5px] text-slate-400">No actions defined.</p>
            ) : (
              <div className="space-y-3">
                {(control.predefinedActions ?? []).map((action: any, idx: number) => (
                  <div
                    key={action.id}
                    className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12.5px] font-semibold text-slate-800 leading-snug">
                        <span className="text-slate-400 mr-1.5 font-normal text-[11px]">{idx + 1}.</span>
                        {action.title}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        PRIORITY_COLORS[action.priority] ?? 'bg-slate-100 text-slate-600'
                      }`}>
                        {action.priority}
                      </span>
                    </div>

                    <p className="text-[12px] text-slate-600 leading-relaxed">{action.description}</p>

                    {action.evidenceTypes?.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {action.evidenceTypes.map((t: string) => (
                          <span
                            key={t}
                            className="text-[10px] font-semibold px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded"
                          >
                            {EVIDENCE_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-slate-400">
                      Due within <span className="font-semibold text-slate-600">{action.suggestedDueDays} days</span> of assignment
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-slate-50/60">
          <button
            onClick={() => toast('Edit coming soon', { icon: 'ℹ️' })}
            className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Edit
          </button>
          {control.status === 'DRAFT' && (
            <button
              onClick={() =>
                publishControl(control.id, {
                  onSuccess: () => onClose(),
                })
              }
              disabled={publishing}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors"
            >
              {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : 'Publish Control'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Regulation Detail Page ───────────────────────────────────────────────────
function RegDetailPage({ reg, onBack, allControls }: {
  reg: any
  onBack: () => void
  allControls: any[]
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showControlForm, setShowControlForm] = useState(false)
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [existingSearch, setExistingSearch] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [addingControls, setAddingControls] = useState(false)
  const [selectedControl, setSelectedControl] = useState<any>(null)
  const { mutate: archiveReg } = useArchiveRegulation()
  const { mutate: publishControl } = usePublishControl()
  const { data: allControlsData } = useControls()
  const allControlsFromApi = allControlsData?.data ?? []

  const toggleChapter = (ch: string) => setExpandedChapters(p => {
    const n = new Set(p); n.has(ch) ? n.delete(ch) : n.add(ch); return n
  })

  const regControls = allControls.filter((c: any) =>
    c.regulationMappings?.some((m: any) => m.regulation?.id === reg.id)
  )

  const chapters = [...new Set(regControls.map((c: any) => c.chapter?.name).filter(Boolean))] as string[]

  const filteredControls = (chapter: string) => regControls.filter((c: any) =>
    c.chapter?.name === chapter &&
    (filterStatus === 'All' || c.status === filterStatus.toUpperCase()) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  )

  const uncategorized = regControls.filter((c: any) =>
    !c.chapter?.name &&
    (filterStatus === 'All' || c.status === filterStatus.toUpperCase()) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()))
  )

  const regControlIds = new Set(regControls.map((c: any) => c.id))
  const availableToAdd = allControlsFromApi.filter((c: any) =>
    !regControlIds.has(c.id) &&
    (existingSearch === '' || c.title.toLowerCase().includes(existingSearch.toLowerCase()))
  )

  const handleAddExistingControls = async () => {
    if (selectedToAdd.length === 0) return
    setAddingControls(true)
    try {
      await Promise.all(
        selectedToAdd.map(controlId =>
          apiClient.post(`/regulations/${reg.id}/controls`, { controlId })
        )
      )
      toast.success(`${selectedToAdd.length} control${selectedToAdd.length > 1 ? 's' : ''} added to regulation`)
      setShowAddExisting(false)
      setSelectedToAdd([])
      // Trigger re-fetch by navigating back briefly — queryClient is in parent scope
      // Parent will re-fetch allControls from useControls() which is already auto-invalidated
    } catch (err: any) {
      toast.error(err.message || 'Failed to add controls')
    } finally {
      setAddingControls(false)
    }
  }

  return (
    <div className="space-y-4">
      {selectedControl && (
        <ControlDetailPanel
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
        />
      )}
      {showControlForm && (
        <ControlForm
          onClose={() => setShowControlForm(false)}
          regulations={[reg]}
          preselectedRegId={reg.id}
        />
      )}

      {/* Add Existing Control Modal */}
      {showAddExisting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => { setShowAddExisting(false); setSelectedToAdd([]) }}>
          <div className="bg-white rounded-xl shadow-xl w-[680px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <div>
                <p className="text-[15px] font-bold text-slate-900">Add Existing Controls</p>
                <p className="text-[11.5px] text-slate-400 mt-0.5">
                  Link controls from the library to <strong className="text-slate-700">{reg.shortCode}</strong>
                </p>
              </div>
              <button onClick={() => { setShowAddExisting(false); setSelectedToAdd([]) }}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={existingSearch}
                  onChange={e => setExistingSearch(e.target.value)}
                  placeholder="Search controls..."
                  className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {availableToAdd.length === 0 ? (
                <div className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                  {existingSearch ? 'No controls match your search.' : 'All controls are already linked to this regulation.'}
                </div>
              ) : (
                availableToAdd.map((ctrl: any) => {
                  const isSelected = selectedToAdd.includes(ctrl.id)
                  return (
                    <div key={ctrl.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedToAdd(p =>
                        p.includes(ctrl.id) ? p.filter(id => id !== ctrl.id) : [...p, ctrl.id]
                      )}>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-semibold text-slate-800 truncate">{ctrl.title}</p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {ctrl.regulationMappings?.map((m: any) => (
                            <span key={m.regulation.id} className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                              {m.regulation.shortCode}
                            </span>
                          ))}
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>{ctrl.status}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center gap-3 flex-shrink-0 bg-slate-50/50">
              <span className="text-[12px] text-slate-400 flex-1">
                {selectedToAdd.length > 0
                  ? `${selectedToAdd.length} control${selectedToAdd.length > 1 ? 's' : ''} selected`
                  : 'Select controls to add'}
              </span>
              <button onClick={() => { setShowAddExisting(false); setSelectedToAdd([]) }}
                className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddExistingControls}
                disabled={selectedToAdd.length === 0 || addingControls}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-2">
                {addingControls
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</>
                  : `Add ${selectedToAdd.length > 0 ? selectedToAdd.length + ' ' : ''}Selected`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Regulations
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {reg.shortCode}
        </span>
        <span className="text-[13px] font-semibold text-slate-800">{reg.name}</span>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${
          reg.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}>{reg.status}</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {reg.name}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5 mb-3">{reg.description}</p>
            <div className="flex gap-6 text-[11.5px] text-slate-500 flex-wrap">
              {[
                ['Issuing Authority', reg.issuingAuthority],
                ['Jurisdiction', reg.jurisdiction],
                ['Effective Date', new Date(reg.effectiveDate).toLocaleDateString('en-IN')],
                ['Controls', String(regControls.length)],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-slate-400">{k}: </span>
                  <span className="font-medium text-slate-700">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 ml-4 flex-shrink-0">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Archive this regulation?')) archiveReg(reg.id)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-slate-800">
          Controls{' '}
          <span className="text-slate-400 font-normal text-[12px]">({regControls.length} controls)</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddExisting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            + Add Existing Control
          </button>
          <button onClick={() => setShowControlForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Create New Control
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none bg-white">
          {['All', 'Published', 'Draft'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {chapters.map(chapter => {
          const chControls = filteredControls(chapter)
          if (chControls.length === 0) return null
          const isOpen = expandedChapters.has(chapter)
          return (
            <div key={chapter} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <button onClick={() => toggleChapter(chapter)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <span className="text-[12.5px] font-bold text-slate-800 flex-1">{chapter}</span>
                <span className="text-[11px] text-slate-400">{chControls.length} controls</span>
              </button>
              {isOpen && (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left bg-white">
                      {['Control ID', 'Title', 'Applicable To', 'Actions', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-2 text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chControls.map((ctrl: any) => (
                      <tr key={ctrl.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {ctrl.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{ctrl.title}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                            {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'DF'
                              : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'SDF' : 'Both'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10.5px] font-medium">
                            {ctrl._count?.predefinedActions ?? ctrl.predefinedActions?.length ?? 0} actions
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ctrl.status === 'PUBLISHED'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>{ctrl.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedControl(ctrl)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              title="View detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {ctrl.status === 'DRAFT' && (
                              <button
                                onClick={() => publishControl(ctrl.id)}
                                className="text-[10.5px] text-slate-600 hover:text-slate-900 border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors">
                                Publish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )
        })}

        {uncategorized.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
              <span className="text-[12.5px] font-bold text-slate-800 flex-1">Uncategorized</span>
              <span className="text-[11px] text-slate-400">{uncategorized.length} controls</span>
            </div>
            <table className="w-full text-[12px]">
              <tbody>
                {uncategorized.map((ctrl: any) => (
                  <tr key={ctrl.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {ctrl.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{ctrl.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ctrl.status === 'PUBLISHED'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>{ctrl.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {regControls.length === 0 && (
          <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <p className="text-[13px] text-slate-400">No controls yet.</p>
            <button onClick={() => setShowControlForm(true)}
              className="mt-3 text-[12.5px] text-slate-600 font-medium underline hover:text-slate-900">
              Create the first control
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AdminControlsPage() {
  const [mainTab, setMainTab] = useState<'Regulations' | 'Controls'>('Regulations')
  const [showRegForm, setShowRegForm] = useState(false)
  const [showControlForm, setShowControlForm] = useState(false)
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterReg, setFilterReg] = useState('All')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [selectedControl, setSelectedControl] = useState<any>(null)

  const { data: regsData, isLoading: regsLoading } = useRegulations()
  const { data: controlsData, isLoading: controlsLoading } = useControls()
  const { mutate: publishControl } = usePublishControl()

  const regulations = regsData?.data ?? []
  const controls = controlsData?.data ?? []

  const toggleChapter = (key: string) => setExpandedChapters(p => {
    const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const selectedReg = regulations.find((r: any) => r.id === selectedRegId)
  if (selectedReg) {
    return (
      <RegDetailPage
        reg={selectedReg}
        onBack={() => setSelectedRegId(null)}
        allControls={controls}
      />
    )
  }

  const filteredControls = controls.filter((c: any) =>
    (filterReg === 'All' || c.regulationMappings?.some((m: any) => m.regulation?.shortCode === filterReg)) &&
    (c.title.toLowerCase().includes(search.toLowerCase()))
  )

  const groupedByReg = regulations.map((r: any) => ({
    reg: r,
    chapters: [...new Set(
      controls
        .filter((c: any) =>
          c.regulationMappings?.some((m: any) => m.regulation?.id === r.id) &&
          (filterReg === 'All' || filterReg === r.shortCode) &&
          c.title.toLowerCase().includes(search.toLowerCase())
        )
        .map((c: any) => c.chapter?.name || 'Uncategorized')
    )].map(ch => ({
      chapter: ch,
      controls: controls.filter((c: any) =>
        c.regulationMappings?.some((m: any) => m.regulation?.id === r.id) &&
        (c.chapter?.name || 'Uncategorized') === ch &&
        c.title.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter(ch => ch.controls.length > 0),
  })).filter(r => r.chapters.length > 0)

  const REG_COLORS: Record<string, string> = {
    DPDP: '#3B82F6', RBI: '#10B981', SEBI: '#8B5CF6',
    IRDAI: '#F97316', CERT: '#06B6D4',
  }

  const getRegColor = (shortCode: string) => {
    return REG_COLORS[shortCode] || '#64748b'
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {selectedControl && (
        <ControlDetailPanel
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
        />
      )}
      {showRegForm && <RegulationForm onClose={() => setShowRegForm(false)} />}
      {showControlForm && (
        <ControlForm
          onClose={() => setShowControlForm(false)}
          regulations={regulations}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: 'Sora, sans-serif' }}>
            Regulations & Controls
          </h1>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {regulations.length} regulations · {controls.length} controls in library
          </p>
        </div>
        {mainTab === 'Regulations' ? (
          <button onClick={() => setShowRegForm(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Create Regulation
          </button>
        ) : (
          <button onClick={() => setShowControlForm(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-[13px] font-medium rounded-lg transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Create Control
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-200 gap-0">
        {(['Regulations', 'Controls'] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`px-5 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px ${
              mainTab === tab
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Regulations Tab */}
      {mainTab === 'Regulations' && (
        <>
          {regsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px]">Loading regulations...</span>
            </div>
          ) : regulations.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-[14px] font-semibold text-slate-700">No regulations yet</p>
              <p className="text-[12px] text-slate-400 mt-1 mb-4">
                Create your first regulation to start building the control library
              </p>
              <button onClick={() => setShowRegForm(true)}
                className="px-4 py-2 bg-slate-900 text-white text-[13px] font-medium rounded-lg hover:bg-slate-800 transition-colors">
                Create First Regulation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {regulations.map((r: any) => {
                const color = getRegColor(r.shortCode)
                const regControls = controls.filter((c: any) =>
                  c.regulationMappings?.some((m: any) => m.regulation?.id === r.id)
                )
                return (
                  <div key={r.id}
                    className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all cursor-pointer group shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                    onClick={() => setSelectedRegId(r.id)}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}14` }}>
                        <Shield style={{ width: 18, height: 18, color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-bold text-slate-900 leading-tight">
                          {r.name}
                        </p>
                        <p className="text-[10.5px] text-slate-400 mt-0.5 line-clamp-2">
                          {r.description?.slice(0, 80)}…
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2">
                      <span className="font-semibold text-slate-700">{regControls.length} Controls</span>
                      <span>·</span>
                      <span>{r.jurisdiction}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] mb-3">
                      <span className="text-slate-500">{r.issuingAuthority}</span>
                      <span className="ml-auto flex items-center gap-1 font-semibold" style={{ color }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100"
                      onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { setMainTab('Controls'); setFilterReg(r.shortCode) }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <Eye className="w-3 h-3" /> View Controls
                      </button>
                      <button className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Controls Tab */}
      {mainTab === 'Controls' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…"
                className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilterReg('All')}
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                  filterReg === 'All'
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-200 text-slate-600 hover:border-slate-400'
                }`}>
                All
              </button>
              {regulations.map((r: any) => {
                const color = getRegColor(r.shortCode)
                return (
                  <button key={r.id}
                    onClick={() => setFilterReg(filterReg === r.shortCode ? 'All' : r.shortCode)}
                    className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${
                      filterReg === r.shortCode
                        ? 'text-white'
                        : 'border border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                    style={filterReg === r.shortCode ? { background: color } : {}}>
                    {r.shortCode}
                  </button>
                )
              })}
            </div>
            <span className="ml-auto text-[11px] text-slate-400 font-medium">
              {filteredControls.length} controls
            </span>
          </div>

          {controlsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[13px]">Loading controls...</span>
            </div>
          ) : groupedByReg.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <p className="text-[13px] text-slate-400">No controls found.</p>
            </div>
          ) : (
            groupedByReg.map(({ reg, chapters }) => {
              const color = getRegColor(reg.shortCode)
              return (
                <div key={reg.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                    <div className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: `${color}14` }}>
                      <Shield style={{ width: 12, height: 12, color }} />
                    </div>
                    <span className="text-[12.5px] font-bold text-slate-800">{reg.name}</span>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${color}14`, color }}>
                      {reg.shortCode}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {chapters.reduce((s, ch) => s + ch.controls.length, 0)} controls
                    </span>
                  </div>
                  {chapters.map(({ chapter, controls: chControls }) => {
                    const key = `${reg.id}-${chapter}`
                    const isOpen = expandedChapters.has(key)
                    return (
                      <div key={chapter} className="border-t border-slate-100">
                        <button onClick={() => toggleChapter(key)}
                          className="w-full flex items-center gap-3 px-5 py-2 hover:bg-slate-50 text-left transition-colors">
                          {isOpen
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-[12px] font-semibold text-slate-700 flex-1">{chapter}</span>
                          <span className="text-[11px] text-slate-400">{chControls.length} controls</span>
                        </button>
                        {isOpen && chControls.map((ctrl: any) => (
                          <div key={ctrl.id}
                            className="flex items-center gap-4 px-6 py-2.5 border-t border-slate-50 hover:bg-slate-50 transition-colors">
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex-shrink-0">
                              {ctrl.id.slice(0, 8)}
                            </span>
                            <p className="flex-1 text-[12px] font-medium text-slate-800">{ctrl.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                              {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'DF'
                                : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'SDF' : 'Both'}
                            </span>
                            <span className="text-[10.5px] text-slate-400">
                              {ctrl._count?.predefinedActions ?? ctrl.predefinedActions?.length ?? 0} actions
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ctrl.status === 'PUBLISHED'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>{ctrl.status}</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setSelectedControl(ctrl)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                title="View detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {ctrl.status === 'DRAFT' && (
                                <button
                                  onClick={() => publishControl(ctrl.id)}
                                  className="p-1 text-slate-400 hover:text-green-600 transition-colors"
                                  title="Publish">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}