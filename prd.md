# Product Requirements Document (PRD)
**Project**: DPDP Compliance Management System
**Generated**: 2026-05-01

## 1. PLATFORM OVERVIEW

The DPDP Compliance Management System is a dual-application platform designed to help organizations manage their compliance with India's Digital Personal Data Protection (DPDP) Act 2023, along with other regulations like RBI Data Localisation and SEBI Cybersecurity Framework. 

The platform consists of two distinct web applications:

1. **Tenant Portal (`apps/tenant`)**
   - **Purpose**: Used by individual organizations (Tenants) to manage their data assets, evaluate risks, handle compliance controls, run assessments, submit evidence, and manage their workforce's compliance training.
   - **User Roles & Responsibilities**:
     - `CEO`: Executive oversight, risk dashboard viewing, overall compliance tracking.
     - `Compliance Officer (CO)`: Setting up the organization, managing policies, overseeing controls, tracking assessments, assigning tasks.
     - `IT Admin`: Executing technical controls, submitting evidence, configuring infrastructure.
     - `Internal Auditor`: Reviewing submitted evidence, approving/rejecting compliance actions internally.
     - `External Auditor`: Read-only access for third-party compliance verification.
   
2. **Super-Admin Console (`apps/super-admin`)**
   - **Purpose**: Used by the platform operator (TechNova internal team) to manage all tenant organizations, billing, platform-wide settings, and the global control/LMS libraries.
   - **User Roles & Responsibilities**:
     - `Super Admin`: Full access to onboard new tenants, suspend tenants, manage global controls, and view platform analytics.

---

## 2. COMPLETE PAGE INVENTORY

### Tenant Portal (`apps/tenant/src/app/pages/`)
| Page Name | Route | Purpose | Visible UI Sections / Components | Build Status |
|---|---|---|---|---|
| **Login** | `/login` | User authentication and role switching demo. | Login form, Role switcher buttons. | Built (Mock Auth) |
| **Set Password** | `/set-password`, `/forgot-password`, `/invite/:token` | Password creation/reset. | Password input form, Validation rules checklist. | Built (UI only) |
| **Onboarding** | `/org/onboarding` | 5-step wizard to set up the organization. | Stepper, Org Details Form, Classification Cards, Interactive Graph (OrgStructureGraph), Team Invite interface. | Fully Built (Mock) |
| **Dashboard** | `/org/dashboard` | Role-specific summary of compliance posture. | Renders `CEODashboard`, `CODashboard`, `ITAdminDashboard`, `InternalAuditorDashboard`, or `ExternalAuditorDashboard` based on context role. Charts, KPIs, Action Lists. | Fully Built |
| **Risk Analysis** | `/org/risk/analysis` | Heatmap and risk matrix. | Risk heatmaps, Risk register table. | Built |
| **Risk Reports** | `/org/risk/reports` | Generated risk assessment reports. | Report list, Export buttons. | Placeholder |
| **Assets List** | `/org/assets` | Register of all data assets. | Data table, Filters, "Register Asset" button. | Built |
| **Asset New/Edit** | `/org/assets/new`, `/:id/edit` | 4-step wizard to register an asset. | Stepper, Asset Identity Form, Technical Details, PII Data toggles. | Fully Built |
| **Asset Detail** | `/org/assets/:id` | Deep dive into a specific asset. | Asset summary, PII records list, Linked controls list. | Built |
| **Controls Library** | `/org/controls` | Library of regulatory controls. | Tabs (Platform/Custom), Status chips, Control list, Custom Control Form Modal. | Built |
| **Control Detail** | `/org/controls/:id` | Specific control requirements. | Control description, linked actions, mapped assets. | Built |
| **Assessments** | `/org/assessments` | List of compliance assessments. | Assessment cards/table, progress bars. | Built |
| **Assessment New** | `/org/assessments/new` | Create a new assessment scope. | Assessment configuration form. | Built |
| **Assessment Detail**| `/org/assessments/:id` | Tracking an active assessment. | Progress circle, Asset scope list, Action items list. | Built |
| **Compliance Tasks** | `/org/compliance-tasks` | Task and evidence management. | Role-specific views. IT Admins see "My Tasks", Auditors see "Evidence Review". Modal for evidence submission. | Fully Built |
| **Reports** | `/org/reports` | Compliance reports generation. | Report templates, download history. | Placeholder |
| **Alerts** | `/org/alerts` | System notifications. | Notification feed, mark as read. | Built |
| **LMS** | `/org/lms`, `/org/lms/courses/:id` | Compliance training modules. | Course catalog, Video player UI, Progress tracking. | Built |
| **Users** | `/org/users` | Tenant user management. | User table, Invite User modal, Entra ID sync button. | Built |
| **Settings** | `/org/settings` | Org configuration. | Profile, Notification preferences, Security settings. | Built |

