import React, { useState } from 'react';
import {
  Cloud, Plus, RotateCw, Trash2, ScanSearch, ChevronRight, Loader2,
} from 'lucide-react';
import {
  useCloudConnections, useRetestCloudConnection, useDisconnectCloudConnection,
  type CloudConnection,
} from '../../../hooks/useCloudConnections';
import { useTriggerDiscovery } from '../../../hooks/useDiscovery';
import { ConnectCloudAccountModal } from './ConnectCloudAccountModal';
import { DiscoveredAssetsReviewModal } from './DiscoveredAssetsReviewModal';

// Same visual pattern as DesignSystem's StatusChip (dot + pill), but with
// its own label→color map — connection status labels ("Connecting…",
// "Connected", "Failed") don't semantically match anything already in that
// shared map, and forcing a fit there would mean showing the wrong word
// just to borrow a color.
const STATUS_META: Record<CloudConnection['status'], { label: string; bg: string; text: string; dot: string }> = {
  PENDING:      { label: 'Connecting…', bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500 animate-pulse' },
  CONNECTED:    { label: 'Connected',   bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  FAILED:       { label: 'Failed',      bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
  DISCONNECTED: { label: 'Disconnected', bg: 'bg-slate-100', text: 'text-slate-500',  dot: 'bg-slate-400' },
};

function ConnectionStatusChip({ status }: { status: CloudConnection['status'] }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[13px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ConnectionRow({ connection }: { connection: CloudConnection }) {
  const retestMut = useRetestCloudConnection();
  const disconnectMut = useDisconnectCloudConnection();
  const discoverMut = useTriggerDiscovery();
  const [reviewing, setReviewing] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border border-[#D4AF37]/35 rounded-lg">
        <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-[15px] font-bold text-slate-600">
          {connection.providerDisplayName[0]}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] font-semibold text-slate-800 truncate">{connection.alias}</p>
            <ConnectionStatusChip status={connection.status} />
          </div>
          <p className="text-[13.5px] text-slate-400 mt-0.5">
            {connection.providerDisplayName}
            {connection.status === 'FAILED' && connection.lastError && (
              <span className="text-red-500"> — {connection.lastError}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {connection.status === 'CONNECTED' && (
            <>
              <button
                onClick={() => discoverMut.mutate(connection.id)}
                disabled={discoverMut.isPending}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13.5px] font-medium text-[#1A3E5C] bg-[#1A3E5C]/8 hover:bg-[#1A3E5C]/12 rounded-lg transition-colors"
              >
                <ScanSearch className="w-3.5 h-3.5" /> Scan
              </button>
              {connection._count.discoveredAssets > 0 && (
                <button
                  onClick={() => setReviewing(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[13.5px] font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                >
                  {connection._count.discoveredAssets} found <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </>
          )}
          {connection.status === 'FAILED' && (
            <button
              onClick={() => retestMut.mutate(connection.id)}
              disabled={retestMut.isPending}
              className="p-1.5 text-slate-400 hover:text-[#D4AF37] hover:bg-[#1A3E5C]/8 rounded-lg transition-colors"
              title="Retest connection"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => { if (confirm(`Disconnect "${connection.alias}"?`)) disconnectMut.mutate(connection.id) }}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Disconnect"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {reviewing && (
        <DiscoveredAssetsReviewModal connectionId={connection.id} onClose={() => setReviewing(false)} />
      )}
    </>
  );
}

export function CloudConnectionsPanel() {
  const { data: connections = [], isLoading } = useCloudConnections();
  const [connecting, setConnecting] = useState(false);

  return (
    <div className="bg-white border border-[#D4AF37]/35 rounded-xl shadow-sm shadow-slate-900/[0.04] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#1A3E5C]" /> Cloud Connections
          </h3>
          <p className="text-[14px] text-slate-400 mt-0.5">
            Connect a cloud or SaaS account to discover assets automatically instead of adding them by hand.
          </p>
        </div>
        {connections.length > 0 && (
          <button
            onClick={() => setConnecting(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-700 text-[14px] font-medium rounded-lg hover:bg-slate-50 transition-colors flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Connect Another
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : connections.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-300 rounded-lg">
          <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-[14.5px] text-slate-500 font-medium">No cloud accounts connected</p>
          <button
            onClick={() => setConnecting(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1A3E5C] hover:bg-[#15324a] text-white text-[14px] font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Connect a Cloud Account
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map(c => <ConnectionRow key={c.id} connection={c} />)}
        </div>
      )}

      {connecting && <ConnectCloudAccountModal onClose={() => setConnecting(false)} />}
    </div>
  );
}
