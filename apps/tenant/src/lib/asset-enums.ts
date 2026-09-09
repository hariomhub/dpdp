// Display labels for the tenant-api's asset-related enums (Prisma enums are
// UPPER_SNAKE_CASE on the wire; the UI has always shown human-readable labels).
// Keep these in sync with the label→enum maps in apps/tenant-api/src/modules/org/org.service.ts.

export const ASSET_TYPE_LABELS: Record<string, string> = {
  DATABASE_DATA_STORE:   'Database / Data Store',
  SYSTEM_APPLICATION:    'System / Application',
  DATA_FLOW:             'Data Flow',
  THIRD_PARTY_VENDOR:    'Third-Party Vendor',
  CONSENT_MECHANISM:     'Consent Mechanism',
  PHYSICAL_HARDWARE:     'Physical / Hardware',
  API_INTEGRATION:       'API / Integration Layer',
  MOBILE_APPLICATION:    'Mobile Application',
  LEGACY_SYSTEM:         'Legacy System',
  SAAS_THIRD_PARTY:      'SaaS (Third-Party Hosted)',
  OUTSOURCED_MANAGED:    'Outsourced / Managed Service',
  IN_HOUSE_CLOUD:        'In-House (Cloud Hosted)',
  IN_HOUSE_ON_PREMISE:   'In-House (On-Premise)',
  THIRD_PARTY_CLOUD:     'Third-Party (Cloud Hosted)',
};

export const CRITICALITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};

export const ASSET_COMPLIANCE_LABELS: Record<string, string> = {
  FULLY_COMPLIANT:     'Fully Compliant',
  PARTIALLY_COMPLIANT: 'Partially Compliant',
  NON_COMPLIANT:       'Non-Compliant',
  NOT_STARTED:         'Not Started',
};

export const ASSET_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', INACTIVE: 'Inactive', UNDER_REVIEW: 'Under Review',
};

export const SENSITIVITY_LABELS: Record<string, string> = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical',
};

export const LEGAL_BASIS_LABELS: Record<string, string> = {
  CONSENT: 'Consent', CONTRACT: 'Contract', LEGAL_OBLIGATION: 'Legal Obligation',
  LEGITIMATE_INTEREST: 'Legitimate Interest', VITAL_INTEREST: 'Vital Interest',
};

export const PRINCIPAL_TYPE_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer', EMPLOYEE: 'Employee', VENDOR: 'Vendor', MINOR: 'Minor', OTHER: 'Other',
};

export const ASSET_TYPE_OPTIONS = Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const CRITICALITY_OPTIONS = Object.entries(CRITICALITY_LABELS).map(([value, label]) => ({ value, label }));
export const ASSET_STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS).map(([value, label]) => ({ value, label }));
export const SENSITIVITY_OPTIONS = Object.entries(SENSITIVITY_LABELS).map(([value, label]) => ({ value, label }));
export const LEGAL_BASIS_OPTIONS = Object.entries(LEGAL_BASIS_LABELS).map(([value, label]) => ({ value, label }));
export const PRINCIPAL_TYPE_OPTIONS = Object.entries(PRINCIPAL_TYPE_LABELS).map(([value, label]) => ({ value, label }));