### Super-Admin Console (`apps/super-admin/src/app/pages/`)
| Page Name | Route | Purpose | Visible UI Sections / Components | Build Status |
|---|---|---|---|---|
| **Admin Login** | `/login` | Admin authentication. | Login form. | Built (UI only) |
| **Admin Dashboard** | `/admin/dashboard` | Platform health metrics. | Global MRR, Active Tenants, System health metrics. | Built |
| **Organizations** | `/admin/organizations`, `/:id` | Manage tenants. | Tenant list table. Detail view with Read-Only OrgStructure, Billing info, Suspend buttons. | Fully Built |
| **Admin Controls**| `/admin/controls` | Global control library management. | Master control list, mapping interface. | Built |
| **Admin LMS** | `/admin/lms` | Global course management. | Course creator, tenant enrollment stats. | Built |
| **Billing** | `/admin/billing` | Platform revenue tracking. | Invoice list, Plan management. | Placeholder |
| **Audit Log** | `/admin/audit-log` | Global system audit trail. | Log table with filters. | Built |
| **Admin Settings**| `/admin/settings` | Platform configuration. | System preferences. | Placeholder |

---

## 3. DATA & STATE MODEL

### Context Management
Both applications use React Context (`AppContext.tsx`) to manage global, transient UI state.
- **State variables**:
  - `role` / `TenantRole` (Tenant only): `ceo` | `co` | `it_admin` | `internal_auditor` | `external_auditor`
  - `appMode`: `'tenant'` | `'superadmin'`
  - `sidebarCollapsed`: `boolean`
  - `orgName`: `string`

### Database Schema Requirements (from `mockData.ts`)

To transition from mock data to a PostgreSQL database, the following exact schema shapes are required based on the current codebase.

#### 1. Assets (`ASSETS`)
- `id`: string (PK)
- `name`: string
- `assetType`: string
- `type`: string
- `status`: string (Enum: Active, Inactive, Under Review)
- `compliance`: string (Enum: Fully Compliant, Partially Compliant, Non-Compliant, Not Started)
- `compliantControls`: number
- `totalControls`: number
- `openActions`: number
- `owner`: string
- `department`: string
- `lastUpdated`: string (timestamp)
- `registered`: string (date)
- `hostingLocation`: string
- `internetFacing`: boolean
- `vendorName`: string
- `criticality`: string (Enum: Low, Medium, High, Critical)
- `dataCategories`: string[]
- `description`: string

#### 2. PII Records (`piiRecords` embedded in ASSETS)
- `id`: string (PK)
- `asset_id`: string (FK -> ASSETS.id)
- `categories`: string[]
- `sensitivity`: string (Enum: Low, Medium, High, Critical)
- `purpose`: string
- `legalBasis`: string (Enum: Consent, Contract, Legal Obligation, Legitimate Interest, Vital Interest)
- `retention`: string
- `deletionMechanism`: string
- `volume`: string
- `crossBorderTransfer`: boolean
- `crossBorderDestination`: string
- `principalType`: string
- `sharedWithThirdParties`: boolean

#### 3. Controls (`CONTROLS`)
- `id`: string (PK)
- `title`: string
- `chapter`: string
- `section`: string
- `applicableTo`: string (Enum: Data Fiduciary, Significant DF, Both)
- `assetTypes`: string[]
- `status`: string (Enum: Compliant, In Progress, Non-Compliant, Not Started, Draft, Published)
- `linkedActions`: number
- `description`: string

#### 4. Assessments (`ASSESSMENTS`)
- `id`: string (PK)
- `name`: string
- `status`: string (Enum: Active, Completed, Archived)
- `startDate`: string (date)
- `endDate`: string (date)
- `assets`: string[] (Array of FK -> ASSETS.id)
- `totalControls`: number
- `compliantControls`: number
- `openActions`: number
- `daysRemaining`: number

