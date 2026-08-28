import React, { useState } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, Boxes, Layers } from 'lucide-react'
import {
  useGenericAssetTemplates, useCreateGenericAssetTemplate, useUpdateGenericAssetTemplate,
  useDeleteGenericAssetTemplate, ASSET_TYPES, ASSET_TYPE_LABELS, type GenericAssetTemplate,
} from '../../../hooks/useGenericAssetTemplates'
import { useCloudProviderTypes } from '../../../hooks/useCloudProviderTypes'
import { Toggle } from '../../components/shared/Toggle'

const CRITICALITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const CRITICALITY_STYLE: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-500',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700',
  CRITICAL: 'bg-red-50 text-red-700',
}

function TemplateModal({ initial, onClose }: { initial?: GenericAssetTemplate; onClose: () => void }) {
  const { data: providers = [] } = useCloudProviderTypes()
  const createMut = useCreateGenericAssetTemplate()
  const updateMut = useUpdateGenericAssetTemplate()
  const isEdit = !!initial

  const [form, setForm] = useState({
    providerId:         initial?.providerId ?? '',
    cloudResourceType:  initial?.cloudResourceType ?? '',
    displayName:        initial?.displayName ?? '',
    assetType:          initial?.assetType ?? ASSET_TYPES[0],
    defaultCriticality: initial?.defaultCriticality ?? 'MEDIUM',
    status:             initial?.status ?? 'DRAFT' as 'DRAFT' | 'PUBLISHED',
  })

  const handleSave = async () => {
    if (!form.displayName.trim() || !form.cloudResourceType.trim() || (!isEdit && !form.providerId)) return
    if (isEdit) {
      await updateMut.mutateAsync({
        id: initial!.id, displayName: form.displayName, assetType: form.assetType,
        defaultCriticality: form.defaultCriticality, status: form.status,
      })
    } else {
      await createMut.mutateAsync(form)
    }
    onClose()
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <p className="text-[15px] font-bold text-slate-900">{isEdit ? 'Edit' : 'Add'} Asset Template</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Provider *</label>
            <select value={form.providerId} disabled={isEdit}
              onChange={e => setForm(p => ({ ...p, providerId: e.target.value }))}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700 disabled:bg-slate-50 disabled:text-slate-400">
              <option value="">Select provider…</option>
              {(providers as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Cloud Resource Type *</label>
            <input value={form.cloudResourceType} disabled={isEdit}
              onChange={e => setForm(p => ({ ...p, cloudResourceType: e.target.value }))}
              placeholder="e.g., microsoft.storage/storageaccounts"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] font-mono focus:outline-none focus:border-slate-700 disabled:bg-slate-50 disabled:text-slate-400" />
            <p className="text-[10.5px] text-slate-400 mt-1">The exact ResourceType string from Prowler's check metadata for this provider.</p>
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Display Name *</label>
            <input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
              placeholder="e.g., Azure Storage Account"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:border-slate-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Asset Type *</label>
              <select value={form.assetType} onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Default Criticality</label>
              <select value={form.defaultCriticality} onChange={e => setForm(p => ({ ...p, defaultCriticality: e.target.value }))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                {CRITICALITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'DRAFT' | 'PUBLISHED' }))}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
              <option value="DRAFT">Draft — not yet used for matching</option>
              <option value="PUBLISHED">Published — live for discovery matching</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave}
            disabled={!form.displayName.trim() || !form.cloudResourceType.trim() || (!isEdit && !form.providerId) || pending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Create'} →
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminGenericAssetCatalog() {
  const { data: templates = [], isLoading } = useGenericAssetTemplates()
  const { data: providers = [] } = useCloudProviderTypes()
  const updateMut = useUpdateGenericAssetTemplate()
  const deleteMut = useDeleteGenericAssetTemplate()
  const [editTemplate, setEditTemplate] = useState<GenericAssetTemplate | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [providerFilter, setProviderFilter] = useState<string>('')

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  const filtered = providerFilter
    ? (templates as GenericAssetTemplate[]).filter(t => t.providerId === providerFilter)
    : (templates as GenericAssetTemplate[])

  return (
    <div className="max-w-5xl mx-auto">
      {showNew && <TemplateModal onClose={() => setShowNew(false)} />}
      {editTemplate && <TemplateModal initial={editTemplate} onClose={() => setEditTemplate(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Generic Asset Catalog</h1>
          <p className="text-[12.5px] text-slate-500 mt-1">
            Maps each provider's native resource type to an asset type, so discovered cloud resources arrive at onboarding pre-classified instead of blank.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none bg-white focus:border-slate-700">
            <option value="">All providers</option>
            {(providers as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
          </select>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg">
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-500">No asset templates yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Map a provider's real resource type to an asset type to start building the catalog.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg">
            Add First Template
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {filtered.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Layers className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13.5px] font-semibold text-slate-900">{t.displayName}</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{t.provider.displayName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${t.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${CRITICALITY_STYLE[t.defaultCriticality] ?? 'bg-slate-100 text-slate-500'}`}>
                    {t.defaultCriticality}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{t.cloudResourceType}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">→ {ASSET_TYPE_LABELS[t.assetType] ?? t.assetType}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-semibold ${t.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {t.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Toggle
                    checked={t.isActive}
                    disabled={updateMut.isPending}
                    onChange={next => updateMut.mutate({ id: t.id, isActive: next })}
                    label={`Toggle ${t.displayName} active`}
                  />
                </div>
                <button onClick={() => setEditTemplate(t)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm(`Delete template "${t.displayName}"?`)) deleteMut.mutate(t.id) }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
