import React from 'react';
import { X } from 'lucide-react';

// Same visual shell used by SettingsOrgStructure's local Modal — kept as
// its own component here (rather than importing that page's private one)
// so both Onboarding and Settings share one consistent implementation for
// the cloud-connections feature specifically.
export function CloudModal({ title, subtitle, onClose, children, width = 'max-w-lg' }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className={`w-full ${width} bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h3 className="text-[17px] font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-[14px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