#### 5. Actions / Tasks (`ACTIONS`)
- `id`: string (PK)
- `title`: string
- `asset`: string (FK -> ASSETS.id)
- `assetName`: string
- `control`: string (FK -> CONTROLS.id)
- `controlName`: string
- `assessment`: string (FK -> ASSESSMENTS.id)
- `priority`: string (Enum: Low, Medium, High, Critical)
- `assignee`: string (FK -> USERS.id or name)
- `dueDate`: string (date)
- `status`: string (Enum: Pending, In Progress, Evidence Submitted, Final Review, Approved (Internal), Rejected, Overdue)
- `description`: string
- `instructions`: string
- `evidenceRequired`: string

#### 6. Evidence (`EVIDENCE`)
- `id`: string (PK)
- `title`: string
- `action`: string (FK -> ACTIONS.id)
- `actionTitle`: string
- `asset`: string (FK -> ASSETS.id)
- `assetName`: string
- `control`: string (FK -> CONTROLS.id)
- `type`: string (Enum: File, Screenshot, Config, Link, Document)
- `submittedBy`: string (name)
- `submittedDate`: string (date)
- `status`: string (Enum: Under Review, Approved (Internal), Non-Compliant)
- `auditor`: string | null
- `version`: string

#### 7. Users (`USERS`)
- `id`: string (PK)
- `name`: string
- `role`: string (Enum: ceo, co, it_admin, internal_auditor, external_auditor)
- `email`: string
- `status`: string (Enum: Active, Pending Invite)
- `lastLogin`: string (timestamp)
- `invitedBy`: string
- `joinedDate`: string (date)
- `initials`: string

#### 8. Admin Organizations / Tenants (`ADMIN_ORGS`)
- `id`: string (PK)
- `name`: string
- `tenantId`: string
- `industry`: string
- `plan`: string (Enum: Starter, Professional, Enterprise)
- `ceo`: string
- `users`: number
- `assets`: number
- `lastActivity`: string (timestamp)
- `status`: string (Enum: Active, Inactive, Suspended, Onboarding)
- `compliance`: number

### Entity Relationships
- **Tenant** (1) -> (M) **Users**
- **Tenant** (1) -> (M) **Departments**
- **Department** (1) -> (M) **Assets**
- **Asset** (1) -> (M) **PII Records**
- **Assessment** (1) -> (M) **Assets**
- **Assessment** (1) -> (M) **Actions**
- **Control** (1) -> (M) **Actions**
- **Action** (1) -> (M) **Evidence**

---

## 4. FORMS INVENTORY

Forms across the codebase are implemented using local component `useState` rather than `react-hook-form`. Below is the documentation for all forms to drive API design.

### 1. Onboarding Form (`Onboarding.tsx`)
**Step 1: Org Details**
- `orgName`: string, required
- `industry`: string, required
- `orgSize`: string (Dropdown), required
- `address`: string, required
- `jurisdiction`: string, required
- `dpoName`: string, required
- `dpoEmail`: string (email format), required
- `dpoPhone`: string, optional
- `website`: string, optional
- `contactEmail`: string (email format), required
- `panNumber`: string, optional
- `gstNumber`: string, optional

**Step 2: Classification**
- `classification`: Enum ('Data Fiduciary', 'Significant Data Fiduciary'), required

**Step 3: Structure (OrgStructureGraph)**
- `departments`: Array of Objects
  - `id`: string
  - `name`: string
  - `description`: string
  - `owner`: string
  - `assets`: Array of Objects (name, type, criticality)
  - `suppliers`: Array of Objects

**Step 4: Team**
- `invites`: Array of Objects
  - `email`: string
  - `role`: string
  - `departments`: string[]
  - `note`: string

### 2. New Asset Form (`AssetNew.tsx`)
**Step 1: Identity**
- `name`: string (min 2 chars), required
- `assetType`: string (Enum), required
- `description`: string, optional
- `criticality`: string (Enum), required

**Step 2: Ownership**
- `department`: string, required
- `assetOwner`: string, required
- `status`: string, required

**Step 3: Technical**
- `hostingLocation`: string, required
- `internetFacing`: boolean, required
- `vendorName`: string, required if `assetType` is a vendor type

