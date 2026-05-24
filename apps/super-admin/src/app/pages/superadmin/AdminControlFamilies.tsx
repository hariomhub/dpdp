import React, { useState } from 'react'
import { Plus, Trash2, Edit2, ChevronDown, ChevronRight, X, Loader2, Search, Tag, Layers } from 'lucide-react'
import {
  useControlFamilies, useCreateControlFamily, useUpdateControlFamily,
  useDeleteControlFamily, useAddControlsToFamily, useRemoveControlFromFamily,
} from '../../../hooks/useControlFamilies'
import { useControls } from '../../../hooks/useControls'
import { useRegulations } from '../../../hooks/useRegulations'
import { ControlForm } from './AdminControls'


function FamilyFormModal({ initial, onClose }: {
  initial?: { id: string; name: string; description: string | null; icon: string | null; color: string | null }
  onClose: () => void
}) {
  const createMut = useCreateControlFamily()
  const updateMut = useUpdateControlFamily()
  const [form, setForm] = useState({
    name:        initial?.name        ?? '',
    description: initial?.description ?? '',
  })
  const up = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const isEdit = !!initial

  const handleSave = async () => {
    if (!form.name.trim()) return
    if (isEdit) {
      await updateMut.mutateAsync({ id: initial!.id, ...form })
    } else {
      await createMut.mutateAsync(form)
    }
    onClose()
  }

  const isPending = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">{isEdit ? 'Edit' : 'Create'} Control Family</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Name *</label>
            <input value={form.name} onChange={e => up('name', e.target.value)} placeholder="e.g., Access Management"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Description</label>
            <textarea value={form.description} onChange={e => up('description', e.target.value)}
              rows={2} placeholder="Brief description of this control group"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none focus:border-slate-700 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim() || isPending}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[13px] font-semibold rounded-lg flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Create Family'} →
          </button>
        </div>
      </div>
    </div>
  )
}

function AssignControlsModal({ familyId, familyName, assignedControlIds, onClose }: {
  familyId: string; familyName: string; assignedControlIds: string[]; onClose: () => void
}) {
  const { data: controlsData } = useControls({ limit: '200' })
  const addMut    = useAddControlsToFamily()
  const removeMut = useRemoveControlFromFamily()
  const controls  = (controlsData as any)?.data ?? []
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedControlIds))

  const filtered = controls.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) => setSelected(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const handleSave = async () => {
    const toAdd    = [...selected].filter(id => !assignedControlIds.includes(id))
    const toRemove = assignedControlIds.filter(id => !selected.has(id))
    await Promise.all([
      toAdd.length    > 0 ? addMut.mutateAsync({ familyId, controlIds: toAdd })                               : null,
      ...toRemove.map(controlId => removeMut.mutateAsync({ familyId, controlId })),
    ])
    onClose()
  }

  const [showCreateControl, setShowCreateControl] = useState(false)
  const { data: regulationsData } = useRegulations()
  const regulations = regulationsData?.data ?? []

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-xl w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
            <div>
              <p className="text-[15px] font-bold text-slate-900">Assign Controls — {familyName}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{selected.size} selected</p>
            </div>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="p-4 border-b border-slate-200 flex-shrink-0 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search controls…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
            </div>
            <button onClick={() => setShowCreateControl(true)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> New Control
            </button>
          </div>
        <div className="overflow-y-auto flex-1 p-2">
          {filtered.map((c: any) => (
            <label key={c.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)}
                className="mt-0.5 accent-slate-800 w-4 h-4 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[12.5px] font-medium text-slate-800">{c.title}</p>
                <p className="text-[11px] text-slate-400 line-clamp-1">{c.description}</p>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${c.status === 'PUBLISHED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
                {c.status}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={addMut.isPending || removeMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2">
            {(addMut.isPending || removeMut.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Assignments →
          </button>
        </div>
      </div>
    </div>
    {showCreateControl && (
      <ControlForm
        onClose={() => setShowCreateControl(false)}
        regulations={regulations}
      />
    )}
    </>
  )
}

export function AdminControlFamilies() {
  const { data: families = [], isLoading } = useControlFamilies()
  const deleteMut = useDeleteControlFamily()
  const [expanded,    setExpanded]    = useState<Set<string>>(new Set())
  const [editFamily,  setEditFamily]  = useState<any>(null)
  const [assignFor,   setAssignFor]   = useState<any>(null)
  const [showCreate,  setShowCreate]  = useState(false)

  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      {showCreate  && <FamilyFormModal onClose={() => setShowCreate(false)} />}
      {editFamily  && <FamilyFormModal initial={editFamily} onClose={() => setEditFamily(null)} />}
      {assignFor   && (
        <AssignControlsModal
          familyId={assignFor.id} familyName={assignFor.name}
          assignedControlIds={assignFor.controls.map((c: any) => c.control.id)}
          onClose={() => setAssignFor(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Control Families</h1>
          <p className="text-[12.5px] text-slate-500 mt-1">Group controls by domain for easier regulation building.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg">
          <Plus className="w-4 h-4" /> New Family
        </button>
      </div>

      {(families as any[]).length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-500">No control families yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Create families to group controls by domain (e.g., Access Management, Data Protection).</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg">
            Create First Family
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {(families as any[]).map((family: any) => (
            <div key={family.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4">
                <button onClick={() => toggle(family.id)} className="flex-shrink-0">
                  {expanded.has(family.id) ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-slate-900">{family.name}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                      {family._count.controls} controls
                    </span>
                  </div>
                  {family.description && <p className="text-[12px] text-slate-400 mt-0.5">{family.description}</p>}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setAssignFor(family)}
                    className="px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                    Manage Controls
                  </button>
                  <button onClick={() => setEditFamily(family)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMut.mutate(family.id)}
                    disabled={family._count.controls > 0}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expanded.has(family.id) && family.controls.length > 0 && (
                <div className="border-t border-slate-100 px-5 py-3 space-y-1.5">
                  {family.controls.map((m: any) => (
                    <div key={m.control.id} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-slate-50">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.control.status === 'PUBLISHED' ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <p className="text-[12.5px] text-slate-700 flex-1">{m.control.title}</p>
                      <span className="text-[10.5px] text-slate-400">{m.control.applicableTo}</span>
                    </div>
                  ))}
                </div>
              )}
              {expanded.has(family.id) && family.controls.length === 0 && (
                <div className="border-t border-slate-100 px-5 py-4 text-center text-[12px] text-slate-400">
                  No controls assigned yet.{' '}
                  <button onClick={() => setAssignFor(family)} className="text-blue-600 hover:underline">Add controls →</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}