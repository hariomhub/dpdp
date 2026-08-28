import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2, Database, Truck, AlertTriangle, Trash2, Edit2, Plus,
  ChevronDown, ChevronRight, X, UserCheck
} from 'lucide-react';
import {
  useListDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useCreateAsset, useUpdateAsset, useDeleteAsset,
  useCreateSupplier, useUpdateSupplier, useDeleteSupplier,
  useCreatePiiRecord, useUpdatePiiRecord, useDeletePiiRecord,
  useCreateSupplierAsset, useDeleteSupplierAsset
} from '../../../hooks/useOrg';
import { DeptForm, AssetForm, SupplierForm, PIIForm } from '../../components/onboarding/OrgStructureGraph';
import { CloudConnectionsPanel } from '../../components/cloud/CloudConnectionsPanel';
import { queryKeys } from '../../../lib/query-keys';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SettingsOrgStructure() {
  const qc = useQueryClient();
  const { data: depts = [], isLoading } = useListDepartments();
  
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  
  const createPii = useCreatePiiRecord();
  const updatePii = useUpdatePiiRecord();
  const deletePii = useDeletePiiRecord();
  
  const createSuppAsset = useCreateSupplierAsset();
  const deleteSuppAsset = useDeleteSupplierAsset();

  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});

  const [modalState, setModalState] = useState<{
    type: 'addDept' | 'editDept' | 'addAsset' | 'editAsset' | 'addSupplier' | 'editSupplier' | 'addPII' | 'editPII' | 'addSuppAsset';
    deptId?: string; assetId?: string; suppId?: string; piiId?: string;
  } | null>(null);

  if (isLoading) return <div className="animate-pulse space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-12 bg-slate-100 rounded-lg" />)}</div>;

  const allDeptNames = depts.map(d => d.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Organization Structure</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">Manage departments, assets, and suppliers. Changes here immediately affect compliance tasks.</p>
        </div>
        <button onClick={() => setModalState({ type: 'addDept' })} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-[12.5px] font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Department
        </button>
      </div>

      <CloudConnectionsPanel />

      {depts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-300 rounded-lg">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-[13px] text-slate-500 font-medium">No departments yet</p>
          <p className="text-[11.5px] text-slate-400 mt-1">Add your first department to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {depts.map((dept: any) => {
            const isExp = expandedDepts[dept.id];
            const deptAssets = dept.assets || [];
            const deptSuppliers = dept.suppliers || [];
            
            return (
              <div key={dept.id} className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <button onClick={() => setExpandedDepts(p => ({ ...p, [dept.id]: !p[dept.id] }))} className="text-slate-400 p-1 hover:text-slate-700 rounded transition-colors">
                    {isExp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-slate-800">{dept.name}</span>
                  <span className="text-[11px] text-slate-400 font-medium">{deptAssets.length} assets · {deptSuppliers.length} suppliers</span>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => setModalState({ type: 'addAsset', deptId: dept.id })} className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded text-[10.5px] font-bold transition-colors">+ Asset</button>
                    <button onClick={() => setModalState({ type: 'addSupplier', deptId: dept.id })} className="px-2 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded text-[10.5px] font-bold transition-colors">+ Supplier</button>
                    <button onClick={() => setModalState({ type: 'editDept', deptId: dept.id })} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm(`Delete "${dept.name}"?`)) deleteDept.mutate(dept.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {isExp && (
                  <div className="bg-slate-50/50 px-4 pb-4 pt-1 space-y-4 border-t border-slate-100">
                    
                    {/* ASSETS */}
                    {deptAssets.length > 0 && (
                      <div className="ml-6 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">Own Assets</p>
                        {deptAssets.map((asset: any) => {
                          const aExp = expandedAssets[asset.id];
                          const piiRecs = asset.piiRecords || [];
                          return (
                            <div key={asset.id} className="bg-white border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                                <button onClick={() => setExpandedAssets(p => ({ ...p, [asset.id]: !p[asset.id] }))} className="text-slate-400 p-0.5 hover:text-slate-700">
                                  {aExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                <Database className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                <span className="flex-1 text-[12.5px] font-medium text-slate-800">{asset.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{asset.assetType?.replace(/_/g,' ')}</span>
                                {piiRecs.length === 0 && <span className="flex items-center gap-1 text-[10px] text-amber-600 px-2"><AlertTriangle className="w-3 h-3" /> No PII</span>}
                                <div className="flex items-center gap-1 ml-2">
                                  <button onClick={() => setModalState({ type: 'addPII', deptId: dept.id, assetId: asset.id })} className="px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-[10px] font-bold transition-colors">+ PII</button>
                                  <button onClick={() => setModalState({ type: 'editAsset', deptId: dept.id, assetId: asset.id })} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="Edit Asset"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={() => { if (confirm(`Delete asset "${asset.name}"?`)) deleteAsset.mutate(asset.id); }} className="p-1 text-slate-400 hover:text-red-500 rounded" title="Delete Asset"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                              {aExp && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-2 space-y-1">
                                  {piiRecs.length === 0 ? <p className="text-[11px] text-slate-400 italic px-2 py-1">No PII records added.</p> : piiRecs.map((pii: any) => (
                                    <div key={pii.id} className="flex items-center gap-2 pl-8 pr-2 py-1.5 text-[11.5px] hover:bg-white rounded transition-colors group">
                                      <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                                      <span className="flex-1 text-slate-700"><span className="font-medium text-slate-900">{pii.categories?.join(', ')}</span> · {pii.principalType} · {pii.legalBasis}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded">{pii.sensitivity}</span>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        <button onClick={() => setModalState({ type: 'editPII', deptId: dept.id, assetId: asset.id, piiId: pii.id })} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit2 className="w-3 h-3" /></button>
                                        <button onClick={() => { if (confirm('Delete PII record?')) deletePii.mutate(pii.id); }} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SUPPLIERS */}
                    {deptSuppliers.length > 0 && (
                      <div className="ml-6 space-y-2 mt-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1">Suppliers</p>
                        {deptSuppliers.map((supp: any) => {
                          const sExp = expandedSuppliers[supp.id];
                          const suppAssets = supp.supplierAssets || [];
                          return (
                            <div key={supp.id} className="bg-white border border-slate-200 rounded-lg">
                              <div className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                                <button onClick={() => setExpandedSuppliers(p => ({ ...p, [supp.id]: !p[supp.id] }))} className="text-slate-400 p-0.5 hover:text-slate-700">
                                  {sExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                                <Truck className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                                <span className="flex-1 text-[12.5px] font-medium text-slate-800">{supp.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{supp.supplierType}</span>
                                <div className="flex items-center gap-1 ml-2">
                                  <button onClick={() => setModalState({ type: 'addSuppAsset', deptId: dept.id, suppId: supp.id })} className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[10px] font-bold transition-colors">+ Vendor Asset</button>
                                  <button onClick={() => setModalState({ type: 'editSupplier', deptId: dept.id, suppId: supp.id })} className="p-1 text-slate-400 hover:text-blue-600 rounded"><Edit2 className="w-3 h-3" /></button>
                                  <button onClick={() => { if (confirm(`Delete supplier "${supp.name}"?`)) deleteSupplier.mutate(supp.id); }} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>
                              {sExp && (
                                <div className="border-t border-slate-100 bg-slate-50/50 p-2 space-y-1">
                                  {suppAssets.length === 0 ? <p className="text-[11px] text-slate-400 italic px-2 py-1">No vendor assets added.</p> : suppAssets.map((sa: any) => (
                                    <div key={sa.id} className="flex items-center gap-2 pl-8 pr-2 py-1.5 text-[11.5px] hover:bg-white rounded transition-colors group">
                                      <Database className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                      <span className="flex-1 text-slate-700"><span className="font-medium text-slate-900">{sa.name}</span></span>
                                      <span className="text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded">{sa.assetType?.replace(/_/g,' ')}</span>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                        {/* Simplified: skipping full edit for vendor assets for now, just delete */}
                                        <button onClick={() => { if (confirm(`Delete vendor asset "${sa.name}"?`)) deleteSuppAsset.mutate(sa.id); }} className="p-1 text-slate-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {deptAssets.length === 0 && deptSuppliers.length === 0 && (
                      <p className="text-[11.5px] text-slate-400 italic py-2 pl-6">No assets or suppliers added to this department yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALS ── */}
      {modalState?.type === 'addDept' && (
        <Modal title="Add Department" onClose={() => setModalState(null)}>
          <DeptForm initial={{}} existingNames={allDeptNames} onCancel={() => setModalState(null)}
            onSave={(data) => {
              createDept.mutate({ name: data.name!, description: data.description });
              setModalState(null);
            }} />
        </Modal>
      )}
      {modalState?.type === 'editDept' && (
        <Modal title="Edit Department" onClose={() => setModalState(null)}>
          <DeptForm initial={(depts.find(d => d.id === modalState.deptId) as any) || {}} existingNames={allDeptNames.filter(n => n !== depts.find(d => d.id === modalState.deptId)?.name)} onCancel={() => setModalState(null)}
            onSave={(data) => {
              updateDept.mutate({ id: modalState.deptId!, name: data.name, description: data.description || undefined });
              setModalState(null);
            }} />
        </Modal>
      )}

      {modalState?.type === 'addAsset' && (
        <Modal title="Add Asset" onClose={() => setModalState(null)}>
          <AssetForm initial={{}} existingNames={depts.find(d => d.id === modalState.deptId)?.assets.map((a: any) => a.name) || []} onCancel={() => setModalState(null)}
            onSave={(data) => {
              createAsset.mutate({ deptId: modalState.deptId!, ...data } as any);
              setModalState(null);
              setExpandedDepts(p => ({ ...p, [modalState.deptId!]: true }));
            }} />
        </Modal>
      )}
      {modalState?.type === 'editAsset' && (
        <Modal title="Edit Asset" onClose={() => setModalState(null)}>
          <AssetForm initial={depts.find(d => d.id === modalState.deptId)?.assets.find((a: any) => a.id === modalState.assetId) || {}} existingNames={[]} onCancel={() => setModalState(null)}
            onSave={(data) => {
              updateAsset.mutate({ ...data, id: modalState.assetId! });
              setModalState(null);
            }} />
        </Modal>
      )}

      {modalState?.type === 'addSupplier' && (
        <Modal title="Add Supplier" onClose={() => setModalState(null)}>
          <SupplierForm initial={{}} onCancel={() => setModalState(null)}
            onSave={(data) => {
              createSupplier.mutate({ deptId: modalState.deptId!, ...data } as any);
              setModalState(null);
              setExpandedDepts(p => ({ ...p, [modalState.deptId!]: true }));
            }} />
        </Modal>
      )}
      {modalState?.type === 'editSupplier' && (
        <Modal title="Edit Supplier" onClose={() => setModalState(null)}>
          <SupplierForm initial={depts.find(d => d.id === modalState.deptId)?.suppliers.find((s: any) => s.id === modalState.suppId) || {}} onCancel={() => setModalState(null)}
            onSave={(data) => {
              updateSupplier.mutate({ ...data, id: modalState.suppId! });
              setModalState(null);
            }} />
        </Modal>
      )}

      {modalState?.type === 'addPII' && (
        <Modal title="Add PII Record" onClose={() => setModalState(null)}>
          <PIIForm initial={{}} onCancel={() => setModalState(null)}
            onSave={(data) => {
              createPii.mutate({ assetId: modalState.assetId!, ...data } as any);
              setModalState(null);
              setExpandedAssets(p => ({ ...p, [modalState.assetId!]: true }));
            }} />
        </Modal>
      )}
      {modalState?.type === 'editPII' && (
        <Modal title="Edit PII Record" onClose={() => setModalState(null)}>
          <PIIForm initial={depts.find(d => d.id === modalState.deptId)?.assets.find((a: any) => a.id === modalState.assetId)?.piiRecords.find((p: any) => p.id === modalState.piiId) || {}} onCancel={() => setModalState(null)}
            onSave={(data) => {
              updatePii.mutate({ ...data, id: modalState.piiId! });
              setModalState(null);
            }} />
        </Modal>
      )}

      {modalState?.type === 'addSuppAsset' && (
        <Modal title="Add Vendor Asset" onClose={() => setModalState(null)}>
          <AssetForm initial={{}} existingNames={[]} onCancel={() => setModalState(null)}
            onSave={(data) => {
              createSuppAsset.mutate({ supplierId: modalState.suppId!, ...data } as any);
              setModalState(null);
              setExpandedSuppliers(p => ({ ...p, [modalState.suppId!]: true }));
            }} />
        </Modal>
      )}

    </div>
  );
}
