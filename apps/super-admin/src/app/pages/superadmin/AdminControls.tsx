import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import {
  Plus, Shield, Scale, BarChart2, Search, Eye, Edit2, Archive,
  ChevronDown, ChevronRight, Trash2, X, ArrowLeft, Loader2, Check,
  AlertTriangle, FileText, Layers, GitMerge
} from 'lucide-react'
import {
  useRegulations,
  useCreateRegulation,
  useUpdateRegulation,
  useArchiveRegulation,
  useDeleteRegulation,
  useRegulationNodes,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
  useApplicabilityCategories,
  useCreateApplicabilityCategory,
  useDeleteApplicabilityCategory,
  RegNode,
  ApplicabilityCategory,
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
import { useMasterControls, useSetControlMasterLink } from '../../../hooks/useMasterControls'
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
      <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide">
        Recommended Products
        <span className="ml-1 text-slate-400 font-normal normal-case">(tools that implement this action)</span>
      </label>

      {/* Selected chips */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedProducts.map((p: any) => (
            <span key={p.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[13px] rounded-full font-medium">
              {p.name}
              <button onClick={() => toggle(p.id)} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 border-b border-[#64748B]/20 mb-2">
        {(['family', 'all'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-3 py-1.5 text-[13.5px] font-medium border-b-2 -mb-px transition-colors ${mode === m ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {m === 'family' ? '🗂 By Product Family' : '📋 All Products'}
          </button>
        ))}
      </div>

      {/* Family tree */}
      {mode === 'family' && (
        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
          {(families as any[]).length === 0 && (
            <p className="text-[13.5px] text-slate-400 py-2 text-center">No product families yet. Create them in Product Families.</p>
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
                  <span className="text-[14px] font-semibold text-slate-700">{fam.name}</span>
                  <span className="text-[12px] text-slate-400">{fam._count.products}</span>
                </button>
              </div>
              {expandedFamily === fam.id && fam.products.map((p: any) => (
                <label key={p.id} className="flex items-center gap-2.5 pl-7 pr-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)}
                    className="accent-slate-800 w-3.5 h-3.5" />
                  <span className="text-[14px] text-slate-700 flex-1">{p.name}</span>
                  {p.vendor && <span className="text-[12px] text-slate-400">{p.vendor}</span>}
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
              <span className="text-[14px] text-slate-700 flex-1">{p.name}</span>
              {p.productFamily && <span className="text-[12px] text-slate-400">{p.productFamily.name}</span>}
              {p.vendor && <span className="text-[12px] text-slate-400">{p.vendor}</span>}
            </label>
          ))}
        </div>
      )}

      {/* Quick-add standalone product */}
      {showQuickAdd ? (
        <div className="p-2 bg-slate-50 border border-[#64748B]/20 rounded-lg space-y-2 mt-1">
          <p className="text-[13px] font-semibold text-slate-600">Quick-add Product</p>
          <div className="flex gap-2">
            <input value={quickName} onChange={e => setQuickName(e.target.value)}
              placeholder="Product name *"
              className="flex-1 h-8 px-2 rounded border border-slate-300 text-[14px] focus:outline-none focus:border-slate-700" />
            <input value={quickVendor} onChange={e => setQuickVendor(e.target.value)}
              placeholder="Vendor"
              className="w-32 h-8 px-2 rounded border border-slate-300 text-[14px] focus:outline-none focus:border-slate-700" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowQuickAdd(false); setQuickName(''); setQuickVendor('') }}
              className="px-2 py-1 text-[13.5px] border border-slate-300 rounded text-slate-600 hover:bg-slate-100">Cancel</button>
            <button onClick={handleQuickAdd} disabled={!quickName.trim() || createProductMut.isPending}
              className="px-3 py-1 text-[13.5px] bg-[#15324a] text-white rounded hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1">
              {createProductMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Add &amp; Select →
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowQuickAdd(true)}
          className="text-[13.5px] text-[#1A3E5C] hover:text-[#64748B] flex items-center gap-1 mt-1">
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
            <p className="text-[17px] font-bold text-slate-900">Edit Regulation</p>
            <p className="text-[13.5px] text-slate-400 mt-0.5">
              <span className="font-mono font-bold text-slate-600">{reg.shortCode}</span> · Short code cannot be changed
            </p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Name *</label>
            <input value={form.name} onChange={e => up('name', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Issuing Authority</label>
            <input value={form.issuingAuthority} onChange={e => up('issuingAuthority', e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Description</label>
            <textarea rows={3} value={form.description} onChange={e => up('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14.5px] resize-none focus:outline-none focus:border-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Jurisdiction</label>
              <select value={form.jurisdiction} onChange={e => up('jurisdiction', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] focus:outline-none focus:border-slate-800 bg-white">
                {['India','European Union','United States','United Kingdom','Singapore','Global'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Status</label>
              <div className="flex gap-2">
                {[
                  { val: 'DRAFT',     label: 'Draft',     color: 'bg-amber-50 text-amber-700 border-amber-300' },
                  { val: 'ACTIVE',    label: 'Active',    color: 'bg-green-50 text-green-700 border-green-300' },
                  { val: 'ARCHIVED',  label: 'Archived',  color: 'bg-slate-100 text-slate-600 border-slate-300' },
                ].map(s => (
                  <button key={s.val} onClick={() => up('status', s.val)}
                    className={`flex-1 h-10 rounded-lg text-[14px] font-semibold border-2 transition-all ${
                      form.status === s.val ? s.color + ' ring-2 ring-offset-1 ring-slate-400' : 'border-[#64748B]/20 text-slate-500 hover:border-slate-400'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-[12.5px] text-slate-400 mt-1">
                Set to <strong>Active</strong> to make visible to tenant organizations.
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg flex items-center justify-center gap-2">
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
          <p className="text-[17px] font-bold text-slate-900">Create New Regulation</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[14px] text-slate-400">Define a regulation that organizations can assess against.</p>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Regulation Name <span className="text-slate-300">*</span>
            </label>
            <input value={form.name} onChange={e => up('name', e.target.value)}
              placeholder="e.g., Digital Personal Data Protection Act 2023"
              className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Short Code <span className="text-slate-300">*</span>
                <span className="text-slate-400 font-normal normal-case ml-1">(max 10 chars)</span>
              </label>
              <input value={form.shortCode}
                onChange={e => up('shortCode', e.target.value.toUpperCase().slice(0, 10))}
                placeholder="e.g., DPDP"
                className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 font-mono transition-colors" />
              <p className="text-[12.5px] text-slate-400 mt-0.5">Used as a tag throughout the platform. Must be unique.</p>
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Issuing Authority <span className="text-slate-300">*</span>
              </label>
              <input value={form.authority} onChange={e => up('authority', e.target.value)}
                placeholder="e.g., Ministry of Electronics and IT"
                className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-slate-300">*</span>
            </label>
            <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)}
              placeholder="Full description of what this regulation covers and who it applies to."
              className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Jurisdiction <span className="text-slate-300">*</span>
              </label>
              <select value={form.jurisdiction} onChange={e => up('jurisdiction', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white">
                {['India', 'European Union', 'United States', 'United Kingdom', 'Singapore', 'Global'].map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Effective Date <span className="text-slate-300">*</span>
              </label>
              <input type="date" value={form.effectiveDate} onChange={e => up('effectiveDate', e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
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
                    <p className="text-[14.5px] font-medium text-slate-800">{s.label}</p>
                    <p className="text-[12.5px] text-slate-400">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
            <button onClick={onClose}
              className="px-4 py-2 border border-[#64748B]/20 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Regulation →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Node tree helpers ─────────────────────────────────────────────────────
// A node's own nodeType/code drive every label — nothing here is hardcoded
// to "Chapter"/"Section", so the same tree renders DPDP (2 levels) and a
// SEBI-style structure (Part > Function > Domain > Standard, Annexures as
// root siblings) identically.
type TreeNode = RegNode & { children: TreeNode[] }

function buildTree(nodes: RegNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(nodes.map(n => [n.id, { ...n, children: [] }]))
  const roots: TreeNode[] = []
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) byId.get(n.parentId)!.children.push(n)
    else roots.push(n)
  }
  const sortRec = (list: TreeNode[]) => { list.sort((a, b) => a.orderIndex - b.orderIndex); list.forEach(c => sortRec(c.children)) }
  sortRec(roots)
  return roots
}


// A parent shows as indeterminate (dash, not check) when some — but not
// all — of its descendants are individually cited, purely as a visual
// signal that something under this node is selected. It never writes a
// citation for the parent itself: citations stay one-per-node, computed
// rollups (e.g. "controls under Chapter 3") come from walking the tree,
// not from duplicating the same fact at every ancestor level.
function TriStateCheckbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate: boolean; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="accent-[#1A3E5C] w-3.5 h-3.5 flex-shrink-0 cursor-pointer" />
  )
}

// ─── Regulation Mapping Row ───────────────────────────────────────────────────
// Compact node-tree picker + applicability-category chips for one regulation.
// Node labels/depth are whatever that regulation defines — no assumption of
// "chapter then section" beyond what the data itself contains.
function RegulationMappingRow({ regulation, mapping, onChange }: {
  regulation: any
  mapping: { regulationId: string; nodeIds: string[]; categoryIds: string[] }
  onChange: (updates: Partial<{ nodeIds: string[]; categoryIds: string[] }>) => void
}) {
  const { data: nodesData, isLoading } = useRegulationNodes(regulation.id)
  const nodes = nodesData ?? []
  const { data: categoriesData } = useApplicabilityCategories(regulation.id)
  const categories = categoriesData ?? []
  const tree = buildTree(nodes)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleNode = (id: string) => onChange({ nodeIds: mapping.nodeIds.includes(id) ? mapping.nodeIds.filter(x => x !== id) : [...mapping.nodeIds, id] })
  const toggleCategory = (id: string) => onChange({ categoryIds: mapping.categoryIds.includes(id) ? mapping.categoryIds.filter(x => x !== id) : [...mapping.categoryIds, id] })
  const [addModal, setAddModal] = useState<{ parentId: string | null; siblingType?: string } | null>(null)

  const hasSelectedDescendant = (n: TreeNode): boolean =>
    n.children.some(c => mapping.nodeIds.includes(c.id) || hasSelectedDescendant(c))

  const renderRow = (n: TreeNode): React.ReactNode => {
    const checked = mapping.nodeIds.includes(n.id)
    const indeterminate = !checked && hasSelectedDescendant(n)
    return (
      <div key={n.id}>
        <div
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all ${
            checked ? 'bg-[#1A3E5C]/8 border-[#1A3E5C]/30'
              : indeterminate ? 'bg-slate-100/70 border-slate-200'
              : 'border-transparent hover:border-[#64748B]/20 hover:bg-white'
          }`}
          style={{ marginLeft: n.depth * 16 }}>
          {n.children.length > 0 ? (
            <button type="button" onClick={() => toggleExpand(n.id)}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex-shrink-0 transition-colors">
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded.has(n.id) ? 'rotate-90' : ''}`} />
            </button>
          ) : <span className="w-5 flex-shrink-0" />}
          <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer" title={indeterminate ? 'Some nodes under this are individually selected' : undefined}>
            <TriStateCheckbox checked={checked} indeterminate={indeterminate} onChange={() => toggleNode(n.id)} />
            <span className="text-[9.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0 bg-slate-100 text-slate-500">{n.nodeType}</span>
            <span className={`text-[13px] font-semibold flex-shrink-0 ${checked ? 'text-[#1A3E5C]' : 'text-slate-800'}`}>{n.code}</span>
            {n.title && <span className="text-[13px] text-slate-400 truncate">— {n.title}</span>}
          </label>
          <button type="button" onClick={() => setAddModal({ parentId: n.id, siblingType: n.children[0]?.nodeType })} title={`Add a child node under ${n.code}`}
            className="p-0.5 rounded-full text-slate-300 hover:text-[#1A3E5C] hover:bg-[#1A3E5C]/10 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {n.children.length > 0 && expanded.has(n.id) && (
          <div className="ml-[19px] pl-2.5 border-l border-slate-200">
            {n.children.map(renderRow)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border border-[#64748B]/20 rounded-lg bg-slate-50 overflow-hidden">
      <div className="px-3 py-2 bg-white border-b border-[#64748B]/15">
        <p className="text-[14px] font-bold text-slate-800">{regulation.shortCode} <span className="font-normal text-slate-500">— {regulation.name}</span></p>
      </div>

      <div className="p-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide">Structure mapping <span className="text-slate-400 font-normal normal-case">(optional, any depth)</span></p>
            <div className="flex items-center gap-2">
              {mapping.nodeIds.length > 0 && (
                <span className="text-[11.5px] font-semibold text-[#1A3E5C] bg-[#1A3E5C]/10 rounded-full px-2 py-0.5">{mapping.nodeIds.length} selected</span>
              )}
              <button type="button" onClick={() => setAddModal({ parentId: null })}
                className="flex items-center gap-1 text-[11.5px] font-semibold text-[#1A3E5C] hover:text-[#15324a] transition-colors">
                <Plus className="w-3.5 h-3.5" /> New Root Node
              </button>
            </div>
          </div>
          <div className="bg-white border border-[#64748B]/15 rounded-md p-1.5 max-h-44 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-[13px] py-2 px-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading structure…</div>
            ) : tree.length === 0 ? (
              <div className="text-center py-3 px-1.5">
                <p className="text-[12.5px] text-slate-400 mb-2">No structure defined yet for {regulation.shortCode}.</p>
                <button type="button" onClick={() => setAddModal({ parentId: null })}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-white bg-[#1A3E5C] rounded-md px-2.5 py-1.5 hover:bg-[#15324a] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add First Node
                </button>
              </div>
            ) : tree.map(renderRow)}
          </div>
        </div>

        {addModal && (
          <NodeFormModal
            mode="add"
            regulationId={regulation.id}
            parentId={addModal.parentId}
            siblingType={addModal.siblingType}
            onClose={() => setAddModal(null)}
            onSaved={id => { onChange({ nodeIds: [...mapping.nodeIds, id] }); if (addModal.parentId) setExpanded(p => new Set(p).add(addModal.parentId!)) }}
          />
        )}

        <div>
          <p className="text-[11.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Applies to <span className="text-slate-400 font-normal normal-case">(optional — leave blank for no restriction)</span></p>
          {categories.length === 0 ? (
            <p className="text-[12.5px] text-slate-400">No applicability categories defined for {regulation.shortCode} yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c: any) => {
                const active = mapping.categoryIds.includes(c.id)
                return (
                  <button key={c.id} type="button" onClick={() => toggleCategory(c.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold border transition-all ${active ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:border-indigo-400 hover:bg-indigo-50'}`}>
                    {active && <Check className="w-3 h-3" />}
                    {c.label}
                  </button>
                )
              })}
            </div>
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
      ? [{ regulationId: preselectedRegId, nodeIds: [], categoryIds: [] }]
      : []) as Array<{ regulationId: string; nodeIds: string[]; categoryIds: string[] }>,
    status: 'DRAFT'
  })
  const [actions, setActions] = useState<ActionEntry[]>([{
    id: '1', title: '', desc: '', evidenceTypes: [], dueDays: 30, priority: 'HIGH', productIds: []
  }])
  const { mutate: createControl, isPending } = useCreateControl()

  const toggleReg = (regId: string) => {
    setForm(p => {
      const exists = p.mappings.find(m => m.regulationId === regId)
      if (exists) return { ...p, mappings: p.mappings.filter(m => m.regulationId !== regId) }
      return { ...p, mappings: [...p.mappings, { regulationId: regId, nodeIds: [], categoryIds: [] }] }
    })
  }

  const updateMapping = (regId: string, updates: Partial<{ nodeIds: string[]; categoryIds: string[] }>) => {
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
      status: form.status as any,
      regulationId: form.mappings[0].regulationId,
      nodeIds: Array.from(new Set(form.mappings.flatMap(m => m.nodeIds))),
      applicabilityCategoryIds: Array.from(new Set(form.mappings.flatMap(m => m.categoryIds))),
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
          <p className="text-[17px] font-bold text-slate-900">Create Control</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Control Title <span className="text-slate-300">*</span>
            </label>
            <input value={form.title} onChange={e => up('title', e.target.value)}
              placeholder="e.g., Implement valid consent mechanism"
              className="w-full h-10 px-3 rounded-lg border border-[#64748B]/20 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Description <span className="text-slate-300">*</span>
            </label>
            <textarea rows={3} value={form.desc} onChange={e => up('desc', e.target.value)}
              placeholder="Describe the control objective and requirements…"
              className="w-full px-3 py-2 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none transition-colors" />
          </div>
          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Regulation(s) <span className="text-slate-300">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {regulations.map((r: any) => {
                const active = form.mappings.some(m => m.regulationId === r.id)
                return (
                  <button key={r.id} onClick={() => toggleReg(r.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[14px] font-semibold border-2 transition-all ${
                      active
                        ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]'
                        : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'
                    }`}>
                    {active && <Check className="w-3.5 h-3.5" />}
                    {r.shortCode}
                  </button>
                )
              })}
            </div>
            <p className="text-[12.5px] text-slate-400 mt-1">
              Select all regulations this control applies to.
            </p>
          </div>

          {/* Per-regulation structure + applicability mapping */}
          {form.mappings.length > 0 ? (
            <div className="space-y-3">
              <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide">
                Map to Regulation Structure
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
              <p className="text-[14.5px] text-slate-400">Select at least one regulation above to categorize this control.</p>
            </div>
          )}

          <div>
            <label className="block text-[13.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Status
            </label>
            <div className="flex gap-2 w-48">
              {['DRAFT', 'PUBLISHED'].map(s => (
                <button key={s} onClick={() => up('status', s)}
                  className={`flex-1 h-10 rounded-lg text-[14px] font-medium border transition-all ${
                    form.status === s
                      ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]'
                      : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400'
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
                <p className="text-[15px] font-bold text-slate-800">Pre-defined Actions</p>
                <p className="text-[13px] text-slate-400">
                  Auto-created when this control is included in an assessment. At least one required.
                </p>
              </div>
              <button onClick={addAction}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium text-slate-700 border border-[#64748B]/20 rounded-lg hover:bg-slate-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div key={action.id} className="p-4 border border-[#64748B]/20 rounded-xl bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-slate-700">Action {idx + 1}</p>
                    {actions.length > 1 && (
                      <button onClick={() => setActions(p => p.filter(a => a.id !== action.id))}
                        className="text-[13px] text-slate-400 hover:text-slate-800 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                  <input value={action.title} onChange={e => upAction(action.id, 'title', e.target.value)}
                    placeholder="Action Title *"
                    className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 bg-white transition-colors" />
                  <textarea rows={2} value={action.desc} onChange={e => upAction(action.id, 'desc', e.target.value)}
                    placeholder="Detailed steps for the IT Admin to complete this action"
                    className="w-full px-3 py-1.5 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 resize-none bg-white transition-colors" />
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
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
                          className={`px-2 py-0.5 rounded-md text-[12.5px] font-medium border transition-all ${action.evidenceTypes.includes(t)
                              ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]'
                              : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400 bg-white'
                            }`}>
                          {EVIDENCE_LABELS[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Suggested Due Days <span className="text-slate-300">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={action.dueDays}
                          onChange={e => upAction(action.id, 'dueDays', Number(e.target.value))}
                          min={1} max={365}
                          className="w-20 h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 focus:outline-none focus:border-slate-800 bg-white" />
                        <span className="text-[14px] text-slate-500">days from assignment</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Priority <span className="text-slate-300">*</span>
                      </label>
                      <div className="flex gap-2">
                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                          <button key={p} onClick={() => upAction(action.id, 'priority', p)}
                            className={`px-2 py-1 rounded-md text-[12.5px] font-medium border transition-all ${action.priority === p
                                ? 'bg-[#1A3E5C] text-white border-[#1A3E5C]'
                                : 'border-[#64748B]/20 text-slate-600 hover:border-slate-400 bg-white'
                              }`}>
                            {p.charAt(0) + p.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Product Picker */}
                  <div className="pt-2 border-t border-[#64748B]/20">
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
              className="px-4 py-2 border border-[#64748B]/20 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Control →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Master Control link (bidirectional — promote/link from the control side) ─
function MasterControlLinkSection({ ctrl }: { ctrl: any }) {
  const [picking, setPicking] = useState(false)
  const [search, setSearch] = useState('')
  const { data } = useMasterControls({ search, limit: 20 })
  const { mutate: setLink, isPending } = useSetControlMasterLink()
  const navigate = useNavigate()
  const options = data?.data ?? []

  return (
    <div>
      <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Master Control</p>
      {ctrl.masterControl && !picking ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1A3E5C]/5 border border-[#1A3E5C]/20 rounded-lg">
          <GitMerge className="w-3.5 h-3.5 text-[#1A3E5C] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-slate-800 truncate">
              <span className="font-mono text-[#1A3E5C]">{ctrl.masterControl.code}</span> — {ctrl.masterControl.title}
            </p>
          </div>
          <button onClick={() => navigate(`/admin/master-controls?id=${ctrl.masterControl.id}`)}
            className="text-[12.5px] text-[#1A3E5C] hover:text-[#15324a] flex-shrink-0 font-medium transition-colors">Open →</button>
          <button onClick={() => setLink({ controlId: ctrl.id, masterControlId: null })} disabled={isPending}
            className="text-[12.5px] text-slate-400 hover:text-red-500 flex-shrink-0 font-medium transition-colors">Unlink</button>
        </div>
      ) : !picking ? (
        <button onClick={() => setPicking(true)} className="flex items-center gap-1.5 text-[13.5px] text-[#1A3E5C] hover:text-[#15324a] font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Link to a Master Control
        </button>
      ) : (
        <div className="border border-[#64748B]/20 rounded-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search master controls…" autoFocus
              className="w-full h-8 px-2.5 rounded-md border border-[#64748B]/20 text-[13px] focus:outline-none focus:border-slate-800" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {options.length === 0 ? (
              <p className="text-[13px] text-slate-400 px-3 py-3">No master controls match.</p>
            ) : options.map((mc: any) => (
              <button key={mc.id} onClick={() => { setLink({ controlId: ctrl.id, masterControlId: mc.id }); setPicking(false) }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                <p className="text-[13.5px] font-semibold text-slate-800"><span className="font-mono text-[#1A3E5C]">{mc.code}</span> — {mc.title}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setPicking(false)} className="w-full text-center text-[12.5px] text-slate-400 hover:text-slate-700 py-1.5 border-t border-slate-100 transition-colors">Cancel</button>
        </div>
      )}
    </div>
  )
}

// ─── Control Detail Panel ─────────────────────────────────────────────────────
export function ControlDetailPanel({
  control,
  onClose,
}: {
  control: any
  onClose: () => void
}) {
  const { data: freshData } = useControl(control.id)
  const ctrl = freshData ?? control
  const { data: regsResp } = useRegulations({ limit: 1000 })
  const allRegulations = regsResp?.data ?? []

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
      <div className="fixed top-0 right-0 h-full w-[560px] bg-white border-l border-[#64748B]/25 shadow-[0_0_50px_rgba(0,0,0,0.18)] z-50 flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#64748B]/20 bg-[#1A3E5C]/[0.03] flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold text-slate-900 leading-snug mb-2">{ctrl.title}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[12.5px] px-2 py-0.5 rounded-full font-bold ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {ctrl.status}
              </span>
              <span className="text-[12.5px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
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
            <p className="text-[14.5px] text-red-700 flex-1">Delete this control? This cannot be undone and will remove all regulation mappings.</p>
            <button onClick={handleDeleteControl} disabled={deleting}
              className="px-3 py-1 bg-red-600 text-white text-[14px] font-semibold rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-1">
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Confirm Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-3 py-1 border border-red-200 text-red-600 text-[14px] rounded-lg hover:bg-red-100">Cancel</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Basic info */}
          <div className="px-5 py-4 border-b border-[#64748B]/20 space-y-3">
            <p className="text-[13px] font-bold text-[#64748B] uppercase tracking-widest">Description</p>
            <p className="text-[15px] text-slate-700 leading-relaxed">{ctrl.description}</p>
            {ctrl.nodes?.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Mapped Regulations</p>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(
                    (ctrl.nodes as any[]).reduce((acc: Record<string, any[]>, l: any) => {
                      (acc[l.node.regulationId] ??= []).push(l.node); return acc
                    }, {} as Record<string, any[]>)
                  ).map(([regId, regNodes]) => (
                    <span key={regId} className="text-[13px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                      {allRegulations.find((r: any) => r.id === regId)?.shortCode ?? 'Reg'}
                      <span className="text-blue-400 font-normal"> · {(regNodes as any[]).map((n: any) => n.code).join(', ')}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ctrl.applicabilities?.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide mb-1.5">Applies To</p>
                <div className="flex gap-1.5 flex-wrap">
                  {ctrl.applicabilities.map((a: any) => (
                    <span key={a.applicabilityCategoryId} className="text-[13px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                      {a.applicabilityCategory?.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <MasterControlLinkSection ctrl={ctrl} />
          </div>

          {/* Actions — full manage */}
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-[#64748B] uppercase tracking-widest">
                Predefined Actions <span className="ml-1 text-slate-300">({ctrl.predefinedActions?.length ?? 0})</span>
              </p>
            </div>

            {(ctrl.predefinedActions ?? []).length === 0 && (
              <p className="text-[14.5px] text-slate-400">No actions defined.</p>
            )}

            {(ctrl.predefinedActions ?? []).map((action: any, idx: number) => (
              <div key={action.id} className="border border-[#64748B]/20 rounded-xl overflow-hidden">

                {/* Action header */}
                <div className="p-3.5 bg-slate-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14.5px] font-semibold text-slate-800 leading-snug flex-1">
                      <span className="text-slate-400 mr-1.5 font-normal text-[13px]">{idx + 1}.</span>
                      {action.title}
                    </p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_COLORS[action.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                        {action.priority}
                      </span>
                      <button onClick={() => removeAction({ controlId: ctrl.id, actionId: action.id })}
                        disabled={removingAction}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-600 leading-relaxed">{action.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {action.evidenceTypes?.map((t: string) => (
                      <span key={t} className="text-[12px] font-semibold px-1.5 py-0.5 bg-white border border-[#64748B]/20 text-slate-600 rounded">
                        {EVIDENCE_LABELS[t] ?? t}
                      </span>
                    ))}
                    <span className="text-[13px] text-slate-400">Due: {action.suggestedDueDays}d</span>
                  </div>
                </div>

                {/* Products section */}
                <div className="p-3.5 border-t border-[#64748B]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide">Products</p>
                    <button onClick={() => setManagingProducts(managingProducts === action.id ? null : action.id)}
                      className="text-[13px] text-[#1A3E5C] hover:text-[#64748B] font-medium">
                      {managingProducts === action.id ? 'Done' : '+ Manage Products'}
                    </button>
                  </div>

                  {/* Current products */}
                  {action.products?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {action.products.map((ap: any) => (
                        <span key={ap.product?.id ?? ap.productId} className="text-[13px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                          {ap.product?.name ?? 'Product'}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13.5px] text-slate-400">No products assigned</p>
                  )}

                  {/* Product picker */}
                  {managingProducts === action.id && (
                    <div className="mt-2 p-3 bg-white border border-[#64748B]/20 rounded-lg">
                      <ProductPicker
                        selected={(action.products ?? []).map((ap: any) => ap.productId ?? ap.product?.id)}
                        onChange={ids => setActionProducts({ controlId: ctrl.id, actionId: action.id, productIds: ids })}
                      />
                    </div>
                  )}
                </div>

                {/* Master Evidence section per product */}
                {action.products?.length > 0 && (
                  <div className="p-3.5 border-t border-[#64748B]/20 space-y-3">
                    <p className="text-[13px] font-semibold text-[#64748B] uppercase tracking-wide">Master Evidence</p>

                    {action.products.map((ap: any) => {
                      const productId   = ap.productId ?? ap.product?.id
                      const productName = ap.product?.name ?? 'Product'
                      const evidences   = ap.masterEvidences ?? []
                      const isUploading = uploadingEv?.actionId === action.id && uploadingEv?.productId === productId

                      return (
                        <div key={productId} className="space-y-2">
                          <p className="text-[13.5px] font-semibold text-slate-700">{productName}</p>

                          {evidences.length > 0 ? (
                            <div className="space-y-1">
                              {evidences.map((ev: any) => (
                                <div key={ev.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                  <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-medium text-slate-800 truncate">{ev.title}</p>
                                    {ev.fileName && <p className="text-[12.5px] text-slate-400">{ev.fileName}</p>}
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
                            <p className="text-[13px] text-slate-400">No master evidence yet</p>
                          )}

                          {isUploading ? (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                              <input value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Evidence title *"
                                className="w-full h-8 px-2.5 rounded border border-[#64748B]/20 text-[14px] focus:outline-none focus:border-[#1A3E5C]" />
                              <input value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="Description (optional)"
                                className="w-full h-8 px-2.5 rounded border border-[#64748B]/20 text-[14px] focus:outline-none focus:border-[#1A3E5C]" />
                              <input type="file" onChange={e => setEvFile(e.target.files?.[0] ?? null)}
                                className="w-full text-[13.5px] text-slate-600" />
                              <div className="flex gap-2">
                                <button onClick={() => { setUploadingEv(null); setEvTitle(''); setEvDesc(''); setEvFile(null) }}
                                  className="px-2.5 py-1 text-[13.5px] border border-[#64748B]/20 rounded text-slate-500 hover:bg-slate-50">Cancel</button>
                                <button onClick={() => handleUploadEvidence(action.id, productId)} disabled={creatingEv || !evTitle.trim()}
                                  className="flex-1 py-1 text-[13.5px] bg-[#1A3E5C] text-white rounded hover:bg-[#15324a] disabled:opacity-50 flex items-center justify-center gap-1">
                                  {creatingEv ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setUploadingEv({ actionId: action.id, productId }); setEvTitle(''); setEvDesc(''); setEvFile(null) }}
                              className="text-[13.5px] text-[#1A3E5C] hover:text-[#64748B] flex items-center gap-1">
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
        <div className="px-5 py-3.5 border-t border-[#64748B]/20 flex gap-2 flex-shrink-0 bg-slate-50/60">
          <button onClick={() => setConfirmDelete(true)} disabled={confirmDelete || deleting}
            className="px-3 py-2 border border-red-200 text-[14.5px] text-red-500 rounded-lg hover:bg-red-50 transition-colors">
            Delete
          </button>
          {ctrl.status === 'DRAFT' && (
            <button onClick={() => publishControl(ctrl.id, { onSuccess: onClose })} disabled={publishing}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[15px] font-semibold rounded-lg transition-colors">
              {publishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : 'Publish Control'}
            </button>
          )}
          {ctrl.status === 'PUBLISHED' && (
            <span className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[14px] text-green-600 font-semibold">
              <Check className="w-4 h-4" /> Published
            </span>
          )}
        </div>
      </div>
    </>
  )
}



function ControlCard({ ctrl, onSelect, onPublish, nodeLabel }: { ctrl: any, onSelect: () => void, onPublish: () => void, nodeLabel?: string }) {
  return (
    <div className="bg-white border border-[#64748B]/20 rounded-xl p-4 flex flex-col hover:border-[#64748B]/40 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-all group shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between mb-2">
        <span className="font-mono text-[12.5px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
          {ctrl.id.slice(0, 8)}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${ctrl.status === 'PUBLISHED'
            ? 'bg-green-50 text-green-700'
            : 'bg-amber-50 text-amber-700'
          }`}>{ctrl.status}</span>
      </div>

      <h3 className="text-[15px] font-semibold text-slate-900 mb-1 line-clamp-2 leading-snug flex-1" title={ctrl.title}>
        {ctrl.title}
      </h3>
      {nodeLabel && (
        <p className="text-[11.5px] font-mono text-slate-400 mb-2 truncate" title={nodeLabel}>{nodeLabel}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="text-[12px] px-2 py-1 bg-slate-50 text-slate-600 rounded-lg font-medium border border-[#64748B]/20 flex items-center gap-1.5">
          <Shield className="w-3 h-3 text-slate-400" />
          {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'Data Fiduciary'
            : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'Significant DF' : 'Both'}
        </span>
        <span className="text-[12px] px-2 py-1 bg-blue-50/50 text-blue-700 rounded-lg font-medium border border-blue-100/50 flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-blue-400" />
          {ctrl._count?.predefinedActions ?? ctrl.predefinedActions?.length ?? 0} actions
        </span>
      </div>
      
      <div className="flex items-center gap-2 pt-3 border-t border-[#64748B]/20 mt-auto">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[13px] font-semibold rounded-lg transition-colors border border-[#64748B]/20">
          <Eye className="w-3.5 h-3.5" /> View Details
        </button>
        {ctrl.status === 'DRAFT' && (
          <button
            onClick={onPublish}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[13px] font-semibold rounded-lg transition-colors">
            Publish
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Structure Explorer (split-pane tree + detail, dedicated Structure tab) ───
// Accordion tree: only the path to the currently selected node is expanded.
// Clicking any node selects it AND reveals its own children (if it has any),
// collapsing whatever sibling branch was open before — so by default you see
// just the root nodes (e.g. DPDP's Chapters), and drill down one level at a
// time instead of the whole hierarchy unfolding at once.
function TreeBranch({ nodes, selectedId, onSelect, expanded }: {
  nodes: TreeNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  expanded: Set<string>
}) {
  return (
    <ul className="space-y-1">
      {nodes.map(n => {
        const isSelected = selectedId === n.id
        const isOpen = expanded.has(n.id)
        return (
          <li key={n.id}>
            <button type="button" onClick={() => onSelect(n.id)}
              className={`w-full flex items-center gap-2 pl-2 pr-2.5 py-2 rounded-lg border text-left transition-all ${
                isSelected
                  ? 'bg-[#1A3E5C] border-[#1A3E5C] shadow-sm'
                  : 'bg-white border-slate-200 hover:border-[#1A3E5C]/40 hover:shadow-sm'
              }`}>
              {n.children.length > 0 ? (
                <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''} ${isSelected ? 'text-white/70' : 'text-slate-400'}`} />
              ) : <span className="w-3.5 flex-shrink-0" />}
              <span className={`text-[9.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 flex-shrink-0 ${isSelected ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {n.nodeType}
              </span>
              <span className={`text-[13px] font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{n.code}</span>
              {n.children.length > 0 && (
                <span className={`ml-auto flex-shrink-0 text-[10.5px] font-semibold rounded-full px-1.5 py-0.5 ${isSelected ? 'bg-white/15 text-white' : 'text-slate-500 bg-slate-100'}`} title={`${n.children.length} child node${n.children.length !== 1 ? 's' : ''}`}>
                  {n.children.length}
                </span>
              )}
            </button>
            {n.children.length > 0 && isOpen && (
              <div className="ml-[19px] mt-1 pl-2.5 border-l-2 border-slate-200">
                <TreeBranch nodes={n.children} selectedId={selectedId} onSelect={onSelect} expanded={expanded} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function NodeFormModal({ mode, regulationId, node, parentId, siblingType, onClose, onSaved }: {
  mode: 'add' | 'edit'
  regulationId: string
  node?: RegNode
  parentId?: string | null
  siblingType?: string
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const [nodeType, setNodeType] = useState(mode === 'edit' ? node!.nodeType : (siblingType ?? ''))
  const [code, setCode] = useState(mode === 'edit' ? node!.code : '')
  const [title, setTitle] = useState(mode === 'edit' ? (node!.title ?? '') : '')
  const { mutate: createNode, isPending: creating } = useCreateNode()
  const { mutate: updateNode, isPending: updating } = useUpdateNode()
  const pending = creating || updating

  const submit = () => {
    if (!nodeType.trim() || !code.trim()) { toast.error('Node type and code are required'); return }
    if (mode === 'add') {
      createNode({ regulationId, parentId: parentId ?? null, nodeType: nodeType.trim(), code: code.trim(), title: title.trim() || undefined }, {
        onSuccess: (res: any) => { onSaved(res?.data?.id); onClose() },
      })
    } else {
      updateNode({ regulationId, nodeId: node!.id, data: { nodeType: nodeType.trim(), code: code.trim(), title: title.trim() || undefined } }, {
        onSuccess: () => { onSaved(node!.id); onClose() },
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <p className="text-[16px] font-bold text-slate-900">{mode === 'add' ? (parentId ? 'Add Child Node' : 'Add Root Node') : 'Edit Node'}</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Node Type <span className="text-slate-300">*</span></label>
            <input value={nodeType} onChange={e => setNodeType(e.target.value)} placeholder="e.g. Chapter, Part, Domain, Standard"
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" autoFocus />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Code <span className="text-slate-300">*</span></label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. Chapter 2, Part I, STD-1.1"
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Title <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descriptive title"
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-slate-800" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={pending}
            className="flex-1 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-60 text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : mode === 'add' ? 'Add Node' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NodeDetailPane({ node, regulationId, nodes, onSelect, onEdit, onAddChild, onDeleted }: {
  node: RegNode
  regulationId: string
  nodes: RegNode[]
  onSelect: (id: string) => void
  onEdit: (node: RegNode) => void
  onAddChild: (parentId: string, siblingType?: string) => void
  onDeleted: () => void
}) {
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const children = nodes.filter(n => n.parentId === node.id).sort((a, b) => a.orderIndex - b.orderIndex)
  const { mutate: deleteNode, isPending: deleting } = useDeleteNode()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const crumbs: RegNode[] = []
  let cur: RegNode | undefined = node
  while (cur) { crumbs.unshift(cur); cur = cur.parentId ? nodeById.get(cur.parentId) : undefined }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        {crumbs.length > 1 && (
          <div className="flex items-center gap-1 text-[12px] mb-2.5 flex-wrap">
            {crumbs.map((cr, i) => (
              <span key={cr.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />}
                <button onClick={() => onSelect(cr.id)}
                  className={`px-1.5 py-0.5 rounded transition-colors ${i === crumbs.length - 1 ? 'text-slate-700 font-bold' : 'text-slate-500 hover:bg-white hover:text-[#1A3E5C]'}`}>
                  {cr.code}
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1A3E5C] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-[15px]">{node.nodeType.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-slate-500">{node.nodeType}</p>
            <h3 className="text-[17px] font-bold text-slate-900 leading-tight truncate">{node.code}</h3>
          </div>
        </div>
        {node.title && <p className="text-[14px] text-slate-600 mt-2 leading-snug">{node.title}</p>}
      </div>

      <div className="px-5 py-3 border-b border-slate-100 grid grid-cols-3 gap-2">
        <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
          <p className="text-[17px] font-bold text-slate-800 leading-tight">{children.length}</p>
          <p className="text-[10.5px] text-slate-400 uppercase tracking-wide">Children</p>
        </div>
        <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
          <p className="text-[17px] font-bold text-slate-800 leading-tight">{node._count?.controlLinks ?? 0}</p>
          <p className="text-[10.5px] text-slate-400 uppercase tracking-wide">Controls</p>
        </div>
        <div className="bg-slate-50 rounded-lg px-2 py-2 text-center">
          <p className="text-[17px] font-bold text-slate-800 leading-tight">{node.depth}</p>
          <p className="text-[10.5px] text-slate-400 uppercase tracking-wide">Depth</p>
        </div>
      </div>

      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <button onClick={() => onEdit(node)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-slate-600 border border-[#64748B]/25 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors">
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        <button onClick={() => onAddChild(node.id, children[0]?.nodeType)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-[#1A3E5C] bg-[#1A3E5C]/8 border border-[#1A3E5C]/25 rounded-lg hover:bg-[#1A3E5C]/15 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Child
        </button>
        <div className="w-px h-5 bg-slate-200 mx-0.5" />
        <button onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      {confirmDelete && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          {children.length > 0 ? (
            <p className="text-[13px] text-red-700 flex-1">Delete or move its {children.length} child node{children.length !== 1 ? 's' : ''} first.</p>
          ) : (
            <>
              <p className="text-[13px] text-red-700 flex-1">Delete {node.nodeType} {node.code}? This cannot be undone.</p>
              <button disabled={deleting}
                onClick={() => deleteNode({ regulationId, nodeId: node.id }, { onSuccess: () => { setConfirmDelete(false); onDeleted() } })}
                className="px-2.5 py-1 text-[12.5px] font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex-shrink-0">
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </>
          )}
          <button onClick={() => setConfirmDelete(false)} className="text-[12.5px] text-slate-500 hover:text-slate-800 flex-shrink-0">Cancel</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-3.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
          Child Nodes {children.length > 0 && <span className="text-slate-300 font-normal normal-case">— click to open</span>}
        </p>
        {children.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-lg px-3 py-5 text-center">
            <p className="text-[13px] text-slate-400">No child nodes yet.</p>
            <button onClick={() => onAddChild(node.id, children[0]?.nodeType)}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#1A3E5C] hover:text-[#15324a]">
              <Plus className="w-3.5 h-3.5" /> Add the first child under {node.code}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {children.map(cn => {
              const grandchildren = nodes.filter(n => n.parentId === cn.id).length
              return (
                <button key={cn.id} onClick={() => onSelect(cn.id)}
                  className="text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#1A3E5C]/40 hover:shadow-sm transition-all">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{cn.nodeType}</span>
                    {grandchildren > 0 && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded-full px-1.5">{grandchildren}</span>}
                  </div>
                  <p className="text-[13px] font-bold text-slate-800 truncate">{cn.code}</p>
                  {cn.title && <p className="text-[11.5px] text-slate-500 truncate mt-0.5">{cn.title}</p>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StructureExplorer({ regulationId }: { regulationId: string }) {
  const { data: nodesData } = useRegulationNodes(regulationId)
  const nodes: RegNode[] = nodesData ?? []
  const tree = buildTree(nodes)
  const { data: categoriesData } = useApplicabilityCategories(regulationId)
  const categories = categoriesData ?? []

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; parentId?: string | null; siblingType?: string; node?: RegNode } | null>(null)

  // Accordion: selecting a node replaces the whole expanded set with just its
  // own ancestor chain (+ itself), so only one branch is ever open — clicking
  // a different root/sibling collapses whatever was open before it.
  const selectAndReveal = (id: string) => {
    // Re-clicking the node that's already selected and open just collapses it
    // (standard accordion toggle) instead of re-expanding the same thing.
    if (id === selectedId && expanded.has(id)) {
      setExpanded(p => { const n = new Set(p); n.delete(id); return n })
      return
    }
    setSelectedId(id)
    const byId = new Map(nodes.map(n => [n.id, n]))
    const chain = new Set<string>([id])
    let cur = byId.get(id)?.parentId
    while (cur) { chain.add(cur); cur = byId.get(cur)?.parentId }
    setExpanded(chain)
  }

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  return (
    <div className="space-y-3">
      <div className="bg-white border border-[#64748B]/20 rounded-xl p-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Applicability Categories</p>
        </div>
        <ApplicabilityCategoryManager regulationId={regulationId} categories={categories} />
      </div>

      <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex h-[580px] overflow-hidden">
        <div className="w-[300px] flex-shrink-0 border-r border-slate-100 flex flex-col bg-slate-50/60">
          <div className="px-3 py-2.5 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[13px] font-bold text-slate-700">{nodes.length} node{nodes.length !== 1 ? 's' : ''}</p>
              <button onClick={() => setModal({ mode: 'add', parentId: null, siblingType: tree[0]?.nodeType })}
                className="flex items-center gap-1 text-[12px] font-semibold text-[#1A3E5C] bg-[#1A3E5C]/8 border border-[#1A3E5C]/25 rounded-md px-2 py-1 hover:bg-[#1A3E5C]/15 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Root Node
              </button>
            </div>
            {tree.length > 0 && <p className="text-[11.5px] text-slate-400">Click a node to view, edit or add children.</p>}
          </div>
          <div className="flex-1 overflow-y-auto px-2.5 py-2.5">
            {tree.length === 0 ? (
              <div className="text-center px-2 py-6">
                <Layers className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-[13px] text-slate-500 font-medium">No structure yet</p>
                <p className="text-[12px] text-slate-400 mt-0.5 mb-3">Add the first root node — e.g. a Chapter or Part — to start.</p>
                <button onClick={() => setModal({ mode: 'add', parentId: null })}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-white bg-[#1A3E5C] rounded-md px-2.5 py-1.5 hover:bg-[#15324a] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Root Node
                </button>
              </div>
            ) : (
              <TreeBranch nodes={tree} selectedId={selectedId} onSelect={selectAndReveal} expanded={expanded} />
            )}
          </div>
        </div>

        {selectedNode ? (
          <NodeDetailPane
            node={selectedNode}
            regulationId={regulationId}
            nodes={nodes}
            onSelect={selectAndReveal}
            onEdit={n => setModal({ mode: 'edit', node: n })}
            onAddChild={(parentId, siblingType) => setModal({ mode: 'add', parentId, siblingType })}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-[14.5px] font-semibold text-slate-600">Select a node on the left</p>
            <p className="text-[13px] text-slate-400 mt-1 max-w-[220px]">Click any node in the list to view its details, edit it, add children, or delete it.</p>
          </div>
        )}
      </div>

      {modal && (
        <NodeFormModal
          mode={modal.mode}
          regulationId={regulationId}
          node={modal.node}
          parentId={modal.parentId}
          siblingType={modal.siblingType}
          onClose={() => setModal(null)}
          onSaved={id => selectAndReveal(id)}
        />
      )}
    </div>
  )
}

// ─── Applicability Category Manager (compact chip list + inline add) ─────────
function ApplicabilityCategoryManager({ regulationId, categories }: { regulationId: string; categories: ApplicabilityCategory[] }) {
  const { mutate: createCategory, isPending: creating } = useCreateApplicabilityCategory()
  const { mutate: deleteCategory } = useDeleteApplicabilityCategory()
  const [adding, setAdding] = useState(false)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [criteria, setCriteria] = useState('')

  const submit = () => {
    if (!code.trim() || !label.trim()) { toast.error('Code and label are required'); return }
    createCategory({ regulationId, code: code.trim().toUpperCase().replace(/\s+/g, '_'), label: label.trim(), criteriaSummary: criteria.trim() || undefined }, {
      onSuccess: () => { setAdding(false); setCode(''); setLabel(''); setCriteria('') },
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 items-center">
        {categories.length === 0 && !adding && (
          <span className="text-[12.5px] text-slate-400 italic">No applicability categories yet — add one to tag controls and clauses (e.g. "Significant Data Fiduciary").</span>
        )}
        {categories.map(c => (
          <span key={c.id} className="group flex items-center gap-1.5 text-[12.5px] font-semibold pl-2.5 pr-1.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full" title={c.criteriaSummary ?? undefined}>
            {c.label}
            <button onClick={() => { if (confirm(`Delete category "${c.label}"?`)) deleteCategory({ regulationId, categoryId: c.id }) }}
              title="Delete category"
              className="p-0.5 rounded-full text-indigo-300 hover:text-white hover:bg-red-500 transition-colors">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-[12.5px] font-semibold text-indigo-600 border border-dashed border-indigo-300 rounded-full px-2.5 py-1 hover:bg-indigo-50 transition-colors">
            <Plus className="w-3 h-3" /> Add Category
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-lg p-1.5">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Code e.g. SDF" autoFocus
            className="w-28 h-7 px-2 rounded-md border border-[#64748B]/20 text-[12.5px] focus:outline-none focus:border-indigo-400" />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label *"
            className="w-44 h-7 px-2 rounded-md border border-[#64748B]/20 text-[12.5px] focus:outline-none focus:border-indigo-400" />
          <input value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="Criteria summary (optional)"
            className="flex-1 h-7 px-2 rounded-md border border-[#64748B]/20 text-[12.5px] focus:outline-none focus:border-indigo-400" />
          <button onClick={submit} disabled={creating}
            className="flex items-center gap-1 px-2.5 py-1 text-[12px] font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
          </button>
          <button onClick={() => setAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-700 flex-shrink-0"><X className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  )
}

// ─── Delete Regulation (hard delete, password + shortCode re-confirmation) ───
// Irreversible — unlike Archive (a soft, reversible status flip), this
// permanently removes the regulation's own structure/categories and unmaps
// (not deletes) any controls that cited it. Gated behind the admin's current
// password plus typing the regulation's shortCode, since there's no undo.
function DeleteRegulationModal({ reg, onClose, onDeleted }: { reg: any; onClose: () => void; onDeleted: () => void }) {
  const { data: nodesData } = useRegulationNodes(reg.id)
  const nodeCount = (nodesData ?? []).length
  const { data: categoriesData } = useApplicabilityCategories(reg.id)
  const categoryCount = (categoriesData ?? []).length
  const { data: controlsData } = useControls({ regulationId: reg.id, limit: 1 })
  const controlCount = (controlsData as any)?.meta?.total ?? 0

  const [confirmCode, setConfirmCode] = useState('')
  const [password, setPassword] = useState('')
  const { mutate: deleteRegulation, isPending } = useDeleteRegulation()

  const canDelete = confirmCode === reg.shortCode && password.length > 0

  const handleDelete = () => {
    if (!canDelete || isPending) return
    deleteRegulation({ id: reg.id, password, confirmShortCode: confirmCode }, {
      onSuccess: () => onDeleted(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[460px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-red-100 bg-red-50/60 rounded-t-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-[16px] font-bold text-red-700 flex-1">Delete Regulation</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-[14.5px] text-slate-700 leading-relaxed">
            You're about to permanently delete <span className="font-bold">{reg.name}</span> (<span className="font-mono">{reg.shortCode}</span>). This cannot be undone.
          </p>
          <div className="bg-red-50 border border-red-100 rounded-lg px-3.5 py-3">
            <p className="text-[12px] font-semibold text-red-700 uppercase tracking-wide mb-1.5">This will permanently delete</p>
            <ul className="text-[13.5px] text-red-700 space-y-0.5 list-disc list-inside">
              <li>{nodeCount} structure node{nodeCount !== 1 ? 's' : ''}</li>
              <li>{categoryCount} applicability categor{categoryCount !== 1 ? 'ies' : 'y'}</li>
            </ul>
            {controlCount > 0 && (
              <p className="text-[13px] text-red-600 mt-2 pt-2 border-t border-red-200">
                {controlCount} control{controlCount !== 1 ? 's' : ''} citing this regulation will be unmapped from it — the controls themselves are kept, not deleted.
              </p>
            )}
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">
              Type <span className="font-mono text-red-600">{reg.shortCode}</span> to confirm
            </label>
            <input value={confirmCode} onChange={e => setConfirmCode(e.target.value)}
              placeholder={reg.shortCode} autoComplete="off"
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-red-400" />
          </div>
          <div>
            <label className="block text-[12.5px] font-semibold text-slate-600 uppercase tracking-wide mb-1">Your Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Confirm it's you" autoComplete="current-password"
              onKeyDown={e => { if (e.key === 'Enter' && canDelete) handleDelete() }}
              className="w-full h-9 px-3 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-900 focus:outline-none focus:border-red-400" />
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 border border-[#64748B]/20 text-[14px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleDelete} disabled={!canDelete || isPending}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14.5px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : <><Trash2 className="w-4 h-4" /> Delete Permanently</>}
          </button>
        </div>
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
  const [filterRootId, setFilterRootId] = useState('All')
  const [showControlForm, setShowControlForm] = useState(false)
  const [showEditReg, setShowEditReg] = useState(false)
  const [showDeleteReg, setShowDeleteReg] = useState(false)
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [addExistingMode, setAddExistingMode] = useState<'family' | 'all'>('family')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [existingSearch, setExistingSearch] = useState('')
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([])
  const [addingControls, setAddingControls] = useState(false)
  const [selectedControl, setSelectedControl] = useState<any>(null)
  const { mutate: archiveReg } = useArchiveRegulation()
  const { mutate: publishControl } = usePublishControl()
  const { data: allControlsData } = useControls()
  const allControlsFromApi = allControlsData?.data ?? []
  const { data: controlFamiliesData = [] } = useControlFamilies()
  const { data: regsResp } = useRegulations({ limit: 1000 })
  const allRegulations = regsResp?.data ?? []
  const { data: nodesData } = useRegulationNodes(reg.id)
  const nodes: RegNode[] = nodesData ?? []
  const nodeTree = buildTree(nodes)
  const nodeById = new Map(nodes.map(n => [n.id, n]))
  const [subTab, setSubTab] = useState<'Controls' | 'Structure'>('Controls')

  const toggleGroup = (key: string) => setExpandedGroups(p => {
    const n = new Set(p); n.has(key) ? n.delete(key) : n.add(key); return n
  })

  const rootOf = (nodeId: string): RegNode | undefined => {
    let cur = nodeById.get(nodeId)
    while (cur?.parentId && nodeById.has(cur.parentId)) cur = nodeById.get(cur.parentId)
    return cur
  }

  const pathLabel = (nodeId: string): string => {
    const chain: string[] = []
    let cur: RegNode | undefined = nodeById.get(nodeId)
    while (cur) { chain.unshift(cur.code); cur = cur.parentId ? nodeById.get(cur.parentId) : undefined }
    return chain.join(' › ')
  }

  const regControls = allControls.filter((c: any) => c.citedRegulationIds?.includes(reg.id))

  const primaryNodeOf = (c: any): RegNode | undefined => {
    const links = (c.nodes ?? []).filter((l: any) => l.node.regulationId === reg.id)
    if (links.length === 0) return undefined
    return (links.find((l: any) => l.isPrimary) ?? links[0]).node
  }

  const matchesFilters = (c: any) =>
    (filterStatus === 'All' || c.status === filterStatus.toUpperCase()) &&
    (search === '' || c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))

  const groups = new Map<string, { root?: RegNode; items: Array<{ ctrl: any; node?: RegNode }> }>()
  regControls.filter(matchesFilters).forEach((c: any) => {
    const node = primaryNodeOf(c)
    const root = node ? rootOf(node.id) : undefined
    const key = root?.id ?? 'uncategorized'
    if (!groups.has(key)) groups.set(key, { root, items: [] })
    groups.get(key)!.items.push({ ctrl: c, node })
  })
  const uncategorizedItems = groups.get('uncategorized')?.items ?? []
  const groupList = Array.from(groups.entries())
    .filter(([key]) => key !== 'uncategorized')
    .map(([, g]) => g)
    .filter(g => filterRootId === 'All' || g.root?.id === filterRootId)
    .sort((a, b) => (a.root?.orderIndex ?? 0) - (b.root?.orderIndex ?? 0))

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
      {showDeleteReg && <DeleteRegulationModal reg={reg} onClose={() => setShowDeleteReg(false)} onDeleted={onBack} />}

      {/* Add Existing Control Modal */}
      {showAddExisting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => { setShowAddExisting(false); setSelectedToAdd([]) }}>
          <div className="bg-white rounded-xl shadow-xl w-[680px] max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
              <div>
                <p className="text-[17px] font-bold text-slate-900">Add Existing Controls</p>
                <p className="text-[13.5px] text-slate-400 mt-0.5">
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
                    className={`px-3 py-1.5 text-[14px] font-medium rounded-lg transition-colors ${addExistingMode === m ? 'bg-[#1A3E5C] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
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
                    className="w-full pl-8 pr-3 h-8 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
              {/* ── Family browser ── */}
              {addExistingMode === 'family' && (
                <div className="p-3 space-y-1">
                  {(controlFamiliesData as any[])?.length === 0 && (
                    <p className="text-center text-[14px] text-slate-400 py-8">No control families defined yet. Create them in Control Families.</p>
                  )}
                  {(controlFamiliesData as any[] ?? []).map((fam: any) => {
                    const famKey = `fam-${fam.id}`
                    const famOpen = expandedGroups.has(famKey)
                    const famControls = fam.controls
                      .map((m: any) => m.control)
                      .filter((c: any) => !regControlIds.has(c.id))
                    return (
                      <div key={fam.id} className="border border-[#64748B]/20 rounded-lg overflow-hidden">
                        <button onClick={() => toggleGroup(famKey)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-left">
                          {famOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="text-[22px]">{fam.icon ?? '🔒'}</span>
                          <span className="text-[15px] font-bold text-slate-800 flex-1">{fam.name}</span>
                          <span className="text-[12.5px] text-slate-400">{famControls.length} available</span>
                        </button>
                        {famOpen && famControls.map((ctrl: any) => {
                          const isSelected = selectedToAdd.includes(ctrl.id)
                          return (
                            <div key={ctrl.id}
                              className="flex items-center gap-3 px-4 py-2.5 border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => setSelectedToAdd(p => p.includes(ctrl.id) ? p.filter(id => id !== ctrl.id) : [...p, ctrl.id])}>
                              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-[#1A3E5C] border-[#1A3E5C]' : 'border-slate-300'}`}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <p className="text-[14.5px] font-medium text-slate-800 flex-1">{ctrl.title}</p>
                              <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{ctrl.status}</span>
                            </div>
                          )
                        })}
                        {famOpen && famControls.length === 0 && (
                          <p className="px-4 py-3 text-[14px] text-slate-400">All controls from this family are already in this regulation.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* ── All Controls flat list ── */}
              {addExistingMode === 'all' && (
                availableToAdd.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[14.5px] text-slate-400">
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
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'bg-[#1A3E5C] border-[#1A3E5C]' : 'border-slate-300'
                        }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14.5px] font-semibold text-slate-800 truncate">{ctrl.title}</p>
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {(ctrl.citedRegulationIds ?? []).map((rid: string) => {
                            const r = allRegulations.find((x: any) => x.id === rid)
                            return r ? (
                              <span key={rid} className="text-[12px] font-semibold px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                                {r.shortCode}
                              </span>
                            ) : null
                          })}
                          <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                            }`}>{ctrl.status}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center gap-3 flex-shrink-0 bg-slate-50/50">
              <span className="text-[14px] text-slate-400 flex-1">
                {selectedToAdd.length > 0
                  ? `${selectedToAdd.length} control${selectedToAdd.length > 1 ? 's' : ''} selected`
                  : 'Select controls to add'}
              </span>
              <button onClick={() => { setShowAddExisting(false); setSelectedToAdd([]) }}
                className="px-4 py-2 border border-[#64748B]/20 text-[15px] text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleAddExistingControls}
                disabled={selectedToAdd.length === 0 || addingControls}
                className="px-4 py-2 bg-[#1A3E5C] hover:bg-[#15324a] disabled:opacity-50 text-white text-[15px] font-semibold rounded-lg transition-colors flex items-center gap-2">
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
          className="flex items-center gap-1.5 text-[14px] text-slate-500 hover:text-slate-800 border border-[#64748B]/20 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Regulations
        </button>
        <span className="text-slate-300">/</span>
        <span className="font-mono text-[13px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {reg.shortCode}
        </span>
        <span className="text-[15px] font-semibold text-slate-800">{reg.name}</span>
        <span className={`text-[12.5px] px-2 py-0.5 rounded-full font-semibold ${reg.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>{reg.status}</span>
      </div>

      <div className="bg-white border border-[#64748B]/20 rounded-xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>
              {reg.name}
            </h2>
            <p className="text-[14px] text-slate-500 mt-0.5 mb-3">{reg.description}</p>
            <div className="flex gap-6 text-[13.5px] text-slate-500 flex-wrap">
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
            <button onClick={() => setShowEditReg(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-slate-600 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => {
                if (confirm('Archive this regulation?')) archiveReg(reg.id)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-slate-600 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
              <Archive className="w-3.5 h-3.5" /> Archive
            </button>
            <button onClick={() => setShowDeleteReg(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Sub-tabs — Controls (library for this regulation) vs Structure (the node hierarchy + applicability categories) */}
      <div className="flex border-b border-[#64748B]/20 gap-0">
        {(['Controls', 'Structure'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${subTab === t ? 'border-[#1A3E5C] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t}
            {t === 'Structure' && <span className="text-[12px] text-slate-400">({nodes.length})</span>}
            {t === 'Controls' && <span className="text-[12px] text-slate-400">({regControls.length})</span>}
          </button>
        ))}
      </div>

      {subTab === 'Structure' && <StructureExplorer regulationId={reg.id} />}

      {subTab === 'Controls' && (
        <>
      <div className="flex items-center justify-between">
        <p className="text-[15px] font-semibold text-slate-800">
          Controls{' '}
          <span className="text-slate-400 font-normal text-[14px]">({regControls.length} controls)</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddExisting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] text-slate-600 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
            + Add Existing Control
          </button>
          <button onClick={() => setShowControlForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[14px] font-medium bg-[#1A3E5C] hover:bg-[#15324a] text-white rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Create New Control
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white border border-[#64748B]/20 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
        </div>
        <select value={filterRootId} onChange={e => setFilterRootId(e.target.value)}
          className="h-8 px-2 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-700 focus:outline-none bg-white min-w-[160px]">
          <option value="All">All Groups</option>
          {nodeTree.map(n => <option key={n.id} value={n.id}>{n.code}{n.title ? ` — ${n.title}` : ''}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="h-8 px-2 rounded-lg border border-[#64748B]/20 text-[14px] text-slate-700 focus:outline-none bg-white min-w-[110px]">
          {['All', 'Published', 'Draft'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div className="space-y-4 mt-4">
        {groupList.map(group => {
          const root = group.root!
          const isOpen = expandedGroups.has(root.id)

          // Sub-group by each control's own node (e.g. Section under a Chapter,
          // or Standard under a Part) so the finer-grained breakdown still shows
          // inside the root group, generalized to whatever depth this regulation uses.
          const subGroups = new Map<string, { node?: RegNode; items: Array<{ ctrl: any; node?: RegNode }> }>()
          group.items.forEach(item => {
            const isDirect = !item.node || item.node.id === root.id
            const key = isDirect ? 'direct' : item.node!.id
            if (!subGroups.has(key)) subGroups.set(key, { node: isDirect ? undefined : item.node, items: [] })
            subGroups.get(key)!.items.push(item)
          })
          const subGroupList = Array.from(subGroups.values()).sort((a, b) => (a.node?.orderIndex ?? -1) - (b.node?.orderIndex ?? -1))

          return (
            <div key={root.id} className="bg-white border border-[#64748B]/20 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <button onClick={() => toggleGroup(root.id)}
                className="w-full flex items-center gap-2 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left border-b border-slate-100/50">
                {isOpen
                  ? <ChevronDown className="w-4 h-4 text-slate-500" />
                  : <ChevronRight className="w-4 h-4 text-slate-500" />}
                <span className="text-[10.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-slate-200/60 text-slate-500">{root.nodeType}</span>
                <span className="text-[16px] font-bold text-slate-800 flex-1">{root.code}{root.title ? ` — ${root.title}` : ''}</span>
                <span className="text-[13.5px] font-semibold text-slate-500 px-2 py-0.5 rounded-lg bg-slate-200/50">{group.items.length} controls</span>
              </button>
              {isOpen && (
                <div className="p-5 bg-slate-50/30 space-y-6">
                  {subGroupList.map((sg, i) => (
                    <div key={sg.node?.id ?? `direct-${i}`}>
                      {subGroupList.length > 1 && (
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#64748B]/15">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#64748B] flex-shrink-0"></span>
                          <h4 className="text-[14.5px] font-bold text-slate-700 flex-1">
                            {sg.node ? `${sg.node.code}${sg.node.title ? ' — ' + sg.node.title : ''}` : `Direct to ${root.code}`}
                          </h4>
                          <span className="text-[13px] font-medium text-slate-400">{sg.items.length} controls</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {sg.items.map(({ ctrl, node }) => (
                          <ControlCard key={ctrl.id} ctrl={ctrl}
                            nodeLabel={node ? pathLabel(node.id) : undefined}
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

        {uncategorizedItems.length > 0 && filterRootId === 'All' && (
          <div className="bg-white border border-[#64748B]/20 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
              <span className="text-[16px] font-bold text-slate-800 flex-1">Unmapped Controls</span>
              <span className="text-[13.5px] font-semibold text-slate-500 px-2 py-0.5 rounded-lg bg-slate-200/50">{uncategorizedItems.length} controls</span>
            </div>
            <div className="p-5 bg-slate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {uncategorizedItems.map(({ ctrl }) => (
                  <ControlCard key={ctrl.id} ctrl={ctrl}
                    onSelect={() => setSelectedControl(ctrl)}
                    onPublish={() => publishControl(ctrl.id)} />
                ))}
              </div>
            </div>
          </div>
        )}

        {regControls.length === 0 && (
          <div className="bg-white border border-[#64748B]/20 rounded-xl p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <p className="text-[15px] text-slate-400">No controls yet.</p>
            <button onClick={() => setShowControlForm(true)}
              className="mt-3 text-[14.5px] text-slate-600 font-medium underline hover:text-slate-900">
              Create the first control
            </button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}

// ─── Controls grouped under one regulation (flat "Controls" tab) ─────────────
function ControlsByRegulationGroup({ reg, controls, expanded, toggleExpand, selectControl, onPublish, color }: {
  reg: any
  controls: any[]
  expanded: Set<string>
  toggleExpand: (key: string) => void
  selectControl: (ctrl: any) => void
  onPublish: (id: string) => void
  color: string
}) {
  const { data: nodesData } = useRegulationNodes(reg.id)
  const nodes: RegNode[] = nodesData ?? []
  const nodeById = new Map(nodes.map(n => [n.id, n]))

  const rootOf = (nodeId: string): RegNode | undefined => {
    let cur = nodeById.get(nodeId)
    while (cur?.parentId && nodeById.has(cur.parentId)) cur = nodeById.get(cur.parentId)
    return cur
  }
  const primaryNodeOf = (c: any): RegNode | undefined => {
    const links = (c.nodes ?? []).filter((l: any) => l.node.regulationId === reg.id)
    if (links.length === 0) return undefined
    return (links.find((l: any) => l.isPrimary) ?? links[0]).node
  }

  const groups = new Map<string, { root?: RegNode; items: any[] }>()
  controls.forEach((c: any) => {
    const node = primaryNodeOf(c)
    const root = node ? rootOf(node.id) : undefined
    const key = root?.id ?? 'uncategorized'
    if (!groups.has(key)) groups.set(key, { root, items: [] })
    groups.get(key)!.items.push(c)
  })
  const groupList = Array.from(groups.entries())
    .sort(([, a], [, b]) => (a.root?.orderIndex ?? 999) - (b.root?.orderIndex ?? 999))

  return (
    <div className="bg-white border border-[#64748B]/20 rounded-xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: `${color}14` }}>
          <Shield style={{ width: 12, height: 12, color }} />
        </div>
        <span className="text-[14.5px] font-bold text-slate-800">{reg.name}</span>
        <span className="font-mono text-[12px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}14`, color }}>
          {reg.shortCode}
        </span>
        <span className="ml-auto text-[13px] text-slate-400">{controls.length} controls</span>
      </div>
      {groupList.map(([key, group]) => {
        const label = group.root ? `${group.root.code}${group.root.title ? ` — ${group.root.title}` : ''}` : 'Unmapped'
        const groupKey = `${reg.id}-${key}`
        const isOpen = expanded.has(groupKey)

        // Sub-group by each control's own node (e.g. Section under a Chapter)
        // so the finer breakdown still shows within the root group.
        const subGroups = new Map<string, { node?: RegNode; items: any[] }>()
        group.items.forEach((ctrl: any) => {
          const node = primaryNodeOf(ctrl)
          const isDirect = !node || (group.root && node.id === group.root.id)
          const subKey = isDirect ? 'direct' : node!.id
          if (!subGroups.has(subKey)) subGroups.set(subKey, { node: isDirect ? undefined : node, items: [] })
          subGroups.get(subKey)!.items.push(ctrl)
        })
        const subGroupList = Array.from(subGroups.values()).sort((a, b) => (a.node?.orderIndex ?? -1) - (b.node?.orderIndex ?? -1))

        return (
          <div key={key} className="border-t border-slate-100">
            <button onClick={() => toggleExpand(groupKey)}
              className="w-full flex items-center gap-2 px-5 py-2 hover:bg-slate-50 text-left transition-colors">
              {isOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
              {group.root && <span className="text-[9.5px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 bg-slate-100 text-slate-500">{group.root.nodeType}</span>}
              <span className="text-[14px] font-semibold text-slate-700 flex-1">{label}</span>
              <span className="text-[13px] text-slate-400">{group.items.length} controls</span>
            </button>
            {isOpen && subGroupList.map((sg, i) => (
              <div key={sg.node?.id ?? `direct-${i}`}>
                {subGroupList.length > 1 && (
                  <div className="flex items-center gap-2 pl-9 pr-5 py-1.5 bg-slate-50/60 border-t border-slate-50">
                    <span className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                      {sg.node ? `${sg.node.code}${sg.node.title ? ' — ' + sg.node.title : ''}` : `Direct to ${group.root?.code}`}
                    </span>
                    <span className="text-[11.5px] text-slate-400">· {sg.items.length}</span>
                  </div>
                )}
                {sg.items.map((ctrl: any) => (
                  <div key={ctrl.id}
                    className="flex items-center gap-4 pl-11 pr-6 py-2 border-t border-slate-50 hover:bg-white transition-colors bg-white/50">
                    <span className="font-mono text-[12px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex-shrink-0">
                      {ctrl.id.slice(0, 8)}
                    </span>
                    <p className="flex-1 text-[14px] font-medium text-slate-800">{ctrl.title}</p>
                    <span className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                      {ctrl.applicableTo === 'DATA_FIDUCIARY' ? 'DF' : ctrl.applicableTo === 'SIGNIFICANT_DF' ? 'SDF' : 'Both'}
                    </span>
                    <span className="text-[12.5px] text-slate-400">
                      {ctrl._count?.predefinedActions ?? ctrl.predefinedActions?.length ?? 0} actions
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[12px] font-bold ${ctrl.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {ctrl.status}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => selectControl(ctrl)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="View detail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {ctrl.status === 'DRAFT' && (
                        <button onClick={() => onPublish(ctrl.id)} className="p-1 text-slate-400 hover:text-green-600 transition-colors" title="Publish">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })}
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

  const filterRegId = filterReg === 'All' ? null : regulations.find((r: any) => r.shortCode === filterReg)?.id
  const filteredControls = controls.filter((c: any) =>
    (!filterRegId || c.citedRegulationIds?.includes(filterRegId)) &&
    (c.title.toLowerCase().includes(search.toLowerCase()))
  )

  const groupedByReg = regulations
    .map((r: any) => ({
      reg: r,
      controls: controls.filter((c: any) =>
        c.citedRegulationIds?.includes(r.id) &&
        (filterReg === 'All' || filterReg === r.shortCode) &&
        c.title.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((g: any) => g.controls.length > 0)

  const REG_COLORS: Record<string, string> = {
    DPDP: '#3B82F6', RBI: '#10B981', SEBI: '#8B5CF6',
    IRDAI: '#F97316', CERT: '#06B6D4',
  }

  const getRegColor = (shortCode: string) => {
    return REG_COLORS[shortCode] || '#64748b'
  }

  return (
    <div className="space-y-4" style={{ fontFamily: 'Inter, sans-serif' }}>
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
          <h1 className="text-[24px] font-bold text-slate-900 tracking-tight"
            style={{ fontFamily: 'Cinzel, serif' }}>
            Regulations & Controls
          </h1>
          <p className="text-[14px] text-slate-400 mt-0.5">
            {regulations.length} regulations · {controls.length} controls in library
          </p>
        </div>
        {mainTab === 'Regulations' ? (
          <button onClick={() => setShowRegForm(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] active:scale-[0.98] text-white text-[15px] font-medium rounded-lg transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Create Regulation
          </button>
        ) : (
          <button onClick={() => setShowControlForm(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1A3E5C] hover:bg-[#15324a] active:scale-[0.98] text-white text-[15px] font-medium rounded-lg transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Create Control
          </button>
        )}
      </div>

      <div className="flex border-b border-[#64748B]/20 gap-0">
        {(['Regulations', 'Controls'] as const).map(tab => (
          <button key={tab} onClick={() => setMainTab(tab)}
            className={`px-5 py-2 text-[14.5px] font-medium border-b-2 transition-colors -mb-px ${mainTab === tab
                ? 'border-[#1A3E5C] text-slate-900'
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
              <span className="text-[15px]">Loading regulations...</span>
            </div>
          ) : regulations.length === 0 ? (
            <div className="bg-white border border-[#64748B]/20 rounded-xl p-16 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-[16px] font-semibold text-slate-700">No regulations yet</p>
              <p className="text-[14px] text-slate-400 mt-1 mb-4">
                Create your first regulation to start building the control library
              </p>
              <button onClick={() => setShowRegForm(true)}
                className="px-4 py-2 bg-[#1A3E5C] text-white text-[15px] font-medium rounded-lg hover:bg-[#15324a] transition-colors">
                Create First Regulation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {regulations.map((r: any) => {
                const color = getRegColor(r.shortCode)
                const regControls = controls.filter((c: any) => c.citedRegulationIds?.includes(r.id))
                return (
                  <div key={r.id}
                    className="bg-white border border-[#64748B]/20 rounded-xl p-4 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all cursor-pointer group shadow-[0_1px_6px_rgba(0,0,0,0.04)]"
                    onClick={() => setSelectedRegId(r.id)}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}14` }}>
                        <Shield style={{ width: 18, height: 18, color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15.5px] font-bold text-slate-900 leading-tight">
                          {r.name}
                        </p>
                        <p className="text-[12.5px] text-slate-400 mt-0.5 line-clamp-2">
                          {r.description?.slice(0, 80)}…
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-slate-500 mb-2">
                      <span className="font-semibold text-slate-700">{regControls.length} Controls</span>
                      <span>·</span>
                      <span>{r.jurisdiction}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[12.5px] mb-3">
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
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-medium border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors">
                        <Eye className="w-3 h-3" /> View Controls
                      </button>
                      <button onClick={() => { setSelectedRegId(r.id) }} className="flex items-center gap-1 px-2 py-1.5 text-[13px] text-slate-500 border border-[#64748B]/20 rounded-lg hover:bg-slate-50 transition-colors" title="Open to edit">
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
          <div className="flex items-center gap-2 bg-white border border-[#64748B]/20 rounded-xl p-2.5 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search controls…"
                className="w-full pl-8 pr-3 h-8 rounded-lg border border-[#64748B]/20 text-[14.5px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilterReg('All')}
                className={`px-3 py-1 rounded-full text-[13.5px] font-medium transition-all ${filterReg === 'All'
                    ? 'bg-[#1A3E5C] text-white'
                    : 'border border-[#64748B]/20 text-slate-600 hover:border-slate-400'
                  }`}>
                All
              </button>
              {regulations.map((r: any) => {
                const color = getRegColor(r.shortCode)
                return (
                  <button key={r.id}
                    onClick={() => setFilterReg(filterReg === r.shortCode ? 'All' : r.shortCode)}
                    className={`px-3 py-1 rounded-full text-[13.5px] font-medium transition-all ${filterReg === r.shortCode
                        ? 'text-white'
                        : 'border border-[#64748B]/20 text-slate-600 hover:border-slate-400'
                      }`}
                    style={filterReg === r.shortCode ? { background: color } : {}}>
                    {r.shortCode}
                  </button>
                )
              })}
            </div>
            <span className="ml-auto text-[13px] text-slate-400 font-medium">
              {filteredControls.length} controls
            </span>
          </div>

          {controlsLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[15px]">Loading controls...</span>
            </div>
          ) : groupedByReg.length === 0 ? (
            <div className="bg-white border border-[#64748B]/20 rounded-xl p-12 text-center shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <p className="text-[15px] text-slate-400">No controls found.</p>
            </div>
          ) : (
            groupedByReg.map(({ reg, controls: regControls }: any) => (
              <ControlsByRegulationGroup key={reg.id} reg={reg} controls={regControls}
                expanded={expandedChapters} toggleExpand={toggleChapter}
                selectControl={setSelectedControl} onPublish={publishControl}
                color={getRegColor(reg.shortCode)} />
            ))
          )}
        </div>
      )}
    </div>
  )
}