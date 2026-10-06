// Canonical brand/status palette for the CEO dashboard's rewritten code.
// Picks ONE value per status to resolve the inconsistency of two different
// reds (#EF4444 vs #F87171) and two different ambers (#F59E0B vs #EAB308)
// scattered through Dashboard.tsx as raw hex. Scoped to the CEO dashboard —
// not a theme.css/design-token migration.

export const BRAND = {
  navy: '#1A3E5C',
  navyHover: '#15324a',
  gold: '#D4AF37',
} as const;

export const STATUS_COLORS = {
  compliant: '#22C55E',
  inProgress: '#3B82F6',
  nonCompliant: '#EF4444',
  notStarted: '#94A3B8',
  pending: '#F59E0B',
} as const;

export const RISK_BAND_COLORS = {
  low: '#22C55E',
  moderate: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
  severe: '#7F1D1D',
} as const;
