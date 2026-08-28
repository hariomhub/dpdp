import React, { useMemo, useState } from 'react'
import { Plus, X, Loader2, Link2, Search, ChevronRight, Trash2, ShieldAlert } from 'lucide-react'
import {
  useControlCheckMappings, useCreateCheckMapping, useUpdateCheckMapping, useDeleteCheckMapping,
  useBrowseChecks, type ScannerCheckInfo, type ControlCheckMapping,
} from '../../../hooks/useControlCheckMappings'
import { useCloudProviderTypes } from '../../../hooks/useCloudProviderTypes'
import { useControls } from '../../../hooks/useControls'
import { Toggle } from '../../components/shared/Toggle'

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700',
  high: 'bg-amber-50 text-amber-700',
  medium: 'bg-blue-50 text-blue-700',
  low: 'bg-slate-100 text-slate-500',
}

function MappingModal({ onClose }: { onClose: () => void }) {
  const { data: providers = [] } = useCloudProviderTypes()
  const { data: controls = [] } = useControls()
  const createMut = useCreateCheckMapping()

  const [providerId, setProviderId] = useState('')
  const providerKey = (providers as any[]).find(p => p.id === providerId)?.key ?? null
  const { data: checks = [], isLoading: checksLoading } = useBrowseChecks(providerKey)

  const [search, setSearch] = useState('')
  const [selectedCheck, setSelectedCheck] = useState<ScannerCheckInfo | null>(null)
  const [controlId, setControlId] = useState('')
  const [actionId, setActionId] = useState('')
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT')

  const filteredChecks = useMemo(() => {
    if (!search.trim()) return checks.slice(0, 60)
    const q = search.toLowerCase()
    return checks.filter(c => c.check_id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)).slice(0, 60)
  }, [checks, search])

  const selectedControl = (controls as any[]).find(c => c.id === controlId)
  const actions = selectedControl?.predefinedActions ?? []

  const handleCreate = async () => {
    if (!selectedCheck || !actionId || !providerId) return
    await createMut.mutateAsync({
      predefinedActionId: actionId,
      providerId,
      checkId: selectedCheck.check_id,
      checkTitle: selectedCheck.title,
      checkSeverity: selectedCheck.severity,
      status,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[640px] max-h-[85vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <p className="text-[15px] font-bold text-slate-900">Map a Check to a Control Action</p>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Step 1: provider */}
          <div>
            <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Provider *</label>
            <select value={providerId} onChange={e => { setProviderId(e.target.value); setSelectedCheck(null) }}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
              <option value="">Select provider…</option>
              {(providers as any[]).map((p: any) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
          </div>

          {/* Step 2: browse real checks */}
          {providerId && (
            <div>
              <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Check *</label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search real Prowler checks by ID or title…"
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-300 text-[12.5px] focus:outline-none focus:border-slate-700" />
              </div>
              {checksLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
              ) : (
                <div className="border border-slate-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {filteredChecks.length === 0 ? (
                    <p className="text-[12px] text-slate-400 text-center py-4">No checks match "{search}"</p>
                  ) : filteredChecks.map(c => (
                    <button key={c.check_id} onClick={() => setSelectedCheck(c)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${selectedCheck?.check_id === c.check_id ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-slate-800 truncate flex-1">{c.title}</p>
                        <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0 ${SEVERITY_STYLE[c.severity] ?? 'bg-slate-100 text-slate-500'}`}>{c.severity}</span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 font-mono mt-0.5">{c.check_id}</p>
                    </button>
                  ))}
                  {checks.length > 60 && !search && (
                    <p className="text-[10.5px] text-slate-400 text-center py-2">Showing first 60 of {checks.length} — search to narrow down.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: control + action */}
          {selectedCheck && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-[12px] text-blue-800 flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 flex-shrink-0" /> Mapping <span className="font-mono font-semibold">{selectedCheck.check_id}</span> →
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Control *</label>
                  <select value={controlId} onChange={e => { setControlId(e.target.value); setActionId('') }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                    <option value="">Select control…</option>
                    {(controls as any[]).map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Action *</label>
                  <select value={actionId} onChange={e => setActionId(e.target.value)} disabled={!controlId}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700 disabled:bg-slate-50">
                    <option value="">Select action…</option>
                    {actions.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11.5px] font-medium text-slate-600 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] focus:outline-none bg-white focus:border-slate-700">
                  <option value="DRAFT">Draft — not yet used for finding routing</option>
                  <option value="PUBLISHED">Published — live, findings will route through it</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleCreate} disabled={!selectedCheck || !actionId || createMut.isPending}
            className="flex-1 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2">
            {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Mapping →
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminCheckMappings() {
  const { data: mappings = [], isLoading } = useControlCheckMappings()
  const updateMut = useUpdateCheckMapping()
  const deleteMut = useDeleteCheckMapping()
  const [showNew, setShowNew] = useState(false)

  if (isLoading) return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>

  return (
    <div className="max-w-5xl mx-auto">
      {showNew && <MappingModal onClose={() => setShowNew(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Control ↔ Check Mappings</h1>
          <p className="text-[12.5px] text-slate-500 mt-1">
            Maps a real Prowler check to a control action — when the check passes on a tenant's resource, that's automated evidence; when it fails, that's an automated gap finding.
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[13px] font-semibold rounded-lg flex-shrink-0">
          <Plus className="w-4 h-4" /> Map a Check
        </button>
      </div>

      {mappings.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-slate-500">No mappings yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Map a handful of high-value checks to start — this catalog is meant to grow incrementally, not be complete on day one.</p>
          <button onClick={() => setShowNew(true)} className="mt-4 px-4 py-2 bg-slate-900 text-white text-[13px] font-semibold rounded-lg">
            Map the First Check
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
          {mappings.map(m => (
            <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-slate-900 font-mono">{m.checkId}</p>
                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium">{m.provider.displayName}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${m.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                  </span>
                  {m.checkSeverity && (
                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold uppercase ${SEVERITY_STYLE[m.checkSeverity] ?? 'bg-slate-100 text-slate-500'}`}>{m.checkSeverity}</span>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-500 mt-0.5">{m.checkTitle}</p>
                <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-1">
                  {m.predefinedAction.control.title} <ChevronRight className="w-3 h-3" /> {m.predefinedAction.title}
                </p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10.5px] font-semibold ${m.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {m.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Toggle
                    checked={m.isActive}
                    disabled={updateMut.isPending}
                    onChange={next => updateMut.mutate({ id: m.id, isActive: next })}
                    label={`Toggle ${m.checkId} active`}
                  />
                </div>
                <button onClick={() => { if (confirm(`Delete mapping for "${m.checkId}"?`)) deleteMut.mutate(m.id) }}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
