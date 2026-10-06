import React from 'react';
import { useParams } from 'react-router';
import { Loader2, Award, Printer } from 'lucide-react';
import { useCertificateByCode } from '../../../hooks/useLms';

// Contrast-aware text colors so a chosen background always stays readable,
// plus a real NiyamSaathi brand mark (in a white badge, so it stays legible
// against any background too). Mirrored from the super-admin certificate
// builder's live preview (apps/super-admin/.../AdminLMS.tsx) so what an admin
// previews while authoring a template matches exactly what gets issued here.
// Duplicated rather than shared since the two apps don't share a component
// bundle for this today.
function hexLuminance(hex: string): number {
  const clean = (hex || '#FFFFFF').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(full.substring(0, 2), 16) / 255 || 1;
  const g = parseInt(full.substring(2, 4), 16) / 255 || 1;
  const b = parseInt(full.substring(4, 6), 16) / 255 || 1;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function getCertPalette(bg: string) {
  const isDark = hexLuminance(bg) < 0.5;
  return {
    isDark,
    heading: isDark ? '#FFFFFF' : '#1A3E5C',
    body:    isDark ? 'rgba(255,255,255,0.85)' : '#475569',
    label:   isDark ? 'rgba(255,255,255,0.65)' : '#64748B',
    faint:   isDark ? 'rgba(255,255,255,0.55)' : '#64748B',
    sigLine: isDark ? 'rgba(255,255,255,0.4)'  : '#94A3B8',
  };
}

function CertLogoBadge({ className = 'h-11 px-3', imgClassName = 'h-7' }: { className?: string; imgClassName?: string }) {
  return (
    <div className={`inline-flex items-center justify-center rounded-lg bg-white border border-black/5 shadow-sm flex-shrink-0 ${className}`}>
      <img src="/niyamsaathi_logo.png" alt="NiyamSaathi" className={`w-auto object-contain ${imgClassName}`} />
    </div>
  );
}

// Three genuinely distinct layouts, driven by the template's chosen layout.
function CertificateCard({ layout, bg, title, body, signatory, designation, orgName, certId }: {
  layout: string; bg: string; title: string; body: string
  signatory?: string; designation?: string; orgName: string; certId: string
}) {
  const normalized = (layout || 'CLASSIC').toUpperCase();
  const palette = getCertPalette(bg);

  if (normalized === 'MODERN') {
    return (
      <div className="rounded-xl overflow-hidden flex shadow-sm" style={{ background: bg, minHeight: 320 }}>
        <div className="w-[32%] bg-[#1A3E5C] relative flex flex-col items-center justify-center p-6 text-center flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 14px)' }} />
          <CertLogoBadge className="relative h-11 px-3 mb-3" imgClassName="h-7" />
          <p className="relative text-white text-[13px] font-bold uppercase tracking-widest leading-snug" style={{ fontFamily: 'Cinzel, serif' }}>{orgName}</p>
        </div>
        <div className="flex-1 p-8 flex flex-col justify-center min-w-0">
          <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest mb-2">Verified Certificate</p>
          <h1 className="text-[25px] font-bold mb-3 leading-tight" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <p className="text-[14px] leading-relaxed mb-8" style={{ color: palette.body }}>{body}</p>
          {signatory && (
            <div className="mb-4">
              <div className="h-px w-28 mb-1.5" style={{ background: palette.sigLine }} />
              <p className="text-[13px] font-semibold" style={{ color: palette.body }}>{signatory}</p>
              {designation && <p className="text-[11.5px]" style={{ color: palette.faint }}>{designation}</p>}
            </div>
          )}
          <p className="text-[11.5px] font-mono font-medium" style={{ color: palette.faint }}>Certificate ID: {certId}</p>
        </div>
      </div>
    );
  }

  if (normalized === 'MINIMAL') {
    return (
      <div className="rounded-xl overflow-hidden border border-black/10 shadow-sm" style={{ background: bg, minHeight: 320 }}>
        <div className="p-11">
          <div className="flex items-center gap-2.5 mb-9">
            <CertLogoBadge className="h-8 px-2" imgClassName="h-5" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: palette.label }}>{orgName}</p>
          </div>
          <h1 className="text-[23px] font-bold mb-2" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <div className="h-0.5 w-10 bg-[#D4AF37] mb-6" />
          <p className="text-[14px] leading-relaxed max-w-lg mb-16" style={{ color: palette.body }}>{body}</p>
          <div className="flex items-end justify-between gap-4">
            <div>
              {signatory && (
                <>
                  <p className="text-[13.5px] font-medium" style={{ color: palette.body }}>{signatory}</p>
                  {designation && <p className="text-[12px]" style={{ color: palette.faint }}>{designation}</p>}
                </>
              )}
            </div>
            <p className="text-[11.5px] font-mono font-medium flex-shrink-0" style={{ color: palette.faint }}>{certId}</p>
          </div>
        </div>
      </div>
    );
  }

  // CLASSIC (default) — ornamental double border, centered, seal medallion.
  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: bg, minHeight: 320 }}>
      <div className="border-[3px] border-double border-[#D4AF37]/70 m-3 rounded-lg">
        <div className="p-9 text-center">
          <CertLogoBadge className="h-14 px-4 mb-4 mx-auto" imgClassName="h-9" />
          <p className="text-[12px] font-semibold uppercase tracking-[0.25em] mb-3" style={{ color: palette.label }}>{orgName}</p>
          <h1 className="text-[28px] font-bold mb-3" style={{ fontFamily: 'Cinzel, serif', color: palette.heading }}>{title}</h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px w-12 bg-[#D4AF37]/60" />
            <div className="w-1.5 h-1.5 rotate-45 bg-[#D4AF37]" />
            <div className="h-px w-12 bg-[#D4AF37]/60" />
          </div>
          <p className="text-[14px] leading-relaxed max-w-md mx-auto mb-9" style={{ color: palette.body }}>{body}</p>
          {signatory && (
            <div className="mb-5">
              <div className="h-10 border-b w-32 mb-1 mx-auto" style={{ borderColor: palette.sigLine }} />
              <p className="text-[13.5px] font-medium" style={{ color: palette.body }}>{signatory}</p>
              {designation && <p className="text-[12.5px]" style={{ color: palette.faint }}>{designation}</p>}
            </div>
          )}
          <p className="text-[11.5px] font-mono font-medium tracking-wide" style={{ color: palette.faint }}>Certificate ID: {certId}</p>
        </div>
      </div>
    </div>
  );
}

