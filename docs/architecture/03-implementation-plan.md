# 03 — Implementation plan

Ordered by dependency, not by customer. All variants are built end to end.

## Milestones
| | Delivers | Needs |
|---|---|---|
| **M0** | Foundations: tests/CI, storage adapters, evidence security, password reset (**done 2026-10-05**) + tenant audit & configuration contract (**step 2a**) | — |
| **M1** | **Dedicated Azure works end to end**: decoupled tenant, minimal release + licence flow, migration runner + updater, Azure package | M0 |
| **M2** | On-prem connected: Compose package, dpdpctl, S3 adapter | M1 |
| **M3** | Air-gapped: offline bundles, no-egress CI lane, media packs | M2 |
| **M4** | Identity (generic OIDC, LDAP, relay/copy-link, time-boxed auditors), Asset Library, operability (metrics, load test → sizes, runbooks), workflow gaps (notifications, reports, assessment lifecycle) | M1 (parts earlier) |

## Workstreams
| WS | Scope | Status |
|---|---|---|
| 0 | Foundations: vitest + CI, `@dpdp/storage`, evidence versions/soft delete, authenticated file links, role guards, rate limiter, suspended-org check, password reset, sample evidence to private container | **Done** (Node 24 images, deploy-workflow Node bump, ad-hoc credential scripts still open) |
| 1 | **Decouple**: (a) regulation-node cutover, (b) `catalog` schema + importer, (c) `TenantProfile`, tenant-owned data out of Super Admin (custom controls → overlays), (d) activation token, (e) licence module + restricted mode, (f) remove `SUPER_ADMIN_*` from tenant plane; Super Admin stops reading/writing tenant DB | **In progress.** Done: (a) tenant reads regulation **nodes** only (`src/library/`), mandatory rule via node applicability + classification; custom controls now in the tenant DB; every Library read and every org-record read goes through one switch point (`library/client.ts`, `platform/tenant-profile.ts`), pinned by a test. Also done: (c)(d)(e) the organisation record (`TenantProfile`) and per-regulation classifications live in the tenant DB; a signed Ed25519 **licence** (`@dpdp/platform`) activates a deployment (first-run page `/activate`, or `LICENCE_TOKEN`/`LICENCE_FILE`) and the instance invites its own CEO; licence state ACTIVE → GRACE → **read-only** (reads and export always work); Super Admin issues/renews licences (`POST /organizations/:id/licence`, CLI `scripts/licence.ts`). The tenant plane now touches the Super Admin DB only in `library/client.ts`, a readiness probe and shutdown. Next: (b) catalog schema + importer (swap `library/client.ts`), then (f) remove the connection; Super Admin stops reading tenant data. **Before the first production release:** put the production licence-signing public key in `packages/platform/src/built-in-keys.ts` |
| 2 | Release system: Library Release Builder (immutable, signed), app release manifest, instance registry, update API, licence issuer, contract v1 (nodes only) | Not started |
| 3 | `dpdpctl` + migration runner (drift, backup gate, lock, baseline), tag-based CI/CD with channels, heartbeat | Not started |
| 4 | Packages: **4a** Azure (Bicep/AVM, Container Apps, PG Flexible, Blob, Key Vault, Managed Redis spike); **4b** on-prem Compose; **4c** air-gap bundles | **Skeleton + architecture pages in [`deploy/`](../../deploy/README.md) and [`tools/dpdpctl/`](../../tools/dpdpctl/README.md)** (2026-10-06); implementation not started |
| 5 | Identity & email: Entra generalised to OIDC, LDAP, SMTP relay + copy-link, time-boxed external auditors | Not started |
| 6 | Storage & assets: S3 adapter, Azure managed identity, Asset Library (`asset://`), LMS delivery without UI change | Not started |
| 7 | Workflow gaps: notifications + overdue job, reports (Evidence & Audit Trail first), assessment edit/close/archive | Not started |
| 8 | Operability: metrics, load test → reference sizes, sizing guide, backup/restore + verify, PgBouncer/pool, shared rate-limit store, runbooks | Not started |

## Production cut-over for the Library reads (run once per deployment, in this order, BEFORE deploying the new portal build)
1. `npx ts-node packages/database/src/backfill/node-cutover.ts` (dry run), read the parity report, then `--apply`. Adds missing control→node links and carries the old "mandatory chapter" flag into node applicability. It never removes anything.
2. Fix any "content gap" it prints in Super Admin (a control linked to a regulation but placed on no node is invisible to tenants — it was before too).
3. `npx ts-node packages/database/src/backfill/custom-controls-to-tenant.ts` (dry run, then `--apply`). Copies customer-authored controls into the tenant database keeping ids.
4. Apply the tenant migrations (`custom_controls*`), deploy.
Rollback: the old build still works against the unchanged old tables; the scripts only add rows.

## Step 2a (done)
Audit every tenant module (correctness, role + org checks, data integrity, concurrency, unbounded queries, cloud-readiness), audit `.env`/settings and define the configuration contract, fix real defects in reviewed batches, produce the dedicated-cloud readiness report → [04-tenant-audit.md](04-tenant-audit.md). **Status 2026-10-06: audit done; batches A, B, C implemented and tested (see the Resolution table in 04). Remaining: WS1 onward.**

## Definition of done (every item)
Typecheck clean · unit/integration tests · migration replay + drift check · real end-to-end run where a database/emulator is involved · docs updated · no secrets in the repo.
