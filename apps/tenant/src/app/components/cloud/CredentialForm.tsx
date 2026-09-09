import React, { useMemo, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface SchemaField {
  type: string;
  description?: string;
  format?: string;
  deprecated?: boolean;
  default?: unknown;
}

interface SubSchema {
  title?: string;
  properties: Record<string, SchemaField>;
  required?: string[];
}

interface CredentialSchema {
  title?: string;
  properties?: Record<string, SchemaField>;
  required?: string[];
  oneOf?: SubSchema[];
}

const SECRET_PATTERN = /secret|password|token|private|key$|key_content/i;

function fieldLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function SecretInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full h-9 pl-3 pr-9 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] font-mono focus:outline-none focus:border-[#1A3E5C] focus:ring-1 focus:ring-[#1A3E5C]"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/**
 * Renders a form from a provider's credentialSchema (mirrors Prowler's own
 * credential JSON schema — see cloud-provider-types seed data). Handles two
 * shapes: a single schema, or a `oneOf` list of alternative credential
 * types (e.g. AWS "static keys" vs "assume role") — for oneOf, a segmented
 * control picks which alternative, then that one's fields render.
 */
export function CredentialForm({ schema, values, onChange }: {
  schema: CredentialSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  const alternatives = schema.oneOf ?? [{ title: schema.title, properties: schema.properties ?? {}, required: schema.required ?? [] }];
  const [activeIdx, setActiveIdx] = useState(0);
  const active = alternatives[activeIdx];

  const fieldNames = useMemo(() => Object.keys(active.properties), [active]);

  const setField = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="space-y-4">
      {alternatives.length > 1 && (
        <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
          {alternatives.map((alt, i) => (
            <button
              key={alt.title ?? i}
              type="button"
              onClick={() => { setActiveIdx(i); onChange({}); }}
              className={`flex-1 px-3 py-1.5 rounded-md text-[14.5px] font-semibold transition-colors ${
                i === activeIdx ? 'bg-white text-[#1A3E5C] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {alt.title ?? `Option ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {fieldNames.map(name => {
          const field = active.properties[name];
          if (field.deprecated) return null;
          const isRequired = (active.required ?? []).includes(name);
          const isSecret = SECRET_PATTERN.test(name);
          const value = values[name];

          if (field.type === 'boolean') {
            return (
              <label key={name} className="flex items-center gap-2 text-[15px] text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={e => setField(name, e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#1A3E5C] focus:ring-[#1A3E5C]"
                />
                {fieldLabel(name)}
              </label>
            );
          }

          if (field.type === 'object' || field.type === 'array') {
            return (
              <div key={name}>
                <label className="block text-[14px] font-medium text-slate-600 mb-1">
                  {fieldLabel(name)}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  value={typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : ''}
                  onChange={e => setField(name, e.target.value)}
                  placeholder={field.type === 'object' ? 'Paste JSON content...' : 'One value per line...'}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[14px] font-mono focus:outline-none focus:border-[#1A3E5C] resize-none"
                />
                {field.description && <p className="text-[13px] text-slate-400 mt-1">{field.description}</p>}
              </div>
            );
          }

          return (
            <div key={name}>
              <label className="block text-[14px] font-medium text-slate-600 mb-1">
                {fieldLabel(name)}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {isSecret ? (
                <SecretInput
                  value={(value as string) ?? ''}
                  onChange={v => setField(name, v)}
                  placeholder={field.description}
                />
              ) : (
                <input
                  type={field.type === 'integer' ? 'number' : field.format === 'email' ? 'email' : 'text'}
                  value={(value as string) ?? ''}
                  onChange={e => setField(name, field.type === 'integer' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.description}
                  className="w-full h-9 px-3 rounded-md bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none focus:border-[#1A3E5C] focus:ring-1 focus:ring-[#1A3E5C]"
                />
              )}
              {field.description && !isSecret && (
                <p className="text-[13px] text-slate-400 mt-1">{field.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function isCredentialFormValid(schema: CredentialSchema, values: Record<string, unknown>): boolean {
  const alternatives = schema.oneOf ?? [{ properties: schema.properties ?? {}, required: schema.required ?? [] }];
  // With oneOf, we don't know here which alternative is active — the caller
  // re-derives it the same way the form does (activeIdx state lives in the
  // form component). To keep this check simple and safe, validity here
  // just requires every alternative's required-field union to have *some*
  // satisfying subset filled — in practice the form only ever writes one
  // alternative's fields into `values` at a time (onChange resets on tab
  // switch), so checking against whichever alternative currently has the
  // most of its required fields present is an accurate proxy.
  const bestMatch = alternatives.reduce((best, alt) => {
    const required = alt.required ?? [];
    const filled = required.filter(r => values[r] !== undefined && values[r] !== '').length;
    return filled > best.filled ? { alt, filled } : best;
  }, { alt: alternatives[0], filled: -1 });

  const required = bestMatch.alt.required ?? [];
  return required.every(r => values[r] !== undefined && values[r] !== '');
}
