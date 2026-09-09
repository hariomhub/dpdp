import React, { useState } from 'react'
import { Plus, Edit2, X, Loader2, Cloud, ExternalLink, ShieldAlert } from 'lucide-react'
import {
  useCloudProviderTypes, useCreateCloudProviderType, useUpdateCloudProviderType,
  useToggleCloudProviderActive, type ProviderCategory, type CloudProviderType,
} from '../../../hooks/useCloudProviderTypes'
import { Toggle } from '../../components/shared/Toggle'

const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  CLOUD_INFRASTRUCTURE:    'Cloud Infrastructure',
  IDENTITY_SAAS:           'Identity & SaaS Workspace',
  DEVOPS_SOURCE:           'DevOps / Source & Supply Chain',
  DATABASE_SERVICE:        'Database-as-a-Service',
  EDGE_PLATFORM:           'Edge / Platform',
  CONTAINER_ORCHESTRATION: 'Container Orchestration',
  EMERGING:                'Emerging',
}
const CATEGORY_ORDER: ProviderCategory[] = [
  'CLOUD_INFRASTRUCTURE', 'IDENTITY_SAAS', 'DEVOPS_SOURCE',
  'DATABASE_SERVICE', 'EDGE_PLATFORM', 'CONTAINER_ORCHESTRATION', 'EMERGING',
]

function ProviderModal({ initial, onClose }: { initial?: CloudProviderType; onClose: () => void }) {
  const createMut = useCreateCloudProviderType()
  const updateMut = useUpdateCloudProviderType()
  const isEdit = !!initial

  const [form, setForm] = useState({
    key:              initial?.key ?? '',
    displayName:      initial?.displayName ?? '',
    category:         initial?.category ?? 'CLOUD_INFRASTRUCTURE' as ProviderCategory,
    logoUrl:          initial?.logoUrl ?? '',
    docsUrl:          initial?.docsUrl ?? '',
    credentialSchema: initial ? JSON.stringify(initial.credentialSchema, null, 2) : '{\n  "title": "",\n  "properties": {},\n  "required": []\n}',
  })
  const [schemaError, setSchemaError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.displayName.trim()) return
    if (!isEdit && !form.key.trim()) return

    let parsedSchema: object
    try {
      parsedSchema = JSON.parse(form.credentialSchema)
      setSchemaError(null)
    } catch {
      setSchemaError('Credential schema must be valid JSON')
      return
    }

    const payload = {
      displayName: form.displayName,
      category: form.category,
      credentialSchema: parsedSchema,
      logoUrl: form.logoUrl || undefined,
      docsUrl: form.docsUrl || undefined,
    }

    if (isEdit) await updateMut.mutateAsync({ id: initial!.id, ...payload })
    else        await createMut.mutateAsync({ key: form.key.trim().toLowerCase(), ...payload })
    onClose()
  }

  const pending = createMut.isPending || updateMut.isPending

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[520px] max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#64748B]/20">
          <p className="text-[17px] font-bold text-slate-900">{isEdit ? 'Edit' : 'Add'} Cloud Provider</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Provider Key *</label>
              <input value={form.key} disabled={isEdit}
                onChange={e => setForm(p => ({ ...p, key: e.target.value }))}
                placeholder="e.g., azure"
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] font-mono focus:outline-none focus:border-slate-700 disabled:bg-slate-50 disabled:text-slate-400" />
              <p className="text-[12.5px] text-slate-400 mt-1">Must match Prowler's provider key exactly. Immutable after creation.</p>
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ProviderCategory }))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none bg-white focus:border-slate-700">
                {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Display Name *</label>
            <input value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
              placeholder="e.g., Microsoft Azure"
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-slate-700" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Logo URL</label>
              <input value={form.logoUrl} onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-slate-700" />
            </div>
            <div>
              <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Docs URL</label>
              <input value={form.docsUrl} onChange={e => setForm(p => ({ ...p, docsUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[15px] focus:outline-none focus:border-slate-700" />
            </div>
          </div>
          <div>
            <label className="block text-[13.5px] font-medium text-slate-600 mb-1">Credential Schema (JSON) *</label>
            <textarea value={form.credentialSchema} onChange={e => setForm(p => ({ ...p, credentialSchema: e.target.value }))}
              rows={7}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-[13.5px] font-mono focus:outline-none focus:border-slate-700 resize-none" />
            <p className="text-[12.5px] text-slate-400 mt-1">The exact fields a tenant must provide to connect this provider — mirrors Prowler's own credential schema.</p>
            {schemaError && <p className="text-[13px] text-red-600 mt-1 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> {schemaError}</p>}
          </div>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-[#64748B]/20">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[15px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!form.displayName.trim() || (!isEdit && !form.key.trim()) || pending}
            className="flex-1 py-2 bg-[#1A3E5C] text-white text-[15px] font-semibold rounded-lg hover:bg-[#15324a] disabled:opacity-50 flex items-center justify-center gap-2">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save' : 'Create'} →
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminCloudProviders() {
  const { data: providers = [], isLoading } = useCloudProviderTypes()
  const toggleMut = useToggleCloudProviderActive()
  const [editProvider, setEditProvider] = useState<CloudProviderType | null>(null)
  const [showNew, setShowNew] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  const byCategory = CATEGORY_ORDER.map(cat => ({
    category: cat,
    items: (providers as CloudProviderType[]).filter(p => p.category === cat),
  })).filter(g => g.items.length > 0)

  const activeCount = (providers as CloudProviderType[]).filter(p => p.isActive).length

  return (
    <div className="max-w-[1400px] mx-auto">
      {showNew && <ProviderModal onClose={() => setShowNew(false)} />}
      {editProvider && <ProviderModal initial={editProvider} onClose={() => setEditProvider(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[26px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Cloud Provider Registry</h1>
          <p className="text-[14.5px] text-slate-500 mt-1">
            Master catalog of providers Prowler can scan. {activeCount} of {providers.length} active — active providers become selectable by tenants when connecting a cloud account.
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[15px] font-semibold rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      <div className="space-y-6">
        {byCategory.map(({ category, items }) => (
          <div key={category}>
            <p className="text-[12.5px] font-bold text-slate-400 uppercase tracking-[0.14em] mb-2 px-1">
              {CATEGORY_LABELS[category]} <span className="text-slate-300 font-medium normal-case tracking-normal">· {items.length}</span>
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {items.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 bg-white border border-[#64748B]/20 rounded-xl shadow-sm shadow-slate-900/[0.03]">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Cloud className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15.5px] font-semibold text-slate-900">{p.displayName}</p>
                      <span className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{p.key}</span>
                      {p.docsUrl && (
                        <a href={p.docsUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-500">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-[13px] text-slate-400 mt-0.5">{p._count.assetTemplates} asset template{p._count.assetTemplates === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[12.5px] font-semibold ${p.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Toggle
                        checked={p.isActive}
                        disabled={toggleMut.isPending}
                        onChange={next => toggleMut.mutate({ id: p.id, isActive: next })}
                        label={`Toggle ${p.displayName} active`}
                      />
                    </div>
                    <button onClick={() => setEditProvider(p)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