**Step 4: PII Data**
- `hasPII`: boolean, required
- `piiCategories`: string[], required if `hasPII`
- `sensitivity`: string (Enum), required if `hasPII`
- `legalBasis`: string (Enum), required if `hasPII`
- `purpose`: string (min 10 chars), required if `hasPII`
- `retention`: string, required if `hasPII`
- `volume`: string, required if `hasPII`
- `principalType`: string, required if `hasPII`
- `deletionMechanism`: string, optional
- `crossBorder`: boolean, required if `hasPII`
- `crossBorderDest`: string, required if `crossBorder`
- `sharedWithThirdParties`: boolean, required if `hasPII`

### 3. Custom Control Form (`Controls.tsx`)
- `title`: string, required
- `desc`: string, required
- `regs`: string[] (Regulations), optional
- `chapter`: string, optional
- `applicableTo`: string (Enum), required
- `status`: string (Enum: Draft/Published), required
- `actions`: Array of Objects (Minimum 1 required)
  - `title`: string, required
  - `desc`: string, optional
  - `evidenceTypes`: string[], required
  - `dueDays`: number, required
  - `priority`: string (Enum), required

### 4. Evidence Submission Form (`ComplianceTasks.tsx`)
- `type`: string (Enum: File, Link, Text Note), required
- `file`: File object, required if `type === 'File'`
- `url`: string, required if `type === 'Link'`
- `note`: string, optional
- `comment`: string, optional

---

## 5. KEY WORKFLOWS & ROLE DIFFERENCES

### Workflow 1: Compliance Task Execution
1. **Assignment**: CO creates an Assessment which generates Actions mapped to specific IT Admins.
2. **Execution**: IT Admin logs in, goes to `ComplianceTasks`, sees "My Tasks".
3. **Submission**: IT Admin clicks a task, clicks "Submit Evidence", fills the form (File/Link/Note). Status becomes `Evidence Submitted`.
4. **Review**: Internal Auditor logs in, sees task in "Evidence Review" tab.
5. **Decision**: Internal Auditor clicks task, views evidence, and clicks either "Approve" (Status -> `Approved (Internal)`) or "Reject" (Status -> `Rejected`).
6. **Notification**: IT Admin receives an alert regarding the approval/rejection.

### Role-Based Dashboard Rendering
The `Dashboard.tsx` dynamically renders completely different components based on `role`:
- **CEO**: High-level charts (Compliance Score, Risk Heatmap).
- **CO**: Operational charts (Assessment Progress, Open Actions by Priority).
- **IT Admin**: Task-focused (My Open Tasks, Overdue alerts).
- **Internal Auditor**: Review-focused (Evidence awaiting review, Audit schedule).
- **External Auditor**: Read-only summary report generation.

---

## 6. COMPONENT LIBRARY
The application uses a robust shared component library, primarily based on Shadcn UI (`packages/ui/src/components/ui/`), heavily styled with custom Tailwind utility classes.
- **Core UI**: Accordion, Alert, Avatar, Badge, Button, Card, Carousel, Checkbox, Dialog, Dropdown, Hover-card, Input, Label, Popover, Progress, Radio-group, Select, Separator, Sidebar, Skeleton, Sonner (Toasts), Switch, Table, Tabs, Textarea, Tooltip.
- **Shared Application Components**: `DesignSystem.tsx` documents the tokens.
- **Icons**: Lucide-React is used exclusively for iconography.

---

## 7. FUTURE CONSIDERATIONS (API Integration & Build Status)

1. **State Persistence**: Currently, all form submissions (Assets, Controls, Evidence) write to local React state arrays. A backend API (e.g., Node.js/NestJS with PostgreSQL) is required.
2. **Form Management**: As forms grow, refactoring from standard `useState` to `react-hook-form` + `zod` is highly recommended to handle complex nested arrays (like PII records and Actions).
3. **Authentication**: The Login page merely sets a local context variable. An identity provider (like Microsoft Entra ID or Auth0) needs to be integrated. The `Onboarding.tsx` already contains UI for Entra ID group mapping.
4. **Mock Data Migration**: The database schema documented in Section 3 must be implemented to replace the `packages/shared/src/mockData.ts` file.
5. **Routing Checks**: Route protection in `routes.tsx` currently only redirects based on paths. It needs to check the actual user role token before allowing access to `/org/*` or `/admin/*`.
