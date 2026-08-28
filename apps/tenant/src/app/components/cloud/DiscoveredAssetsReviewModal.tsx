import React, { useState } from 'react';
import {
  Database, Server, HelpCircle, Loader2, CheckCircle2, XCircle, MapPin, Tag,
} from 'lucide-react';
import { CloudModal } from './CloudModal';
import { useDiscoveredDrafts, useConfirmDraft, useDismissDraft, type DiscoveredAssetDraft } from '../../../hooks/useDiscovery';
import { useListDepartments } from '../../../hooks/useOrg';

const ASSET_TYPE_LABELS: Record<string, string> = {
  DATABASE_DATA_STORE: 'Database / Data Store',
  SYSTEM_APPLICATION: 'System / Application',
  DATA_FLOW: 'Data Flow',
  THIRD_PARTY_VENDOR: 'Third-Party Vendor',
  CONSENT_MECHANISM: 'Consent Mechanism',
  PHYSICAL_HARDWARE: 'Physical / Hardware',
  API_INTEGRATION: 'API / Integration Layer',
  MOBILE_APPLICATION: 'Mobile Application',
  LEGACY_SYSTEM: 'Legacy System',
  SAAS_THIRD_PARTY: 'SaaS (Third-Party Hosted)',
  OUTSOURCED_MANAGED: 'Outsourced / Managed Service',
  IN_HOUSE_CLOUD: 'In-House (Cloud Hosted)',
  IN_HOUSE_ON_PREMISE: 'In-House (On-Premise)',
  THIRD_PARTY_CLOUD: 'Third-Party (Cloud Hosted)',
};

const ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS);

function ConfirmDraftModal({ draft, onClose }: { draft: DiscoveredAssetDraft; onClose: () => void }) {
  const { data: departments = [] } = useListDepartments();
  const confirmMut = useConfirmDraft();

  const [departmentId, setDepartmentId] = useState('');
  const [assetType, setAssetType] = useState(draft.suggestedAssetType ?? '');
  const needsAssetType = !draft.suggestedAssetType;

  const handleConfirm = async () => {
    if (!departmentId || !assetType) return;
    await confirmMut.mutateAsync({
      draftId: draft.id,
      departmentId,
      overrides: needsAssetType || assetType !== draft.suggestedAssetType ? { assetType } : undefined,
    });
    onClose();
  };

  return (
    <CloudModal title="Confirm as asset" subtitle={draft.name} onClose={onClose}>
      <div className="space-y-4">
        {needsAssetType && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 text-[12px]">
            This resource type isn't in the asset catalog yet — pick an asset type manually to continue.
          </div>
        )}

        <div>
          <label className="block text-[12px] font-medium text-slate-600 mb-1">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500"
          >
            <option value="">Select a department...</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[12px] font-medium text-slate-600 mb-1">
            Asset Type <span className="text-red-500">*</span>
          </label>
          <select
            value={assetType}
            onChange={e => setAssetType(e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-[13px] focus:outline-none focus:border-blue-500"
          >
            <option value="">Select...</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{ASSET_TYPE_LABELS[t]}</option>)}
          </select>
          {draft.suggestedAssetType && (
            <p className="text-[11px] text-slate-400 mt-1">Suggested from the scan — change it if it's not right.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-5 mt-5 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!departmentId || !assetType || confirmMut.isPending}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {confirmMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Create Asset
        </button>
      </div>
    </CloudModal>
  );
}

function DraftRow({ draft, onConfirm }: { draft: DiscoveredAssetDraft; onConfirm: () => void }) {
  const dismissMut = useDismissDraft();
  const recognized = !!draft.suggestedAssetType;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${recognized ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
        {recognized ? <Database className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-800 truncate">{draft.name}</p>
          {recognized ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium flex-shrink-0">
              {ASSET_TYPE_LABELS[draft.suggestedAssetType!] ?? draft.suggestedAssetType}
            </span>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded font-medium flex-shrink-0">
              Unrecognized
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{draft.region}</span>
          <span className="font-mono">{draft.cloudResourceType}</span>
          {draft.internetFacing && <span className="text-red-500 font-medium">Internet-facing</span>}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => dismissMut.mutate(draft.id)}
          disabled={dismissMut.isPending}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Dismiss"
        >
          <XCircle className="w-4 h-4" />
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[12px] font-semibold rounded-lg transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
        </button>
      </div>
    </div>
  );
}

export function DiscoveredAssetsReviewModal({ connectionId, onClose }: { connectionId?: string; onClose: () => void }) {
  const { data: drafts = [], isLoading } = useDiscoveredDrafts(connectionId);
  const [confirming, setConfirming] = useState<DiscoveredAssetDraft | null>(null);

  const recognizedCount = drafts.filter(d => d.suggestedAssetType).length;
  const unrecognizedCount = drafts.length - recognizedCount;

  return (
    <>
      <CloudModal
        title="Review discovered assets"
        subtitle={drafts.length > 0 ? `${recognizedCount} classified automatically, ${unrecognizedCount} need a manual asset type` : undefined}
        onClose={onClose}
        width="max-w-2xl"
      >
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Server className="w-10 h-10 text-slate-300 mb-3" />
            <h3 className="text-[14px] font-semibold text-slate-700">Nothing to review</h3>
            <p className="text-[12.5px] text-slate-400 mt-1 max-w-xs">
              Either no scan has completed yet, or every discovered resource has already been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map(draft => (
              <DraftRow key={draft.id} draft={draft} onConfirm={() => setConfirming(draft)} />
            ))}
          </div>
        )}
      </CloudModal>

      {confirming && (
        <ConfirmDraftModal draft={confirming} onClose={() => setConfirming(null)} />
      )}
    </>
  );
}
