# Architecture — deployment, releases and data (v1, 2026-10-06)

Status: **agreed**. Living document: update it when the audit or the build teaches us something.

| File | Contents |
|---|---|
| [01-architecture.md](01-architecture.md) | The design: planes, variants, releases, versioning, database, Data Library, overlays, licensing, storage, identity, Azure/on-prem stacks, configuration, security |
| [02-edge-cases-and-risks.md](02-edge-cases-and-risks.md) | What can go wrong, and the rule that handles it |
| [03-implementation-plan.md](03-implementation-plan.md) | Milestones, workstreams, status |
| [04-tenant-audit.md](04-tenant-audit.md) | Module-by-module audit of the tenant portal and the configuration/readiness report |
| [azure-storage-setup](../azure-storage-setup.md) | Evidence storage account setup |
| [deploy/](../../deploy/README.md) | **How it is packaged and run**: the three variants (Azure, on-prem Compose, air-gapped), the image rules, the operator CLI (`tools/dpdpctl`) — skeleton with architecture pages |

## Decision log

| # | Decision | Why | Rejected |
|---|---|---|---|
| D1 | **Control plane** (Super Admin, our cloud) vs **instance** (one tenant deployment). Super Admin only authors, signs, licenses and registers. | Tenants must work without Super Admin; customers must never reach our database. | Direct DB access between planes (today's state). |
| D2 | **3 deployment variants**: customer's Azure (dedicated), on-prem + internet for patches, on-prem air-gapped. **No shared multi-org cloud. The customer runs it.** | Isolation, per-customer version pace, no noisy neighbours. | Shared SaaS; vendor-operated cloud. |
| D3 | **One organisation per deployment.** `tenantId` column stays everywhere, but is *not* a security boundary. | Rewriting every table/query has no benefit; it is also the org's permanent identity in licence/activation. | Removing `tenantId`; multi-org installs (unless a real MSP need appears). |
| D4 | **Instances only pull** (outbound HTTPS) or import a **signed bundle file**. Super Admin never connects in. | Customer networks/firewalls; air-gap. | Push into customer networks. |
| D5 | **Three version axes**: app (SemVer, annual LTS), schema (migration history), Library (CalVer + `contentFormat`). | Independent cadences. | One global version. |
| D6 | **Data Library** = everything Super Admin defines, shipped as **immutable signed Library Releases** in a stable contract format; UUIDs preserved; retired items are tombstones. | Tenant rows reference Library UUIDs; authoring schema must stay free to change. | Shipping Super Admin's tables; hard deletes (today's Excel importer). |
| D7 | **Catalog replica** = separate Prisma schema `catalog` in the tenant DB. Disposable, rebuildable from bundles. Customer data never lives there. | Enum names clash with the tenant schema; clean backup/restore story. | Merging schemas; per-tenant catalogs. |
| D8 | **Overlays**: customers add / extend / tune (whitelisted fields) / hide / annotate; they never edit platform rows. Stored in the tenant schema with `baseRelease` + `baseHash`. | Updates must never clobber customisation or hide changes. | Direct edits; forks. |
| D9 | **Migrations**: forward-only, expand/contract, N-1 compatible, destructive only at required-stop releases, backup gate, drift check, advisory lock. | Safe field upgrades; app rollback without DB restore. | Down migrations; in-place type changes. |
| D10 | **Licence**: signed (Ed25519), term subscription, offline-verifiable. Expiry = **restricted mode** (no new work; read-only + export remain). Grace 30 d (60 d air-gapped). | Customers must always reach their own compliance evidence. | Hard lockout. |
| D11 | **Customer evidence is tenant-side only.** Versions kept, soft delete, **no auto-purge**. | Audit defensibility; customer owns retention. | Evidence in Super Admin; automatic retention. |
| D12 | **Storage adapter** (Azure Blob, local/NAS, S3-compatible later). DB stores keys, never URLs. Files open via authenticated, audited ~60 s links. | One code path for all variants. | Public URLs. |
| D13 | **Runtime = Linux containers.** Compose on-prem, Container Apps on Azure, Helm optional. No native Windows port. | Redis/Prowler/containers; industry direction. | Windows services. |
| D14 | **Azure stack**: Bicep + Azure Verified Modules; Container Apps; PostgreSQL Flexible Server (zone-redundant HA); Blob; Key Vault + managed identity; Azure Monitor; **Azure Managed Redis** (spike) else Valkey container. | Azure Cache for Redis retires 2028 and is closed to new customers. | AKS (only for very large), Terraform (until non-Azure demand). |
| D15 | **Queue** = BullMQ on Valkey (BSD) / Managed Redis. Needs `noeviction`. | Redis ≥7.4 licence; MinIO archived. | Redis CE; MinIO. |
| D16 | **Identity**: Entra (Azure) + generic OIDC (AD FS, Keycloak, Okta); LDAP fallback; local break-glass admin. | On-prem AD; air-gap works if IdP is inside. | Entra-only. |
| D17 | **Email**: SMTP incl. unauthenticated internal relay; "copy link" fallback when no mail server. | On-prem sites. | Mandatory internet email. |
| D18 | **External auditors**: read-only, scoped, time-boxed accounts + Evidence & Audit Trail export. Customer chooses the network path. | Standard practice (e.g. audit portals). | Exposing instances to the internet ourselves. |
| D19 | **Backups are customer-owned**; we ship backup/restore tooling and runbooks. Encryption keys backed up separately. | Customer owns infrastructure. | Vendor-run backups. |
| D20 | **Sizing**: reference sizes from a load test + monitoring + resize. **Support**: N/N-1 minors, then annual LTS (24 months), required stops. | Numbers are dynamic. | Forecasting. |
| D21 | **One monorepo** (`apps/ packages/ services/ deploy/ tools/`), no per-mode forks. Customer config/secrets live outside the repo. | Drift. | Folder per mode. |
| D22 | **Media** ships as content-addressed, chunked, resumable asset packs; no fixed size. | Size is unknowable. | Bundling media in the app image. |
