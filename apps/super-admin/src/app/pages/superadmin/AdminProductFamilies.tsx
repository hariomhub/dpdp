import React, { useState } from 'react'
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, X, Loader2, Package, ExternalLink } from 'lucide-react'
import {
  useProductFamilies, useCreateProductFamily, useUpdateProductFamily, useDeleteProductFamily,
  useCreateProduct, useUpdateProduct, useDeleteProduct,
} from '../../../hooks/useProductFamilies'

const CATEGORIES = ['IAM', 'Data Protection', 'Monitoring', 'SIEM', 'Endpoint Security', 'Cloud Security', 'Network Security', 'GRC', 'Encryption', 'Other']

function FamilyModal({ initial, onClose }: {
  initial?: { id: string; name: string; description: string | null; category: string | null }
  onClose: () => void
}) {
  const createMut = useCreateProductFamily()
  const updateMut = useUpdateProductFamily()
  const [form, setForm] = useState({ name: initial?.name ?? '', description: initial?.description ?? '', category: initial?.category ?? '' })
  const isEdit = !!initial

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (isEdit) await updateMut.mutateAsync({ id: initial!.id, ...form })
    else        await createMut.mutateAsync(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">{isEdit ? 'Edit' : 'Create'} Product Family</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Family Name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g., Identity & Access Management"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700 bg-white">
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none focus:border-slate-700 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Create'} →
          </button>
        </div>
      </div>
    </div>
  )
}

function ProductModal({ initial, familyId, onClose }: {
  initial?: any; familyId?: string; onClose: () => void
}) {
  const { data: families = [] } = useProductFamilies()
  const createMut = useCreateProduct()
  const updateMut = useUpdateProduct()
  const isEdit    = !!initial

  const [form, setForm] = useState({
    name:            initial?.name            ?? '',
    description:     initial?.description     ?? '',
    vendor:          initial?.vendor          ?? '',
    website:         initial?.website         ?? '',
    category:        initial?.category        ?? '',
    productFamilyId: initial?.productFamilyId ?? familyId ?? '',
  })

  const handleSave = async () => {
    if (!form.name.trim()) return
    const data = { ...form, productFamilyId: form.productFamilyId || undefined }
    if (isEdit) await updateMut.mutateAsync({ id: initial.id, ...data })
    else        await createMut.mutateAsync(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">{isEdit ? 'Edit' : 'Add'} Product</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Product Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Microsoft Azure AD"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Vendor</label>
              <input value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                placeholder="e.g., Microsoft"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Website</label>
              <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Product Family</label>
              <select value={form.productFamilyId} onChange={e => setForm(p => ({ ...p, productFamilyId: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                <option value="">Standalone (no family)</option>
                {(families as any[]).map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none focus:border-slate-700 resize-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {(createMut.isPending || updateMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Add Product'} →
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminProductFamilies() {
  const { data: families = [], isLoading } = useProductFamilies()
  const deleteFamilyMut  = useDeleteProductFamily()
  const deleteProductMut = useDeleteProduct()
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set())
  const [editFamily,    setEditFamily]    = useState<any>(null)
  const [showNewFamily, setShowNewFamily] = useState(false)
  const [productModal,  setProductModal]  = useState<{ familyId?: string; initial?: any } | null>(null)

  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      {showNewFamily && <FamilyModal onClose={() => setShowNewFamily(false)} />}
      {editFamily   && <FamilyModal initial={editFamily} onClose={() => setEditFamily(null)} />}
      {productModal && <ProductModal {...productModal} onClose={() => setProductModal(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Product Families</h1>
          <p className="text-[12.5px] text-slate-500 mt-1">Manage tools and software that implement compliance control actions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setProductModal({})}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-[13px] font-medium rounded-lg hover:bg-slate-50">
            <Plus className="w-4 h-4" /> Add Standalone Product
          </button>
          <button onClick={() => setShowNewFamily(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> New Family
          </button>
        </div>
      </div>

      {(families as any[]).length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-500">No product families yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Group compliance tools by category (e.g., IAM Tools, Data Protection).</p>
          <button onClick={() => setShowNewFamily(true)} className="mt-4 px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg">
            Create First Family
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(families as any[]).map((family: any) => (
            <div key={family.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <button onClick={() => toggle(family.id)}>
                  {expanded.has(family.id) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-slate-900">{family.name}</p>
                    {family.category && (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">{family.category}</span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{family._count.products} products</span>
                  </div>
                  {family.description && <p className="text-[12px] text-slate-400 mt-0.5">{family.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setProductModal({ familyId: family.id })}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                  <button onClick={() => setEditFamily(family)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteFamilyMut.mutate(family.id)} disabled={family._count.products > 0}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded.has(family.id) && (
                <div className="border-t border-slate-100 p-3 grid grid-cols-2 gap-2">
                  {family.products.length === 0 ? (
                    <div className="col-span-2 py-4 text-center text-[12px] text-slate-400">
                      No products yet.{' '}
                      <button onClick={() => setProductModal({ familyId: family.id })} className="text-blue-600 hover:underline">Add product →</button>
                    </div>
                  ) : family.products.map((p: any) => (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-[14px]">
                        {p.vendor?.[0] ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[12.5px] font-semibold text-slate-800 truncate">{p.name}</p>
                          {p.website && (
                            <a href={p.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                              className="text-slate-300 hover:text-blue-500 flex-shrink-0">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {p.vendor && <p className="text-[11px] text-slate-400">{p.vendor}</p>}
                        {p._count?.actions > 0 && (
                          <p className="text-[10px] text-blue-600 mt-0.5">{p._count.actions} action(s) use this</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setProductModal({ familyId: family.id, initial: p })}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteProductMut.mutate(p.id)}
                          disabled={p._count?.actions > 0}
                          className="p-1 text-slate-400 hover:text-red-500 rounded disabled:opacity-30 disabled:cursor-not-allowed">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}