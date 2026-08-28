import React, { useState } from 'react';
import {
  Cloud, ShieldCheck, GitBranch, Database, Globe, Box, Sparkles,
  ChevronLeft, Loader2, CheckCircle2,
} from 'lucide-react';
import { CloudModal } from './CloudModal';
import { CredentialForm, isCredentialFormValid } from './CredentialForm';
import { useCloudProviders, useCreateCloudConnection, type CloudProviderOption } from '../../../hooks/useCloudConnections';

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType }> = {
  CLOUD_INFRASTRUCTURE:    { label: 'Cloud Infrastructure',        icon: Cloud },
  IDENTITY_SAAS:           { label: 'Identity & Workspace',        icon: ShieldCheck },
  DEVOPS_SOURCE:           { label: 'DevOps & Source Control',     icon: GitBranch },
  DATABASE_SERVICE:        { label: 'Database Services',           icon: Database },
  EDGE_PLATFORM:           { label: 'Edge & Platform',             icon: Globe },
  CONTAINER_ORCHESTRATION: { label: 'Container Orchestration',     icon: Box },
  EMERGING:                { label: 'Emerging',                    icon: Sparkles },
};

export function ConnectCloudAccountModal({ onClose }: { onClose: () => void }) {
  const { data: providers = [], isLoading } = useCloudProviders();
  const createMut = useCreateCloudConnection();

  const [selected, setSelected] = useState<CloudProviderOption | null>(null);
  const [alias, setAlias] = useState('');
  const [credentials, setCredentials] = useState<Record<string, unknown>>({});
  const [justCreated, setJustCreated] = useState(false);

  const grouped = providers.reduce((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {} as Record<string, CloudProviderOption[]>);

  const handleSubmit = async () => {
    if (!selected) return;
    await createMut.mutateAsync({ providerKey: selected.key, alias: alias.trim(), credentials });
    setJustCreated(true);
  };

  if (justCreated) {
    return (
      <CloudModal title="Connection added" onClose={onClose}>
        <div className="flex flex-col items-center text-center py-6">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <p className="text-[14px] font-semibold text-slate-800">"{alias}" is connecting</p>
          <p className="text-[12.5px] text-slate-500 mt-1.5 max-w-xs">
            Prowler is testing this connection in the background — the status will update automatically in a few seconds.
          </p>
          <button onClick={onClose} className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg transition-colors">
            Done
          </button>
        </div>
      </CloudModal>
    );
  }

  if (!selected) {
    return (
      <CloudModal title="Connect a cloud account" subtitle="Pick a provider to scan for assets and security posture." onClose={onClose} width="max-w-xl">
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : providers.length === 0 ? (
          <p className="text-[13px] text-slate-500 py-8 text-center">No providers are active yet — ask your administrator to enable one.</p>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([category, items]) => {
              const meta = CATEGORY_META[category] ?? { label: category, icon: Cloud };
              const CategoryIcon = meta.icon;
              return (
                <div key={category}>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
                    <CategoryIcon className="w-3 h-3" /> {meta.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map(p => (
                      <button
                        key={p.key}
                        onClick={() => setSelected(p)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-center"
                      >
                        <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-600">
                          {p.displayName[0]}
                        </span>
                        <span className="text-[11.5px] font-medium text-slate-700 leading-tight">{p.displayName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CloudModal>
    );
  }

  const isValid = alias.trim().length > 0 && isCredentialFormValid(selected.credentialSchema, credentials);

  return (
    <CloudModal
      title={`Connect ${selected.displayName}`}
      subtitle="Credentials are encrypted at rest and used only to run scans."
      onClose={onClose}
    >
      <button
        onClick={() => { setSelected(null); setCredentials({}); }}
        className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 mb-4 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Choose a different provider
      </button>

      <div className="space-y-4">
        <div>
          <label className="block text-[12px] font-medium text-slate-600 mb-1">
            Connection Name <span className="text-red-500">*</span>
          </label>
          <input
            value={alias}
            onChange={e => setAlias(e.target.value)}
            placeholder={`e.g., Production ${selected.displayName}`}
            className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[13px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="h-px bg-slate-100" />

        <CredentialForm schema={selected.credentialSchema} values={credentials} onChange={setCredentials} />
      </div>

      <div className="flex gap-3 pt-5 mt-5 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-[13px] text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || createMut.isPending}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Connect
        </button>
      </div>
    </CloudModal>
  );
}
