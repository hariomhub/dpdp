import React, { useState } from 'react'
import {
  Plus, Shield, Scale, BarChart2, Search, Eye, Edit2, Archive,
  ChevronDown, ChevronRight, Trash2, X, ArrowLeft, Loader2, Check,
  AlertTriangle, FileText, Layers, Lock
} from 'lucide-react'
import {
  useRegulations,
  useCreateRegulation,
  useUpdateRegulation,
  useArchiveRegulation,
  useRegulationChapters,
  useCreateChapter,
  useUpdateChapter,
  useRegulationSections,
  useCreateSection,
} from '../../../hooks/useRegulations'
import {
  useControls, useControl,
  useCreateControl, usePublishControl,
  useDeleteControl, useUpdateAction,
  useRemovePredefinedAction, useSetActionProducts,
  useCreateMasterEvidence, useDeleteMasterEvidence,
} from '../../../hooks/useControls'
import { useProductFamilies, useAllProducts, useCreateProduct } from '../../../hooks/useProductFamilies'
import { useControlFamilies } from '../../../hooks/useControlFamilies'
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
  productIds: string[]   // IDs of products recommended for this action
}

// ─── ProductPicker ────────────────────────────────────────────────────────────
// Shown inside each action card. Two modes:
//   1. Browse Product Families (tree view)
//   2. Quick-add standalone product
function ProductPicker({ selected, onChange }: {
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const { data: families = [] } = useProductFamilies()
  const { data: allProducts = [] } = useAllProducts()
  const [mode, setMode] = useState<'family' | 'all'>('family')
  const [expandedFamily, setExpanded] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickName, setQuickName] = useState('')
  const [quickVendor, setQuickVendor] = useState('')
  const createProductMut = useCreateProduct()

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])

  const handleQuickAdd = async () => {
    if (!quickName.trim()) return
    const res: any = await createProductMut.mutateAsync({ name: quickName.trim(), vendor: quickVendor.trim() || undefined })
    if (res?.data?.id) toggle(res.data.id)
    setQuickName(''); setQuickVendor(''); setShowQuickAdd(false)
  }

  // Labels for selected products
  const selectedProducts = (allProducts as any[]).filter((p: any) => selected.includes(p.id))

  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
        Recommended Products
        <span className="ml-1 text-slate-400 font-normal normal-case">(tools that implement this action)</span>
      </label>

      {/* Selected chips */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedProducts.map((p: any) => (
            <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] rounded-full font-medium">
              {p.name}
              <button onClick={() => toggle(p.id)} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-2">
        {(['family', 'all'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-[11.5px] font-medium border-b-2 -mb-px transition-colors ${mode === m ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {m === 'family' ? '🗂 By Product Family' : '📋 All Products'}
          </button>
        ))}
      </div>

      {/* Family tree */}
      {mode === 'family' && (
        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
          {(families as any[]).length === 0 && (
            <p className="text-[11.5px] text-slate-400 py-2 text-center">No product families yet. Create them in Product Families.</p>
          )}
          {(families as any[]).map((fam: any) => (
            <div key={fam.id}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100">
                <button onClick={() => setExpanded(expandedFamily === fam.id ? null : fam.id)} className="p-0.5 hover:bg-slate-200 rounded">
                  <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${expandedFamily === fam.id ? 'rotate-90' : ''}`} />
                </button>
                <input
                  type="checkbox"
                  className="accent-slate-800 w-3.5 h-3.5 cursor-pointer"
                  checked={fam.products.length > 0 && fam.products.every((p: any) => selected.includes(p.id))}
                  ref={el => { if (el) el.indeterminate = fam.products.some((p: any) => selected.includes(p.id)) && !fam.products.every((p: any) => selected.includes(p.id)) }}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const ids = fam.products.map((p: any) => p.id);
                    if (checked) {
                      onChange(Array.from(new Set([...selected, ...ids])))
                    } else {
                      onChange(selected.filter(id => !ids.includes(id)))
                    }
                  }}
                />
                <button onClick={() => setExpanded(expandedFamily === fam.id ? null : fam.id)} className="flex-1 text-left flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-700">{fam.name}</span>
                  <span className="text-[10px] text-slate-400">{fam._count.products}</span>
                </button>
              </div>
              {expandedFamily === fam.id && fam.products.map((p: any) => (
                <label key={p.id} className="flex items-center gap-2.5 pl-7 pr-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)}
                    className="accent-slate-800 w-3.5 h-3.5" />
                  <span className="text-[12px] text-slate-700 flex-1">{p.name}</span>
                  {p.vendor && <span className="text-[10px] text-slate-400">{p.vendor}</span>}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* All products flat */}
      {mode === 'all' && (
        <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
          {(allProducts as any[]).map((p: any) => (
            <label key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)}
                className="accent-slate-800 w-3.5 h-3.5" />
              <span className="text-[12px] text-slate-700 flex-1">{p.name}</span>
              {p.productFamily && <span className="text-[10px] text-slate-400">{p.productFamily.name}</span>}
              {p.vendor && <span className="text-[10px] text-slate-400">{p.vendor}</span>}
            </label>
          ))}
        </div>
      )}

      {/* Quick-add standalone product */}
      {showQuickAdd ? (
        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-2 mt-1">
          <p className="text-[11px] font-semibold text-slate-600">Quick-add Product</p>
          <div className="flex gap-2">
            <input value={quickName} onChange={e => setQuickName(e.target.value)}
              placeholder="Product name *"
              className="flex-1 h-8 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-slate-700" />
            <input value={quickVendor} onChange={e => setQuickVendor(e.target.value)}
              placeholder="Vendor"
              className="w-32 h-8 px-2 rounded border border-slate-300 text-[12px] focus:outline-none focus:border-slate-700" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowQuickAdd(false); setQuickName(''); setQuickVendor('') }}
              className="px-2 py-1 text-[11.5px] border border-slate-300 rounded text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleQuickAdd} disabled={!quickName.trim() || createProductMut.isPending}
              className="px-3 py-1 text-[11.5px] bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
              {createProductMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Add &amp; Select →
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowQuickAdd(true)}
          className="text-[11.5px] text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1">
          <Plus className="w-3 h-3" /> Add product not in any family
        </button>
      )}
    </div>
  )
}

// ─── Edit Regulation Modal ────────────────────────────────────────────────────
function EditRegulationModal({ reg, onClose }: { reg: any; onClose: () => void }) {
  const [form, setForm] = useState({
    name:             reg.name        ?? '',
    issuingAuthority: reg.issuingAuthority ?? '',
    description:      reg.description ?? '',
    jurisdiction:     reg.jurisdiction ?? 'India',
    status:           reg.status      ?? 'DRAFT',
  })
  const { mutate: updateRegulation, isPending } = useUpdateRegulation()
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    updateRegulation({ id: reg.id, data: form as any }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <p className="text-[15px] font-bold text-slate-900">Edit Regulation</p>
            <p className="text-[11.5px] text-slate-400 mt-0.5">
              <span className="font-mono font-bold text-slate-600">{reg.shortCode}</span> · Short code cannot be changed
            </p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Name *</label>
            <input value={form.name} onChange={e => up('name', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Issuing Authority</label>
            <input value={form.issuingAuthority} onChange={e => up('issuingAuthority', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => up('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-[12.5px] resize-none focus:outline-none focus:border-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Jurisdiction</label>
              <select value={form.jurisdiction} onChange={e => up('jurisdiction', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-[13px] focus:outline-none focus:border-slate-800 bg-white">
                {['India','European Union','United States','United Kingdom','Singapore','Global'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Status</label>
              <div className="flex gap-2">
                {[
                  { val: 'DRAFT',     label: 'Draft',     color: 'bg-amber-50 text-amber-700 border-amber-300' },
                  { val: 'ACTIVE',    label: 'Active',    color: 'bg-green-50 text-green-700 border-green-300' },
                  { val: 'ARCHIVED',  label: 'Archived',  color: 'bg-slate-100 text-slate-600 border-slate-300' },
                ].map(s => (
                  <button key={s.val} onClick={() => up('status', s.val)}
                    className={`flex-1 h-10 rounded-lg text-[12px] font-semibold border-2 transition-all ${
                      form.status === s.val ? s.color + ' ring-2 ring-offset-1 ring-slate-400' : 'border-slate-200 text-slate-500 hover:border-slate-400'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Set to <strong>Active</strong> to make visible to tenant organizations.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 border border-slate-200 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── RegulationForm ───────────────────────────────────────────────────────────
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

// ─── Regulation Mapping Row ───────────────────────────────────────────────────
function RegulationMappingRow({ regulation, mapping, onChange }: {
  regulation: any
  mapping: { regulationId: string; chapterId: string; sectionId: string }
  onChange: (updates: Partial<typeof mapping>) => void
}) {
  const { data: chaptersData, isLoading } = useRegulationChapters(regulation.id)
  const chapters = chaptersData ?? []
  const { data: sectionsData } = useRegulationSections(regulation.id, mapping.chapterId)
  const sections = sectionsData ?? []

  const { mutate: createChapter, isPending: creatingChapter } = useCreateChapter()
  const { mutate: createSection, isPending: creatingSection } = useCreateSection()

  const [showNewChapter, setShowNewChapter] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [showNewSection, setShowNewSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionTitle, setNewSectionTitle] = useState('')

  return (
    <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3 relative">
      <p className="text-[13px] font-bold text-slate-800">{regulation.shortCode} <span className="font-normal text-slate-500">— {regulation.name}</span></p>
      <div className="grid grid-cols-2 gap-3">
        {/* Chapter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Chapter</label>
          {isLoading ? (
            <div className="h-9 px-3 rounded-lg border border-slate-200 flex items-center gap-2 text-slate-400 bg-white">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-[12px]">Loading...</span>
            </div>
          ) : (
            <>
              <select
                value={mapping.chapterId}
                onChange={e => {
                  if (e.target.value === '__new__') setShowNewChapter(true)
                  else { onChange({ chapterId: e.target.value, sectionId: '' }); setShowNewChapter(false) }
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white transition-colors">
                <option value="">No chapter</option>
                {chapters.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>{ch.name}{ch.title ? ` — ${ch.title}` : ''}</option>
                ))}
                <option value="__new__">+ Add new chapter...</option>
              </select>
              {showNewChapter && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <input value={newChapterName} onChange={e => setNewChapterName(e.target.value)} placeholder="Chapter name e.g. Chapter 2 *"
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] focus:outline-none focus:border-slate-800" />
                  <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} placeholder="Optional title e.g. Obligations"
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] focus:outline-none focus:border-slate-800" />
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!newChapterName.trim()) { toast.error('Chapter name is required'); return }
                      createChapter({ regulationId: regulation.id, name: newChapterName.trim(), title: newChapterTitle.trim() || undefined }, {
                        onSuccess: (data: any) => {
                          const newId = data?.data?.id
                          if (newId) onChange({ chapterId: newId, sectionId: '' })
                          setShowNewChapter(false); setNewChapterName(''); setNewChapterTitle('')
                        }
                      })
                    }} disabled={creatingChapter}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors disabled:opacity-60">
                      {creatingChapter ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
                    </button>
                    <button onClick={() => { setShowNewChapter(false); setNewChapterName(''); setNewChapterTitle('') }}
                      className="px-3 py-1.5 text-[11.5px] text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Section — dropdown with create new, loads when chapter is selected */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Section <span className="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          {!mapping.chapterId ? (
            <div className="h-9 px-3 rounded-lg border border-slate-200 flex items-center text-slate-400 bg-slate-100 text-[12px]">
              Select chapter first
            </div>
          ) : (
            <>
              <select
                value={mapping.sectionId}
                onChange={e => {
                  if (e.target.value === '__new__') setShowNewSection(true)
                  else { onChange({ sectionId: e.target.value }); setShowNewSection(false) }
                }}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white transition-colors">
                <option value="">No section</option>
                {(sections as any[]).map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}{s.title ? ` — ${s.title}` : ''}</option>
                ))}
                <option value="__new__">+ Add new section...</option>
              </select>
              {showNewSection && (
                <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <input value={newSectionName} onChange={e => setNewSectionName(e.target.value)} placeholder="Section name e.g. Section 6 *"
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] focus:outline-none focus:border-slate-800" />
                  <input value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="Optional title e.g. Consent"
                    className="w-full h-8 px-2.5 rounded-md border border-slate-200 text-[12px] focus:outline-none focus:border-slate-800" />
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (!newSectionName.trim()) { toast.error('Section name is required'); return }
                      createSection({ regulationId: regulation.id, chapterId: mapping.chapterId, name: newSectionName.trim(), title: newSectionTitle.trim() || undefined }, {
                        onSuccess: (data: any) => {
                          const newId = data?.data?.id
                          if (newId) onChange({ sectionId: newId })
                          setShowNewSection(false); setNewSectionName(''); setNewSectionTitle('')
                        }
                      })
                    }} disabled={creatingSection}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60">
                      {creatingSection ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
                    </button>
                    <button onClick={() => { setShowNewSection(false); setNewSectionName(''); setNewSectionTitle('') }}
                      className="px-3 py-1.5 text-[11.5px] text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Control Form ─────────────────────────────────────────────────────────────
export function ControlForm({ onClose, regulations, preselectedRegId }: {
  onClose: () => void
  regulations: any[]
  preselectedRegId?: string
}) {
  const [form, setForm] = useState({
    title: '', desc: '',
    mappings: (preselectedRegId
      ? [{ regulationId: preselectedRegId, chapterId: '', sectionId: '' }]
      : []) as Array<{ regulationId: string; chapterId: string; sectionId: string }>,
    applicableTo: 'BOTH', status: 'DRAFT'
  })
  const [actions, setActions] = useState<ActionEntry[]>([{
    id: '1', title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH', productIds: []
  }])
  const { mutate: createControl, isPending } = useCreateControl()

  const toggleReg = (regId: string) => {
    setForm(p => {
      const exists = p.mappings.find(m => m.regulationId === regId)
      if (exists) return { ...p, mappings: p.mappings.filter(m => m.regulationId !== regId) }
      return { ...p, mappings: [...p.mappings, { regulationId: regId, chapterId: '', sectionId: '' }] }
    })
  }

  const updateMapping = (regId: string, updates: Partial<{ chapterId: string; sectionId: string }>) => {
    setForm(p => ({
      ...p,
      mappings: p.mappings.map(m => m.regulationId === regId ? { ...m, ...updates } : m)
    }))
  }

  const up = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))
  const addAction = () => setActions(p => [...p, {
    id: String(Date.now()), title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH', productIds: []
  }])
  const upAction = (id: string, k: string, v: any) =>
    setActions(p => p.map(a => a.id === id ? { ...a, [k]: v } : a))

  const handleSave = () => {
    if (!form.title || !form.desc || form.mappings.length === 0) {
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
      applicableTo: form.applicableTo as any,
      status: form.status as any,
      regulationMappings: form.mappings.map(m => ({
        regulationId: m.regulationId,
        chapterId: m.chapterId || undefined,
        sectionId: m.sectionId || undefined,
      })),
      predefinedActions: actions.map((a, i) => ({
        title: a.title,
        description: a.desc,
        evidenceTypes: a.evidenceTypes as any[],
        suggestedDueDays: a.dueDays,
        priority: a.priority as any,
        orderIndex: i,
        productIds: a.productIds,
      })),
    }, {
      onSuccess: () => onClose(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-end z-[60]" onClick={onClose}>
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
                <button key={r.id} onClick={() => toggleReg(r.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border-2 transition-all ${
                    form.mappings.some(m => m.regulationId === r.id)
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

          {/* Per-regulation chapter + section sub-forms */}
          {form.mappings.length > 0 ? (
            <div className="space-y-3">
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide">
                Categorization per Regulation
              </label>
              {form.mappings.map(mapping => {
                const reg = regulations.find((r: any) => r.id === mapping.regulationId)
                if (!reg) return null
                return (
                  <RegulationMappingRow
                    key={mapping.regulationId}
                    regulation={reg}
                    mapping={mapping}
                    onChange={updates => updateMapping(mapping.regulationId, updates)}
                  />
                )
              })}
            </div>
          ) : (
            <div className="p-6 border-2 border-dashed border-slate-100 rounded-xl text-center">
              <p className="text-[12.5px] text-slate-400">Select at least one regulation above to categorize this control.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Status
              </label>
              <div className="flex gap-2">
                {['DRAFT', 'PUBLISHED'].map(s => (
                  <button key={s} onClick={() => up('status', s)}
                    className={`flex-1 h-10 rounded-lg text-[12px] font-medium border transition-all ${
                      form.status === s
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
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
                          className={`px-2 py-0.5 rounded-md text-[10.5px] font-medium border transition-all ${action.evidenceTypes.includes(t)
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
                            className={`px-2 py-1 rounded-md text-[10.5px] font-medium border transition-all ${action.priority === p
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'border-slate-200 text-slate-600 hover:border-slate-400 bg-white'
                              }`}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Product Picker */}
                  <div className="pt-2 border-t border-slate-200">
                    <ProductPicker
                      selected={action.productIds}
                      onChange={ids => upAction(action.id, 'productIds', ids)}
                    />
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
  const { data: freshData } = useControl(control.id)
  const ctrl = (freshData as any)?.data ?? control

  const { mutate: publishControl,    isPending: publishing }   = usePublishControl()
  const { mutate: deleteControl,     isPending: deleting }     = useDeleteControl()
  const { mutate: removeAction,      isPending: removingAction } = useRemovePredefinedAction()
  const { mutate: setActionProducts, isPending: settingProds } = useSetActionProducts()
  const { mutate: createEvidence,    isPending: creatingEv }   = useCreateMasterEvidence()
  const { mutate: deleteEvidence,    isPending: deletingEv }   = useDeleteMasterEvidence()

  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [editingAction,    setEditingAction]    = useState<string | null>(null)
  const [managingProducts, setManagingProducts] = useState<string | null>(null)
  const [uploadingEv,      setUploadingEv]      = useState<{ actionId: string; productId: string } | null>(null)
  const [evTitle,          setEvTitle]          = useState('')
  const [evDesc,           setEvDesc]           = useState('')
  const [evFile,           setEvFile]           = useState<File | null>(null)

  const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-amber-50 text-amber-700',
    HIGH: 'bg-orange-50 text-orange-700', CRITICAL: 'bg-red-50 text-red-700',
  }

  const handleDeleteControl = () => {
    deleteControl(ctrl.id, { onSuccess: onClose })
  }

  const handleUploadEvidence = (actionId: string, productId: string) => {
    if (!evTitle.trim()) { toast.error('Title is required'); return }
    createEvidence({ controlId: ctrl.id, actionId, productId, title: evTitle, description: evDesc, file: evFile ?? undefined }, {
      onSuccess: () => { setUploadingEv(null); setEvTitle(''); setEvDesc(''); setEvFile(null) }
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[560px] bg-white border-l border-slate-100 shadow-[0_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-slate-900 leading-snug mb-2">{ctrl.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-bold ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {ctrl.status}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'Data Fiduciary' : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'Significant DF' : 'Both'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 flex-shrink-0 mt-0.5"><X className="w-4 h-4" /></button>
        </div>

        {/* Delete confirm banner */}
        {confirmDelete && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-200 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-[12.5px] text-red-700 flex-1">Delete this control? This cannot be undone and will remove all regulation mappings.</p>
            <button onClick={handleDeleteControl} disabled={deleting}
              className="px-3 py-1 bg-red-600 text-white text-[12px] font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-1">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Confirm Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 border border-red-200 text-red-600 text-[12px] rounded-lg hover:bg-red-100">Cancel</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Basic info */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</p>
            <p className="text-[13px] text-slate-700 leading-relaxed">{ctrl.description}</p>
            {ctrl.regulationMappings?.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Mapped Regulations</p>
                <div className="flex gap-1.5 flex-wrap">
                  {ctrl.regulationMappings.map((m: any) => (
                    <span key={m.regulation?.id ?? m.id} className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {m.regulation?.shortCode}
                      {m.chapter?.name && <span className="text-blue-400 font-normal"> · {m.chapter.name}</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions — full manage */}
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Predefined Actions <span className="ml-1 text-slate-300">({ctrl.predefinedActions?.length ?? 0})</span>
              </p>
            </div>

            {(ctrl.predefinedActions ?? []).length === 0 && (
              <p className="text-[12.5px] text-slate-400">No actions defined.</p>
            )}

            {(ctrl.predefinedActions ?? []).map((action: any, idx: number) => (
              <div key={action.id} className="border border-slate-200 rounded-xl overflow-hidden">

                {/* Action header */}
                <div className="p-3.5 bg-slate-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-slate-800 leading-snug flex-1">
                      <span className="text-slate-400 mr-1.5 font-normal text-[11px]">{idx + 1}.</span>
                      {action.title}
                    </p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[action.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                        {action.priority}
                      </span>
                      <button onClick={() => removeAction({ controlId: ctrl.id, actionId: action.id })}
                        disabled={removingAction}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-600 leading-relaxed">{action.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {action.evidenceTypes?.map((t: string) => (
                      <span key={t} className="text-[10px] font-semibold px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded">
                        {EVIDENCE_LABELS[t] ?? t}
                      </span>
                    ))}
                    <span className="text-[11px] text-slate-400">Due: {action.suggestedDueDays}d</span>
                  </div>
                </div>

                {/* Products section */}
                <div className="p-3.5 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Products</p>
                    <button onClick={() => setManagingProducts(managingProducts === action.id ? null : action.id)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-medium">
                      {managingProducts === action.id ? 'Done' : '+ Manage Products'}
                    </button>
                  </div>

                  {/* Current products */}
                  {action.products?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {action.products.map((ap: any) => (
                        <span key={ap.product?.id ?? ap.productId} className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {ap.product?.name ?? 'Product'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-slate-400">No products assigned</p>
                  )}

                  {/* Product picker */}
                  {managingProducts === action.id && (
                    <div className="mt-2 p-3 bg-white border border-slate-200 rounded-lg">
                      <ProductPicker
                        selected={(action.products ?? []).map((ap: any) => ap.productId ?? ap.product?.id)}
                        onChange={ids => setActionProducts({ controlId: ctrl.id, actionId: action.id, productIds: ids })}
                      />
                    </div>
                  )}
                </div>

                {/* Master Evidence section per product */}
                {action.products?.length > 0 && (
                  <div className="p-3.5 border-t border-slate-100 space-y-3">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Master Evidence</p>

                    {action.products.map((ap: any) => {
                      const productId   = ap.productId ?? ap.product?.id
                      const productName = ap.product?.name ?? 'Product'
                      const evidences   = ap.masterEvidences ?? []
                      const isUploading = uploadingEv?.actionId === action.id && uploadingEv?.productId === productId

                      return (
                        <div key={productId} className="space-y-2">
                          <p className="text-[11.5px] font-semibold text-slate-700">{productName}</p>

                          {evidences.length > 0 ? (
                            <div className="space-y-1">
                              {evidences.map((ev: any) => (
                                <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px] font-medium text-slate-800 truncate">{ev.title}</p>
                                    {ev.fileName && <p className="text-[10.5px] text-slate-400">{ev.fileName}</p>}
                                  </div>
                                  <button onClick={() => deleteEvidence({ controlId: ctrl.id, actionId: action.id, productId, evidenceId: ev.id })}
                                    disabled={deletingEv}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400">No master evidence yet</p>
                          )}

                          {isUploading ? (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                              <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Evidence title *"
                                className="w-full h-8 px-2.5 rounded border border-slate-200 text-[12px] focus:outline-none focus:border-blue-500" />
                              <input value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Description (optional)"
                                className="w-full h-8 px-2.5 rounded border border-slate-200 text-[12px] focus:outline-none focus:border-blue-500" />
                              <input type="file" onChange={e => setEvFile(e.target.files?.[0] ?? null)}
                                className="w-full text-[11.5px] text-slate-600" />
                              <div className="flex gap-2">
                                <button onClick={() => { setUploadingEv(null); setEvTitle(''); setEvDesc(''); setEvFile(null) }}
                                  className="px-2.5 py-1 text-[11.5px] border border-slate-200 rounded text-slate-500 hover:bg-slate-50">Cancel</button>
                                <button onClick={() => handleUploadEvidence(action.id, productId)} disabled={creatingEv || !evTitle.trim()}
                                  className="flex-1 py-1 text-[11.5px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1">
                                  {creatingEv ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setUploadingEv({ actionId: action.id, productId }); setEvTitle(''); setEvDesc(''); setEvFile(null) }}
                              className="text-[11.5px] text-blue-600 hover:text-blue-700 flex items-center gap-1">
                              <Plus className="w-3 h-3" /> Add Master Evidence
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-slate-50/60">
          <button onClick={() => setConfirmDelete(true)} disabled={confirmDelete || deleting}
            className="px-3 py-2 border border-red-200 text-[12.5px] text-red-500 rounded-lg hover:bg-red-50 transition-colors">
            Delete
          </button>
          {ctrl.status === 'DRAFT' && (
            <button onClick={() => publishControl(ctrl.id, { onSuccess: onClose })} disabled={publishing}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[13px] font-semibold rounded-lg transition-colors">
              {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : 'Publish Control'}
            </button>
          )}
          {ctrl.status === 'PUBLISHED' && (
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[12px] text-green-600 font-semibold">
              <Check className="w-4 h-4" /> Published
            </span>
          )}
        </div>
      </div>
    </>
  )
}



function ControlCard({ ctrl, onSelect, onPublish }: { ctrl: any, onSelect: () => void, onPublish: () => void }) {
  return (
    <div className="bg-[#fcfdfd] border border-slate-200/80 rounded-xl p-4 flex flex-col hover:border-slate-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all group shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[10.5px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {ctrl.id.slice(0, 8)}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${ctrl.status === 'PUBLISHED'
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
          }`}>{ctrl.status}</span>
      </div>
      
      <h3 className="text-[13px] font-semibold text-slate-900 mb-3 line-clamp-2 leading-snug flex-1" title={ctrl.title}>
        {ctrl.title}
      </h3>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[10px] px-2 py-1 bg-slate-50 text-slate-600 rounded-lg font-medium border border-slate-100 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-400" />
          {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'Data Fiduciary'
            : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'Significant DF' : 'Both'}
        </span>
        <span className="text-[10px] px-2 py-1 bg-blue-50/50 text-blue-700 rounded-lg font-medium border border-blue-100/50 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-blue-400" />
          {ctrl._count?.predefinedActions ?? ctrl.predefinedActions?.length ?? 0} actions
        </span>
      </div>
      
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-auto">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg transition-colors border border-slate-200">
          <Eye className="w-3.5 h-3.5" /> View Details
        </button>
        {ctrl.status === 'DRAFT' && (
          <button
            onClick={onPublish}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-lg transition-colors">
            Publish
          </button>
        )}
      </div>
    </div>
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
  const [filterChapter, setFilterChapter] = useState('All')
  const [filterSection, setFilterSection] = useState('All')
  const [showControlForm, setShowControlForm] = useState(false)
  const [showEditReg, setShowEditReg] = useState(false)
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [addExistingMode, setAddExistingMode] = useState<'family' | 'all'>('family')
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [existingSearch, setExistingSearch] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [addingControls, setAddingControls] = useState(false)
  const [selectedControl, setSelectedControl] = useState<any>(null)
  const { mutate: archiveReg } = useArchiveRegulation()
  const { mutate: publishControl } = usePublishControl()
  const { data: allControlsData } = useControls()
  const allControlsFromApi = allControlsData?.data ?? []
  const { data: controlFamiliesData = [] } = useControlFamilies()
  const { data: regChapters = [] } = useRegulationChapters(reg.id)
  const updateChapterMut = useUpdateChapter()
  const [showChapters, setShowChapters] = useState(false)

  const toggleChapter = (ch: string) => setExpandedChapters(p => {
    const n = new Set(p); n.has(ch) ? n.delete(ch) : n.add(ch); return n
  })

  const regControls = allControls.filter((c: any) =>
    c.regulationMappings?.some((m: any) => m.regulation?.id === reg.id)
  )

  const getChapterName = (c: any) => c.regulationMappings?.find((m: any) => m.regulation?.id === reg.id)?.chapter?.name
  const getSectionName = (c: any) => c.regulationMappings?.find((m: any) => m.regulation?.id === reg.id)?.section?.name

  const chapters = [...new Set(regControls.map(getChapterName).filter(Boolean))] as string[]

  const filteredControls = (chapter: string) => regControls.filter((c: any) =>
    getChapterName(c) === chapter &&
    (filterStatus === 'All' || c.status === filterStatus.toUpperCase()) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase())) &&
    (filterSection === 'All' || getSectionName(c) === filterSection)
  )

  const uncategorized = regControls.filter((c: any) =>
    !getChapterName(c) &&
    (filterStatus === 'All' || c.status === filterStatus.toUpperCase()) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase())) &&
    (filterSection === 'All' || getSectionName(c) === filterSection)
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
      {showEditReg && <EditRegulationModal reg={reg} onClose={() => setShowEditReg(false)} />}

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
            <div className="px-5 pt-3 pb-2 border-b border-slate-100 flex-shrink-0 space-y-2">
              {/* Mode tabs */}
              <div className="flex gap-1">
                {(['family', 'all'] as const).map(m => (
                  <button key={m}
                    onClick={() => setAddExistingMode(m)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${addExistingMode === m ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {m === 'family' ? '🗂 Browse by Control Family' : '📋 All Controls'}
                  </button>
                ))}
              </div>
              {addExistingMode === 'all' && (
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={existingSearch}
                    onChange={e => setExistingSearch(e.target.value)}
                    placeholder="Search controls..."
                    className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {/* ── Family browser ── */}
              {addExistingMode === 'family' && (
                <div className="p-3 space-y-1">
                  {(controlFamiliesData as any[])?.length === 0 && (
                    <p className="text-center text-[12px] text-slate-400 py-8">No control families defined yet. Create them in Control Families.</p>
                  )}
                  {(controlFamiliesData as any[] ?? []).map((fam: any) => {
                    const famKey = `fam-${fam.id}`
                    const famOpen = expandedChapters.has(famKey)
                    const famControls = fam.controls
                      .map((m: any) => m.control)
                      .filter((c: any) => !regControlIds.has(c.id))
                    return (
                      <div key={fam.id} className="border border-slate-200 rounded-lg overflow-hidden">
                        <button onClick={() => toggleChapter(famKey)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left">
                          {famOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-[18px]">{fam.icon ?? '🔒'}</span>
                          <span className="text-[13px] font-bold text-slate-800 flex-1">{fam.name}</span>
                          <span className="text-[10.5px] text-slate-400">{famControls.length} available</span>
                        </button>
                        {famOpen && famControls.map((ctrl: any) => {
                          const isSelected = selectedToAdd.includes(ctrl.id)
                          return (
                            <div key={ctrl.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedToAdd(p => p.includes(ctrl.id) ? p.filter(id => id !== ctrl.id) : [...p, ctrl.id])}>
                              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <p className="text-[12.5px] font-medium text-slate-800 flex-1">{ctrl.title}</p>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{ctrl.status}</span>
                            </div>
                          )
                        })}
                        {famOpen && famControls.length === 0 && (
                          <p className="px-4 py-3 text-[12px] text-slate-400">All controls from this family are already in this regulation.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* ── All Controls flat list ── */}
              {addExistingMode === 'all' && (
                availableToAdd.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[12.5px] text-slate-400">
                    {existingSearch ? 'No controls match your search.' : 'All controls are already linked to this regulation.'}
                  </div>
                ) : availableToAdd.map((ctrl: any) => {
                  const isSelected = selectedToAdd.includes(ctrl.id)
                  return (
                    <div key={ctrl.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedToAdd(p =>
                        p.includes(ctrl.id) ? p.filter(id => id !== ctrl.id) : [...p, ctrl.id]
                      )}>
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
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
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
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
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full font-semibold ${reg.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
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
            <button onClick={() => setShowEditReg(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
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

      {/* Chapters — mark a chapter mandatory to lock its controls from exclusion in tenant assessments */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
        <button onClick={() => setShowChapters(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
          {showChapters ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
          <span className="text-[13px] font-semibold text-slate-800 flex-1">Chapters</span>
          <span className="text-[11.5px] text-slate-400">{regChapters.length} chapter{regChapters.length !== 1 ? 's' : ''}</span>
        </button>
        {showChapters && (
          <div className="border-t border-slate-100 divide-y divide-slate-50">
            {regChapters.length === 0 ? (
              <p className="text-[12px] text-slate-400 italic px-4 py-4">No chapters defined for this regulation yet.</p>
            ) : (
              [...regChapters].sort((a: any, b: any) => a.orderIndex - b.orderIndex).map((ch: any) => (
                <div key={ch.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-800">
                      {ch.name}{ch.title && <span className="text-slate-400 font-normal"> — {ch.title}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{ch._count?.controlMappings ?? 0} control{(ch._count?.controlMappings ?? 0) !== 1 ? 's' : ''}</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer flex-shrink-0" title="Controls under a mandatory chapter cannot be excluded when a tenant creates an assessment">
                    <span className={`flex items-center gap-1 text-[11.5px] font-medium ${ch.isMandatory ? 'text-amber-700' : 'text-slate-400'}`}>
                      <Lock className="w-3 h-3" /> Mandatory
                    </span>
                    <div onClick={() => updateChapterMut.mutate({ regulationId: reg.id, chapterId: ch.id, data: { isMandatory: !ch.isMandatory } })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${ch.isMandatory ? 'bg-amber-500' : 'bg-slate-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${ch.isMandatory ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>
              ))
            )}
          </div>
        )}
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

      <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-[12.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
        </div>
        <select value={filterChapter} onChange={e => { setFilterChapter(e.target.value); setFilterSection('All'); }}
          className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none bg-white min-w-[140px]">
          <option value="All">All Chapters</option>
          {chapters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
          className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none bg-white min-w-[140px]"
          disabled={filterChapter === 'All' && chapters.length > 0}>
          <option value="All">All Sections</option>
          {[...new Set(regControls.filter((c: any) => filterChapter === 'All' || getChapterName(c) === filterChapter).map(getSectionName).filter(Boolean))].map(s => (
            <option key={s as string} value={s as string}>{s as string}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-8 px-2 rounded-lg border border-slate-200 text-[12px] text-slate-700 focus:outline-none bg-white min-w-[110px]">
          {['All', 'Published', 'Draft'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div className="space-y-4 mt-4">
        {chapters.filter(ch => filterChapter === 'All' || ch === filterChapter).map(chapter => {
          const chControls = filteredControls(chapter)
          if (chControls.length === 0) return null
          const isOpen = expandedChapters.has(chapter)

          const sectionsMap = new Map<string, any[]>()
          chControls.forEach((c: any) => {
            const sec = getSectionName(c) || 'Uncategorized Section'
            if (!sectionsMap.has(sec)) sectionsMap.set(sec, [])
            sectionsMap.get(sec)!.push(c)
          })

          return (
            <div key={chapter} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <button onClick={() => toggleChapter(chapter)}
                className="w-full flex items-center gap-3 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-b border-slate-100/50">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-slate-500" />
                  : <ChevronRight className="w-4 h-4 text-slate-500" />}
                <span className="text-[14px] font-bold text-slate-800 flex-1">{chapter}</span>
                <span className="text-[11.5px] font-semibold text-slate-500 px-2 py-0.5 rounded-lg bg-slate-200/50">{chControls.length} controls</span>
              </button>
              {isOpen && (
                <div className="p-5 space-y-8 bg-slate-50/30">
                  {Array.from(sectionsMap.entries()).map(([secName, secControls]) => (
                    <div key={secName}>
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="h-4 w-1 bg-slate-800 rounded-full"></div>
                        <h4 className="text-[13.5px] font-bold text-slate-700 flex-1">{secName}</h4>
                        <span className="text-[11px] font-medium text-slate-400">{secControls.length} controls</span>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {secControls.map((ctrl: any) => (
                          <ControlCard key={ctrl.id} ctrl={ctrl}
                            onSelect={() => setSelectedControl(ctrl)}
                            onPublish={() => publishControl(ctrl.id)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {uncategorized.length > 0 && (
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
              <span className="text-[14px] font-bold text-slate-800 flex-1">Uncategorized Controls</span>
              <span className="text-[11.5px] font-semibold text-slate-500 px-2 py-0.5 rounded-lg bg-slate-200/50">{uncategorized.length} controls</span>
            </div>
            <div className="p-5 bg-slate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {uncategorized.map((ctrl: any) => (
                  <ControlCard key={ctrl.id} ctrl={ctrl}
                    onSelect={() => setSelectedControl(ctrl)}
                    onPublish={() => publishControl(ctrl.id)} />
                ))}
              </div>
            </div>
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

  const { data: regsData, isLoading: regsLoading } = useRegulations({ limit: 1000 })
  const { data: controlsData, isLoading: controlsLoading } = useControls({ limit: 1000 })
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

  const groupedByReg = regulations.map((r: any) => {
    const getCh = (c: any) => c.regulationMappings?.find((m: any) => m.regulation?.id === r.id)?.chapter?.name || 'Uncategorized'
    return {
    reg: r,
    chapters: [...new Set(
      controls
        .filter((c: any) =>
          c.regulationMappings?.some((m: any) => m.regulation?.id === r.id) &&
          (filterReg === 'All' || filterReg === r.shortCode) &&
          c.title.toLowerCase().includes(search.toLowerCase())
        )
        .map(getCh)
    )].map(ch => ({
      chapter: ch,
      controls: controls.filter((c: any) =>
        c.regulationMappings?.some((m: any) => m.regulation?.id === r.id) &&
        getCh(c) === ch &&
        c.title.toLowerCase().includes(search.toLowerCase())
      ),
    })).filter((ch: any) => ch.controls.length > 0),
  }}).filter((r: any) => r.chapters.length > 0)

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
            className={`px-5 py-2 text-[12.5px] font-medium border-b-2 transition-colors -mb-px ${mainTab === tab
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
                      <button onClick={() => { setSelectedRegId(r.id) }} className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Open to edit">
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
                className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${filterReg === 'All'
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
                    className={`px-3 py-1 rounded-full text-[11.5px] font-medium transition-all ${filterReg === r.shortCode
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
                        {isOpen && (() => {
                          const sectionsMap = new Map<string, any[]>()
                          chControls.forEach((c: any) => {
                            const sec = c.regulationMappings?.find((m: any) => m.regulation?.id === reg.id)?.section?.name || 'Uncategorized Section'
                            if (!sectionsMap.has(sec)) sectionsMap.set(sec, [])
                            sectionsMap.get(sec)!.push(c)
                          })

                          return Array.from(sectionsMap.entries()).map(([secName, secControls]) => {
                            const secKey = `${reg.id}-${chapter}-${secName}`
                            const secIsOpen = expandedChapters.has(secKey)
                            return (
                              <div key={secName} className="border-t border-slate-50 bg-slate-50/30">
                                <button onClick={() => toggleChapter(secKey)}
                                  className="w-full flex items-center gap-2 pl-9 pr-5 py-1.5 hover:bg-slate-50 text-left transition-colors">
                                  {secIsOpen
                                    ? <ChevronDown className="w-3 h-3 text-slate-400" />
                                    : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                  <span className="text-[11.5px] font-medium text-slate-600 flex-1">{secName}</span>
                                  <span className="text-[10px] text-slate-400">{secControls.length}</span>
                                </button>
                                {secIsOpen && secControls.map((ctrl: any) => (
                                  <div key={ctrl.id}
                                    className="flex items-center gap-4 pl-14 pr-6 py-2 border-t border-slate-50 hover:bg-white transition-colors bg-white/50">
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
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ctrl.status === 'PUBLISHED'
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
                          })
                        })()}
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