export function CertificateViewPage() {
  const { code } = useParams<{ code: string }>();
  const { data: cert, isLoading, error } = useCertificateByCode(code ?? '');

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (error || !cert) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Award className="w-12 h-12 mx-auto mb-3 text-slate-200" />
        Certificate not found.
      </div>
    );
  }

  const t = cert.template ?? {
    layout: 'CLASSIC', titleText: 'Certificate of Completion',
    bodyText: 'This is to certify that {learner_name} has successfully completed {course_name} on {completion_date}.',
    signatory: '', designation: '', bgColor: '#FFFFFF',
  };

  const bodyText = (t.bodyText || '')
    .replace('{learner_name}', cert.learnerName)
    .replace('{course_name}', cert.courseTitle)
    .replace('{completion_date}', new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))
    .replace('{certificate_id}', cert.certificateCode)
    .replace('{organization_name}', cert.organizationName);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-[22px] font-bold text-slate-900" style={{ fontFamily: 'Cinzel, serif' }}>Certificate</h1>
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A3E5C] text-white text-[14.5px] font-semibold rounded-lg hover:bg-[#15324a]">
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {cert.isRevoked && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-[14px] text-rose-700 print:hidden">
          This certificate has been revoked and is no longer valid.
        </div>
      )}

      <CertificateCard
        layout={t.layout}
        bg={t.bgColor || '#FFFFFF'}
        title={t.titleText}
        body={bodyText}
        signatory={t.signatory}
        designation={t.designation}
        orgName={cert.organizationName || 'NiyamSaathi'}
        certId={cert.certificateCode}
      />
    </div>
  );
}
