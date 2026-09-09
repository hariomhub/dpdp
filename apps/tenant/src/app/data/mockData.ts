// ─── Mock Data for NiyamSaathi ─────────────────────────────────────────────────

export const ASSETS = [
  {
    id: 'AST-001', name: 'Customer Database',
    assetType: 'Database / Data Store', type: 'Database / Data Store',
    status: 'Active', compliance: 'Partially Compliant',
    compliantControls: 12, totalControls: 18, openActions: 4,
    owner: 'Manish Kumar', department: 'Engineering',
    lastUpdated: '2 hours ago', registered: '2024-06-15',
    hostingLocation: 'India (AWS ap-south-1)', internetFacing: false,
    vendorName: '', criticality: 'Critical',
    dataCategories: ['Sensitive personal data', 'Financial data', 'Consent-based data'],
    description: 'Primary PostgreSQL database storing all customer PII, transaction records, and consent logs.',
    piiRecords: [
      { id: 'PR-001', categories: ['Name', 'Email', 'Phone'], sensitivity: 'High', purpose: 'Customer account management and service delivery', legalBasis: 'Consent', retention: '3 years', deletionMechanism: 'Hard delete + audit log', volume: '500000', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Customer', sharedWithThirdParties: false },
      { id: 'PR-002', categories: ['Financial Data', 'Government ID'], sensitivity: 'Critical', purpose: 'KYC and regulatory compliance', legalBasis: 'Legal Obligation', retention: '7 years', deletionMechanism: 'Encrypted archival', volume: '120000', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Customer', sharedWithThirdParties: false },
    ],
  },
  {
    id: 'AST-002', name: 'HR Management System',
    assetType: 'In-House (On-Premise)', type: 'In-House (On-Premise)',
    status: 'Active', compliance: 'Fully Compliant',
    compliantControls: 14, totalControls: 14, openActions: 0,
    owner: 'Priya Sharma', department: 'HR',
    lastUpdated: '1 day ago', registered: '2024-07-01',
    hostingLocation: 'India (On-Premise)', internetFacing: false,
    vendorName: '', criticality: 'High',
    dataCategories: ['Sensitive personal data', 'Biometric data'],
    description: 'Internal HRMS tool for employee records, payroll, and biometric attendance.',
    piiRecords: [
      { id: 'PR-003', categories: ['Name', 'Address', 'Government ID', 'Biometric'], sensitivity: 'High', purpose: 'Payroll processing and HR management', legalBasis: 'Contract', retention: '5 years post-exit', deletionMechanism: 'Hard delete + legal hold', volume: '1200', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Employee', sharedWithThirdParties: false },
    ],
  },
  {
    id: 'AST-003', name: 'Customer to Payment Gateway',
    assetType: 'API / Integration Layer', type: 'API / Integration Layer',
    status: 'Active', compliance: 'Non-Compliant',
    compliantControls: 3, totalControls: 10, openActions: 6,
    owner: 'Manish Kumar', department: 'Payments',
    lastUpdated: '3 days ago', registered: '2024-06-20',
    hostingLocation: 'India (Mumbai DC)', internetFacing: true,
    vendorName: 'Razorpay Pvt. Ltd.', criticality: 'Critical',
    dataCategories: ['Financial data', 'Cross-border data transfers'],
    description: 'Data flow from customer checkout to Razorpay payment gateway.',
    piiRecords: [
      { id: 'PR-004', categories: ['Financial Data', 'Government ID'], sensitivity: 'Critical', purpose: 'Payment processing and fraud prevention', legalBasis: 'Contract', retention: '10 years (regulatory)', deletionMechanism: 'Regulatory archival', volume: '850000', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Customer', sharedWithThirdParties: true },
    ],
  },
  {
    id: 'AST-004', name: 'AWS Cloud Infrastructure',
    assetType: 'Third-Party (Cloud Hosted)', type: 'Third-Party (Cloud Hosted)',
    status: 'Active', compliance: 'Partially Compliant',
    compliantControls: 8, totalControls: 12, openActions: 2,
    owner: 'Manish Kumar', department: 'Engineering',
    lastUpdated: '5 hours ago', registered: '2024-06-15',
    hostingLocation: 'India (AWS ap-south-1)', internetFacing: true,
    vendorName: 'Amazon Web Services', criticality: 'High',
    dataCategories: ['Cross-border data transfers', 'Sensitive personal data'],
    description: 'AWS hosting for all production workloads including S3, RDS, and EC2.',
    piiRecords: [
      { id: 'PR-005', categories: ['Name', 'Email', 'Financial Data'], sensitivity: 'High', purpose: 'Encrypted data storage for production workloads', legalBasis: 'Contract', retention: '3 years', deletionMechanism: 'S3 lifecycle policies + RDS deletion', volume: '500000', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Customer', sharedWithThirdParties: true },
    ],
  },
  {
    id: 'AST-005', name: 'Website Cookie Consent Banner',
    assetType: 'SaaS (Third-Party Hosted)', type: 'SaaS (Third-Party Hosted)',
    status: 'Active', compliance: 'Fully Compliant',
    compliantControls: 6, totalControls: 6, openActions: 0,
    owner: 'Priya Sharma', department: 'Marketing',
    lastUpdated: '2 weeks ago', registered: '2024-09-01',
    hostingLocation: 'India (CDN)', internetFacing: true,
    vendorName: 'CookieYes', criticality: 'Low',
    dataCategories: ['Consent-based data collection', 'Location data'],
    description: 'Cookie consent banner on technova.com with granular category controls.',
    piiRecords: [
      { id: 'PR-006', categories: ['Behavioural Data', 'Location Data'], sensitivity: 'Low', purpose: 'Consent tracking and cookie preference management', legalBasis: 'Consent', retention: '1 year', deletionMechanism: 'Automatic expiry', volume: '48000', crossBorderTransfer: false, crossBorderDestination: '', principalType: 'Customer', sharedWithThirdParties: false },
    ],
  },
  {
    id: 'AST-006', name: 'CRM Portal',
    assetType: 'SaaS (Third-Party Hosted)', type: 'SaaS (Third-Party Hosted)',
    status: 'Under Review', compliance: 'Not Started',
    compliantControls: 0, totalControls: 16, openActions: 1,
    owner: 'Amit Rao', department: 'Sales',
    lastUpdated: '1 week ago', registered: '2024-08-15',
    hostingLocation: 'India / US (Salesforce)', internetFacing: true,
    vendorName: 'Salesforce Inc.', criticality: 'Medium',
    dataCategories: ['Sensitive personal data', 'Financial data'],
    description: 'Salesforce-based CRM system used by the sales and support teams.',
    piiRecords: [
      { id: 'PR-007', categories: ['Name', 'Email', 'Phone'], sensitivity: 'Medium', purpose: 'Sales pipeline and CRM management', legalBasis: 'Legitimate Interest', retention: '3 years', deletionMechanism: 'Salesforce data deletion API', volume: '48000', crossBorderTransfer: true, crossBorderDestination: 'United States', principalType: 'Customer', sharedWithThirdParties: true },
    ],
  },
];

export const CONTROLS = [
  { id: 'DPDP-CH2-001', title: 'Lawful Basis for Processing', chapter: 'Chapter 2', section: 'Section 4', applicableTo: 'Both', assetTypes: ['Data Asset', 'System / Application'], status: 'Compliant', linkedActions: 3, description: 'Ensure all personal data processing has a valid lawful basis under DPDP Act 2023 — consent, legal obligation, vital interest, or legitimate use.' },
  { id: 'DPDP-CH2-002', title: 'Consent Management & Records', chapter: 'Chapter 2', section: 'Section 5', applicableTo: 'Data Fiduciary', assetTypes: ['Consent Mechanism', 'Data Asset'], status: 'In Progress', linkedActions: 2, description: 'Maintain records of consent obtained from Data Principals, including timestamp, version of notice, and mechanism of collection.' },
  { id: 'DPDP-CH2-003', title: 'Purpose Limitation & Specification', chapter: 'Chapter 2', section: 'Section 6', applicableTo: 'Both', assetTypes: ['Data Asset', 'Data Flow', 'System / Application'], status: 'Non-Compliant', linkedActions: 5, description: 'Personal data shall only be processed for specified, explicit, and legitimate purposes communicated to the Data Principal.' },
  { id: 'DPDP-CH2-004', title: 'Data Minimisation', chapter: 'Chapter 2', section: 'Section 7', applicableTo: 'Data Fiduciary', assetTypes: ['Data Asset'], status: 'Compliant', linkedActions: 1, description: 'Only collect and retain personal data that is adequate, relevant, and limited to what is necessary for the specified purpose.' },
  { id: 'DPDP-CH2-005', title: 'Data Retention & Erasure Policy', chapter: 'Chapter 2', section: 'Section 8', applicableTo: 'Both', assetTypes: ['Data Asset', 'Third-Party Vendor'], status: 'In Progress', linkedActions: 4, description: 'Define and enforce retention periods for personal data. Erase data after the purpose is served unless legally required to retain.' },
  { id: 'DPDP-CH2-006', title: 'Security Safeguards Implementation', chapter: 'Chapter 2', section: 'Section 9', applicableTo: 'Both', assetTypes: ['Data Asset', 'System / Application', 'Third-Party Vendor'], status: 'In Progress', linkedActions: 3, description: 'Implement appropriate technical and organisational measures to protect personal data from breach or unauthorised access.' },
  { id: 'DPDP-CH3-001', title: 'Right to Access Information', chapter: 'Chapter 3', section: 'Section 11', applicableTo: 'Both', assetTypes: ['System / Application', 'Data Asset'], status: 'Not Started', linkedActions: 0, description: 'Provide Data Principals with access to the personal data held about them and information about processing activities.' },
  { id: 'DPDP-CH3-002', title: 'Right to Correction & Erasure', chapter: 'Chapter 3', section: 'Section 12', applicableTo: 'Both', assetTypes: ['System / Application', 'Data Asset'], status: 'Not Started', linkedActions: 0, description: 'Allow Data Principals to correct inaccurate personal data and request erasure where the purpose is served.' },
  { id: 'DPDP-CH4-001', title: 'Children\'s Data Protection', chapter: 'Chapter 4', section: 'Section 9', applicableTo: 'Both', assetTypes: ['Consent Mechanism', 'Data Asset'], status: 'Non-Compliant', linkedActions: 2, description: 'Obtain verifiable parental consent before processing children\'s personal data. Prohibit profiling and targeted advertising to children.' },
  { id: 'DPDP-CH2-007', title: 'Cross-Border Data Transfer Controls', chapter: 'Chapter 2', section: 'Section 16', applicableTo: 'Both', assetTypes: ['Data Flow', 'Third-Party Vendor'], status: 'In Progress', linkedActions: 3, description: 'Ensure cross-border transfer of personal data complies with Government notifications and applicable transfer mechanisms.' },
];

export const ASSESSMENTS = [
  { id: 'ASS-001', name: 'Q1 2025 DPDP Compliance Assessment', status: 'Active', startDate: '2025-01-01', endDate: '2025-03-31', assets: ['AST-001', 'AST-002', 'AST-003'], totalControls: 42, compliantControls: 28, openActions: 8, daysRemaining: 12 },
  { id: 'ASS-002', name: 'AWS Infrastructure Audit 2025', status: 'Active', startDate: '2025-02-01', endDate: '2025-04-30', assets: ['AST-004', 'AST-001'], totalControls: 20, compliantControls: 14, openActions: 4, daysRemaining: 38 },
  { id: 'ASS-003', name: 'Consent Mechanism Review', status: 'Completed', startDate: '2024-10-01', endDate: '2024-12-31', assets: ['AST-005'], totalControls: 12, compliantControls: 12, openActions: 0, daysRemaining: 0 },
  { id: 'ASS-004', name: 'Annual DPDP Full Scope Assessment', status: 'Archived', startDate: '2024-01-01', endDate: '2024-12-31', assets: ['AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005'], totalControls: 68, compliantControls: 48, openActions: 0, daysRemaining: 0 },
];

export const ACTIONS = [
  { id: 'ACT-001', title: 'Implement AES-256 encryption for Customer DB', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-006', controlName: 'Security Safeguards Implementation', assessment: 'ASS-001', priority: 'Critical', assignee: 'Manish Kumar', dueDate: '2025-03-15', status: 'In Progress', description: 'Enable AES-256 encryption at rest and in transit for all customer PII fields in the PostgreSQL database.', instructions: 'Coordinate with AWS RDS team to enable encryption. Test rollback plan. Update documentation.', evidenceRequired: 'Screenshot of encryption settings, DB configuration export, AWS compliance certificate.' },
  { id: 'ACT-002', title: 'Document data retention schedule for Customer DB', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-005', controlName: 'Data Retention & Erasure Policy', assessment: 'ASS-001', priority: 'High', assignee: 'Manish Kumar', dueDate: '2025-03-20', status: 'Evidence Submitted', description: 'Create and publish a data retention schedule for all personal data categories in Customer DB.', instructions: 'Work with legal team to define retention periods per data category.', evidenceRequired: 'Signed retention policy document, Board approval minutes.' },
  { id: 'ACT-003', title: 'Fix consent withdrawal mechanism', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-002', controlName: 'Consent Management & Records', assessment: 'ASS-001', priority: 'High', assignee: 'Manish Kumar', dueDate: '2025-03-10', status: 'Pending', description: 'Implement a user-accessible consent withdrawal feature in the customer portal.', instructions: 'Build API endpoint to revoke consent and cascade deletion.', evidenceRequired: 'Demo video of consent withdrawal flow, code review evidence.' },
  { id: 'ACT-004', title: 'Review and update AWS DPA agreement', asset: 'AST-004', assetName: 'AWS Cloud Infrastructure', control: 'DPDP-CH2-007', controlName: 'Cross-Border Data Transfer Controls', assessment: 'ASS-002', priority: 'Medium', assignee: 'Manish Kumar', dueDate: '2025-04-01', status: 'Approved (Internal)', description: 'Review the current AWS Data Processing Agreement for DPDP compliance.', instructions: 'Coordinate with legal and AWS account team.', evidenceRequired: 'Updated DPA, email confirmation from AWS.' },
  { id: 'ACT-005', title: 'Implement parental consent flow for children\'s data', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH4-001', controlName: "Children's Data Protection", assessment: 'ASS-001', priority: 'Critical', assignee: 'Manish Kumar', dueDate: '2025-02-28', status: 'Rejected', description: 'Build age verification and parental consent collection for users under 18.', instructions: 'Implement age gate on signup flow. Store parental consent records.', evidenceRequired: 'Video demo of age gate, parental consent form, test results.' },
  { id: 'ACT-006', title: 'Create purpose limitation documentation', asset: 'AST-003', assetName: 'Customer to Payment Gateway', control: 'DPDP-CH2-003', controlName: 'Purpose Limitation & Specification', assessment: 'ASS-001', priority: 'High', assignee: 'Manish Kumar', dueDate: '2025-03-25', status: 'Final Review', description: 'Document all data processing purposes for payment gateway data flow.', instructions: 'Map each data element to a processing purpose.', evidenceRequired: 'Data flow diagram, purpose limitation register.' },
];

export const EVIDENCE = [
  { id: 'EV-001', title: 'AES-256 Encryption Configuration Export', action: 'ACT-001', actionTitle: 'Implement AES-256 encryption for Customer DB', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-006', type: 'Config', submittedBy: 'Manish Kumar', submittedDate: '2025-03-08', status: 'Under Review', auditor: 'Rahul Mehta', version: 'v1' },
  { id: 'EV-002', title: 'AWS RDS Encryption Screenshot', action: 'ACT-001', actionTitle: 'Implement AES-256 encryption for Customer DB', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-006', type: 'Screenshot', submittedBy: 'Manish Kumar', submittedDate: '2025-03-08', status: 'Under Review', auditor: 'Rahul Mehta', version: 'v2' },
  { id: 'EV-003', title: 'Data Retention Policy Document v2.1', action: 'ACT-002', actionTitle: 'Document data retention schedule for Customer DB', asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH2-005', type: 'File', submittedBy: 'Manish Kumar', submittedDate: '2025-03-12', status: 'Approved (Internal)', auditor: 'Rahul Mehta', version: 'v1' },
  { id: 'EV-004', title: 'AWS DPA Agreement 2025', action: 'ACT-004', actionTitle: 'Review and update AWS DPA agreement', asset: 'AST-004', assetName: 'AWS Cloud Infrastructure', control: 'DPDP-CH2-007', type: 'File', submittedBy: 'Manish Kumar', submittedDate: '2025-03-05', status: 'Approved (Internal)', auditor: 'Rahul Mehta', version: 'v1' },
  { id: 'EV-005', title: 'Payment Data Flow Diagram', action: 'ACT-006', actionTitle: 'Create purpose limitation documentation', asset: 'AST-003', assetName: 'Customer to Payment Gateway', control: 'DPDP-CH2-003', type: 'File', submittedBy: 'Manish Kumar', submittedDate: '2025-03-14', status: 'Evidence Submitted', auditor: null, version: 'v1' },
  { id: 'EV-006', title: 'Parental Consent Flow Demo Video', action: 'ACT-005', actionTitle: "Implement parental consent flow for children's data", asset: 'AST-001', assetName: 'Customer Database', control: 'DPDP-CH4-001', type: 'Link', submittedBy: 'Manish Kumar', submittedDate: '2025-02-25', status: 'Non-Compliant', auditor: 'Rahul Mehta', version: 'v1' },
];

export const POLICIES = [
  { id: 'POL-001', name: 'Data Protection & Privacy Policy', status: 'Active', version: 'v2.1', effectiveDate: '2025-01-15', owner: 'Priya Sharma', linkedControls: 8, linkedAssets: 5, lastUpdated: '2025-01-15', description: 'Overarching data protection policy covering all aspects of personal data processing under DPDP Act 2023.' },
  { id: 'POL-002', name: 'Data Retention & Disposal Policy', status: 'Active', version: 'v1.3', effectiveDate: '2024-11-01', owner: 'Priya Sharma', linkedControls: 3, linkedAssets: 4, lastUpdated: '2024-11-01', description: 'Defines retention periods for all personal data categories and procedures for secure disposal.' },
  { id: 'POL-003', name: 'Consent Management Policy', status: 'Active', version: 'v1.0', effectiveDate: '2024-09-01', owner: 'Priya Sharma', linkedControls: 4, linkedAssets: 3, lastUpdated: '2024-09-01', description: 'Policy governing how consent is obtained, recorded, managed, and withdrawn.' },
  { id: 'POL-004', name: 'Third-Party Vendor Data Processing Policy', status: 'Draft', version: 'v0.3', effectiveDate: null, owner: 'Amit Rao', linkedControls: 5, linkedAssets: 2, lastUpdated: '2025-02-20', description: 'Governs requirements for vendors who process personal data on behalf of TechNova.' },
  { id: 'POL-005', name: 'Information Security Policy', status: 'Retired', version: 'v3.0', effectiveDate: '2023-01-01', owner: 'Manish Kumar', linkedControls: 6, linkedAssets: 4, lastUpdated: '2023-01-01', description: 'Previous information security policy — retired and superseded by the new Data Protection Policy.' },
];

export const NOTIFICATIONS = [
  { id: 1, type: 'action_rejected', priority: 'Critical', title: 'Evidence Rejected — Parental Consent Flow', body: 'Rahul Mehta (IA) rejected evidence for "Implement parental consent flow" on Customer Database. Review IA feedback.', time: '15 minutes ago', unread: true, link: '/org/actions/ACT-005' },
  { id: 2, type: 'action_overdue', priority: 'Critical', title: 'Action Overdue — Parental Consent Flow', body: 'ACT-005 assigned to Manish Kumar was due 2025-02-28 and is now overdue.', time: '2 hours ago', unread: true, link: '/org/actions/ACT-005' },
  { id: 3, type: 'evidence_submitted', priority: 'High', title: 'Evidence Submitted for Review', body: 'Manish Kumar submitted encryption configuration evidence for DPDP-CH2-006 on AWS RDS Database.', time: '3 hours ago', unread: true, link: '/org/actions/ACT-001' },
  { id: 4, type: 'action_assigned', priority: 'High', title: 'New Action Assigned to You', body: 'Priya Sharma assigned "Fix consent withdrawal mechanism" (ACT-003) to you. Due: 2025-03-10.', time: '1 day ago', unread: false, link: '/org/actions/ACT-003' },
  { id: 5, type: 'evidence_approved', priority: 'High', title: 'Evidence Approved — Data Retention Policy', body: 'Internal Auditor Rahul Mehta approved evidence for Data Retention Policy on Customer Database.', time: '2 days ago', unread: false, link: '/org/evidence' },
  { id: 6, type: 'asset_status_changed', priority: 'Medium', title: 'Asset Compliance Status Changed', body: 'Customer Database compliance status changed from Non-Compliant to Partially Compliant.', time: '3 days ago', unread: false, link: '/org/assets/AST-001' },
  { id: 7, type: 'policy_updated', priority: 'Medium', title: 'Policy Updated', body: 'Data Protection & Privacy Policy v2.1 has been published by Priya Sharma.', time: '1 week ago', unread: false, link: '/org/policies/POL-001' },
  { id: 8, type: 'user_invited', priority: 'Low', title: 'New Team Member Invited', body: 'Sunita Joshi has been invited as External Auditor. Invitation expires in 48 hours.', time: '1 week ago', unread: false, link: '/org/admin/users' },
];

export const USERS = [
  { id: 'USR-001', name: 'Amit Rao', role: 'ceo', email: 'amit.rao@technova.in', status: 'Active', lastLogin: '2 hours ago', invitedBy: 'Super Admin', joinedDate: '2024-06-01', initials: 'AR' },
  { id: 'USR-002', name: 'Priya Sharma', role: 'co', email: 'priya.sharma@technova.in', status: 'Active', lastLogin: '4 hours ago', invitedBy: 'Amit Rao', joinedDate: '2024-06-05', initials: 'PS' },
  { id: 'USR-003', name: 'Manish Kumar', role: 'it_admin', email: 'manish.kumar@technova.in', status: 'Active', lastLogin: '1 day ago', invitedBy: 'Priya Sharma', joinedDate: '2024-06-10', initials: 'MK' },
  { id: 'USR-004', name: 'Rahul Mehta', role: 'internal_auditor', email: 'rahul.mehta@technova.in', status: 'Active', lastLogin: '3 hours ago', invitedBy: 'Amit Rao', joinedDate: '2024-07-01', initials: 'RM' },
  { id: 'USR-005', name: 'Sunita Joshi', role: 'external_auditor', email: 'sunita.joshi@auditcorp.in', status: 'Pending Invite', lastLogin: 'Never', invitedBy: 'Amit Rao', joinedDate: '—', initials: 'SJ' },
];

export const LMS_COURSES = [
  { id: 'CRS-001', title: 'DPDP Act 2023 — Foundations', category: 'DPDP Compliance', difficulty: 'Beginner', duration: '45 min', thumbnail: '', progress: 100, status: 'Completed', lessons: 8, enrolled: 34, description: 'A comprehensive introduction to India\'s Digital Personal Data Protection Act 2023 — key definitions, obligations, rights, and penalties.' },
  { id: 'CRS-002', title: 'Understanding Data Fiduciary Obligations', category: 'DPDP Compliance', difficulty: 'Intermediate', duration: '60 min', thumbnail: '', progress: 65, status: 'In Progress', lessons: 10, enrolled: 28, description: 'Deep dive into the obligations of Data Fiduciaries under Chapter 2 of the DPDP Act.' },
  { id: 'CRS-003', title: 'Evidence Collection Best Practices', category: 'Portal Usage', difficulty: 'Beginner', duration: '30 min', thumbnail: '', progress: 0, status: 'Not Started', lessons: 6, enrolled: 22, description: 'How to collect, document, and submit compliance evidence effectively using the NiyamSaathi portal.' },
  { id: 'CRS-004', title: 'Conducting Internal Audits', category: 'Role-Specific', difficulty: 'Advanced', duration: '90 min', thumbnail: '', progress: 0, status: 'Not Started', lessons: 12, enrolled: 15, description: 'A structured guide for Internal Auditors on reviewing evidence, assessing controls, and documenting audit findings.' },
  { id: 'CRS-005', title: 'Data Rights Management', category: 'DPDP Compliance', difficulty: 'Intermediate', duration: '50 min', thumbnail: '', progress: 30, status: 'In Progress', lessons: 9, enrolled: 19, description: 'Implementing Data Principal rights — access, correction, erasure, and grievance redressal under the DPDP Act.' },
];

export const ADMIN_ORGS = [
  { id: 'ORG-001', name: 'TechNova Solutions Pvt. Ltd.', tenantId: 'TN-2024-001', industry: 'Technology', plan: 'Enterprise', ceo: 'Amit Rao', users: 5, assets: 6, lastActivity: '2 hours ago', status: 'Active', compliance: 67 },
  { id: 'ORG-002', name: 'HealthFirst Hospitals Ltd.', tenantId: 'TN-2024-002', industry: 'Healthcare', plan: 'Professional', ceo: 'Dr. Rajan Nair', users: 12, assets: 14, lastActivity: '1 day ago', status: 'Active', compliance: 82 },
  { id: 'ORG-003', name: 'FinEdge Capital Pvt. Ltd.', tenantId: 'TN-2024-003', industry: 'Finance', plan: 'Enterprise', ceo: 'Kavya Reddy', users: 8, assets: 9, lastActivity: '3 days ago', status: 'Active', compliance: 45 },
  { id: 'ORG-004', name: 'ShopEasy E-commerce Ltd.', tenantId: 'TN-2024-004', industry: 'E-commerce', plan: 'Starter', ceo: 'Vikram Singh', users: 4, assets: 5, lastActivity: '1 week ago', status: 'Active', compliance: 38 },
  { id: 'ORG-005', name: 'EduLearn Technologies', tenantId: 'TN-2024-005', industry: 'Education', plan: 'Professional', ceo: 'Meena Patel', users: 6, assets: 7, lastActivity: '2 weeks ago', status: 'Inactive', compliance: 71 },
];

export const ACTIVITY_FEED = [
  { id: 1, user: 'Manish Kumar', role: 'it_admin', action: 'submitted evidence for', object: 'AES-256 Encryption Config', asset: 'Customer Database', time: '2 hours ago' },
  { id: 2, user: 'Rahul Mehta', role: 'internal_auditor', action: 'rejected evidence for', object: 'Parental Consent Flow', asset: 'Customer Database', time: '15 minutes ago' },
  { id: 3, user: 'Priya Sharma', role: 'co', action: 'created improvement action', object: 'Fix consent withdrawal mechanism', asset: 'Customer Database', time: '4 hours ago' },
  { id: 4, user: 'Manish Kumar', role: 'it_admin', action: 'acknowledged task', object: 'Implement AES-256 encryption', asset: 'Customer Database', time: '1 day ago' },
  { id: 5, user: 'Rahul Mehta', role: 'internal_auditor', action: 'approved evidence for', object: 'Data Retention Policy Document', asset: 'Customer Database', time: '2 days ago' },
  { id: 6, user: 'Amit Rao', role: 'ceo', action: 'published policy', object: 'Data Protection & Privacy Policy v2.1', asset: '', time: '1 week ago' },
  { id: 7, user: 'Priya Sharma', role: 'co', action: 'created assessment', object: 'Q1 2025 DPDP Compliance Assessment', asset: '', time: '1 week ago' },
];
