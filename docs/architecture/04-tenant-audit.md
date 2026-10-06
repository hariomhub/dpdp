# 04 — Tenant portal audit (step 2a, 2026-10-06)

Method: read every service/route/worker that writes data, plus static scans (tenant scoping of Prisma calls, env reads, role guards). **Verified** = I read the code path; **Check** = suspected from a scan, not yet traced. Nothing below has been changed yet except where marked *(done in M0)*.

Under D3 (one org per deployment) a missing `tenantId` filter is no longer a cross-customer leak; it stays a defect for shared-era data and defence in depth, so severities say "today → after WS1".

## 1. Findings

| # | Sev | Where | Finding | Fix | Batch |
|---|---|---|---|---|---|
| 1 | **High** | 16 files use `getSuperAdminPrisma` (lms, controls, dashboard, risk, onboarding, assessments, tasks, users, org, auth, files, password-reset, cloud-connections, tenant-access, 2 processors) | Tenant plane reads the Super Admin DB directly: regulations, controls, LMS courses/quizzes/certificates, tenant record/status. Blocks every variant. | WS1 (catalog replica, TenantProfile, licence) | WS1 |
| 2 | **High** | `queue/queues.ts:49,58`, `discovery.service.ts:40`, `cloud-connections.service.ts:104` | **Decrypted cloud credentials are put in BullMQ job payloads**, i.e. plaintext in Redis (and in Redis persistence/backups). *Verified.* | Pass `connectionId`; worker decrypts. Drop job payloads' `credentials`. | B |
| 3 | **High** (cloud) | `queue/redis-connection.ts` | `REDIS_URL` is parsed to host/port/password only: `rediss://` TLS and username are dropped. Azure Managed Redis is TLS-only (port 10000) → worker/API cannot connect. *Verified.* | Honour scheme (TLS), username, db; test against a TLS Redis. | B |
| 4 | **High** | `entra.service.ts` sync (~l.379-500) | Sync (a) sets `status: ACTIVE` on any existing user matching an email — **re-enables users an admin deactivated**; (b) overwrites `role` from the group mapping; (c) mapping role is `z.nativeEnum(TenantRole)`, so **any CO can map a group to CEO** (privilege escalation) and a mapping can demote the CEO; (d) no safety net: an empty/wrong group deactivates every Entra user (incl. the only CO). *Verified.* | Needs your decision (Q1). | C |
| 5 | **High** today | `lms.service.ts` `bulkSetDesignation` | `user.update({where:{id}})` for caller-supplied ids — no tenant check; also enrols them in courses. *Verified.* | `updateMany` scoped by `tenantId` + count check; reject unknown ids. | A |
| 6 | Med | `assessments.service.ts` `createAssessment` / controller zod | `assetIds`, `departmentId`, `taskAssignments[].assigneeId` are not checked to belong to the org, be active, or hold an allowed role. *Verified.* | Validate in the service before the transaction. | A |
| 7 | Med | `app.ts:42` | Production CORS is `origin: true` with `credentials: true` (any origin). Auth is Bearer-token so impact is limited, but not production-grade. CSP is off (`contentSecurityPolicy:false`). *Verified.* | Allow only `CORS_ALLOWED_ORIGINS` (default `TENANT_APP_URL`); enable a CSP suited to the SPA. | A |
| 8 | Med | `middleware/error-handler.ts` | Status chosen by substring of message ("not found", "already exists"); everything else is **HTTP 500 with the raw message** — Prisma errors leak table/column/query text; business-rule errors appear as 500. *Verified.* | Use `HttpError` for business errors; map Prisma `P2002/P2025`; generic text for unknown 5xx; log detail server-side. | A |
| 9 | Med | `auth.service.ts` refresh/logout | Logout is a no-op; refresh tokens (7 d) cannot be revoked; a deactivated/demoted user keeps their access token ≤15 min. *Verified.* | 30 s cached status+role check in `authenticate`; `sessionsRevokedAt` on user (logout everywhere, deactivation, role change); refresh checks it. | A |
| 10 | Med | `entra.service.ts loginWithEntra` + routes | `state` is the tenant id (not a nonce) and is never verified; no PKCE; once `entraObjectId` is stored a **different Microsoft identity with the same email still logs in**; `/entra/login` is covered only by the generic limiter, not `authLimiter`. *Verified.* | Signed one-time `state` + PKCE; require `oid` match; add `authLimiter`. | A |
| 11 | Med | `app.ts` | No graceful shutdown (SIGTERM), no `/ready`, no `/version`; Container Apps revision swaps drop in-flight requests; DB/Redis/storage failures invisible. *Verified.* | Drain on SIGTERM; `/health` (live), `/ready` (DB, Redis, storage, migrations applied), `/version`. | B |
| 12 | Med | `config/index.ts` | **No validation**: `JWT_SECRET!`, DB URLs, SMTP etc. are non-null assertions; a missing variable fails late/odd. Dead setting `SUPER_ADMIN_API_URL`. *Verified.* | Zod-validated config at boot, clear errors, `*_FILE` secrets; `.env.example`. | B |
| 13 | Med | `assessments.service.ts getMaxTaskCode`, `org.service.ts nextAssetCode` | Codes = max+1 computed by reading **every** code each call (O(n)) and racing; unique `(tenantId, code)` turns the race into a 500 for the loser (no duplicates). *Verified.* | DB-allocated counter (per-org counter row / advisory lock). | B |
| 14 | Med | `users.service.ts deactivateUser` | Resets **every** non-terminal task of the user to `PENDING`/unassigned, including tasks in review stages → loses review progress. *Verified.* | Needs your decision (Q2). | C |
| 15 | Med | `entra.service.ts` | Sync runs in the request, 2-3 queries per member (N+1), manual only, no overlap guard; deactivation by sync leaves tasks assigned. *Verified.* | Batch reads; run as a worker job with a lock; share task handling with #14. | C |
| 16 | Low-Med | `utils/crypto.ts` | AES-256-GCM is sound, but ciphertext carries no key id → **no key rotation path**; two separate keys for two features. | Prefix key id; rotation tool in `dpdpctl` (WS3). Keys must be backed up separately (already in D19). | WS3 |
| 17 | Low | `dashboard-snapshot.processor.ts` | Snapshot date uses *local* date parts; depends on container TZ. Loops tenants from the SA DB. | Set `TZ=UTC` explicitly + use UTC parts; single org via TenantProfile. | B / WS1 |
| 18 | Low | `discovery.service.ts dismissDraft` | Audited as `ASSET_DEACTIVATED` (wrong action). | Add `DISCOVERY_DRAFT_DISMISSED`. | A |
| 19 | Low | `lms.service.ts` attempts | Attempt number = count+1 (race; no unique) and unlimited attempts. Grading itself is server-side (good). | Unique `(enrollmentId, quizId, attemptNumber)` + max-attempts setting if wanted. | later |
| 20 | Low | dashboard/risk services, list endpoints | Data loaded and aggregated in memory; several unbounded `findMany`. Fine at pilot size. | Pagination + SQL aggregation after the load test (WS8). | WS8 |
| 21 | Hygiene | repo | `reset-password.ts` / `delete-ceo.ts` with credentials are tracked; SMTP password exists in git history; deploy workflows still Node 20. | Remove/rotate; bump workflows. | standing |

Scan note: 90 Prisma calls on tenant-scoped models lack `tenantId` in the call; spot-checked ones are updates by id after a tenant-scoped `findFirst` (fine). Untraced ones to confirm in batch A: `updateAsset.ownerId` (not validated as an org user), `entra` department updates, `lms.service` l.637/693/734, `onboarding` l.395-475. Verified safe: `createAsset` checks department ownership; `.env` files are git-ignored.

Already good *(M0)*: evidence storage/links/versions, upload allow-list, password reset, suspended-org check, rate limiter, role guards on org-setup/cloud/discovery/audit routes, server-side quiz grading, SPA uses relative `/api/v1` (one image works for every deployment).

## 2. Settings inventory (tenant plane) and what changes

| Setting | Today | Action |
|---|---|---|
| `NODE_ENV`, `PORT`, `TRUST_PROXY`, `RATE_LIMIT_*` | ok | keep; validate |
| `TENANT_DATABASE_URL` | main DB | keep name (rename = churn without benefit); add pool size |
| `SUPER_ADMIN_DATABASE_URL` | required | **remove** when WS1 lands |
| `SUPER_ADMIN_API_URL` | read, unused | **remove now** |
| `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | ok (secret 66 chars) | keep; require ≥32 bytes; `*_FILE` |
| `ENTRA_ENCRYPTION_KEY`, `CLOUD_CONNECTION_ENCRYPTION_KEY`, `ENTRA_REDIRECT_URI` | ok | keep; validate 64-hex; key-id format in WS3 |
| `SMTP_HOST/PORT/USER/PASS/FROM_*` | host/user/pass/from mandatory | make host/auth optional (relay, copy-link); add `SMTP_SECURE` |
| `TENANT_APP_URL` | links in emails | keep; also default CORS origin |
| `REDIS_URL` | TLS/username dropped | fix (finding 3) |
| `CLOUD_SCANNER_URL` | defaults to localhost | optional feature: disabled when unset |
| `STORAGE_PROVIDER`, `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`, `ALLOWED_UPLOAD_EXTENSIONS`, `FILE_LINK_TTL_SECONDS`, `AZURE_EVIDENCE_*`, `AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER` | new in M0 | keep |
| `AZURE_STORAGE_CONNECTION_STRING`, `…_CONTAINER`, `…_LMS_*`, `…_SAS_EXPIRY_MINUTES` | legacy; evidence silently falls back to the connection string | drop the evidence fallback (avoid mixing accounts); LMS ones go with the Asset Library (WS6) |
| **Add now** | — | `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`, `TZ=UTC` (image), `.env.example` |
| **Add in WS1-WS3** | — | licence file, activation token, update source URL, trust-keys file, managed-identity client id |
| Frontend `VITE_TENANT_API_URL` | optional, defaults `/api/v1` | keep as optional |
| `.env.azure` (root) | holds a Super Admin DB URL | local only; delete once WS1 is done |

Contract: every variable validated at boot (type, range, "required when X"), grouped by feature, one error listing all problems; secrets via env, `*_FILE` or Key Vault reference; no tenant-plane variable names the Super Admin.

## 3. Dedicated-cloud readiness (variant A)

| Area | State |
|---|---|
| Evidence storage (Blob, versions, links) | **Ready** — needs your storage account + env vars |
| Decoupling from Super Admin | **Blocked** — WS1 |
| Queue on Azure Managed Redis | **Blocked** — finding 3 + spike (`noeviction`) |
| Stateless/replicas | Mostly; per-process rate counters (OK for now), file store must be Blob |
| Health/shutdown/version | Missing — batch B |
| Config validation / `.env.example` | Missing — batch B |
| Auth hardening | Batch A + decisions Q1/Q2 |
| Migrations/updater/licence | Not built — M1 (WS1-WS3) |

## 4. Proposed batches (after your approval)
**A — security/correctness (no product decision):** 5, 6, 7, 8, 9, 10, 18 + trace the untraced scan hits.
**B — cloud readiness:** 2, 3, 11, 12, 13, 17, remove dead/legacy settings, `.env.example`.
**C — after your answers:** 4, 14, 15.
Each batch: typecheck, tests (new unit/integration tests for every fix), real run against a database where relevant, notes here updated.
Then WS1 starts (regulation-node cutover first).

## 5. Pending from your side
- Azure evidence storage account → set `STORAGE_PROVIDER=azure`, `AZURE_EVIDENCE_CONNECTION_STRING` (+ container); `TRUST_PROXY=1` behind App Service/Container Apps.
- Rotate the SMTP password (in git history) and tell me when done; confirm I may delete `reset-password.ts` / `delete-ceo.ts`.
- An Azure subscription/resource group I can `what-if`/deploy a Bicep test stack into (M1 packaging + Managed Redis spike) — or tell me you will run those steps.
- Check production Super Admin data for the ~6 test-looking controls before the content cutover.
- Answers to Q1/Q2 below.

## 6. Resolution (2026-10-06) — batches A, B, C
Proof = unit tests (`npm test`, 210) + database tests against scratch PostgreSQL (`npm run test:db`, 57, also run in CI) + a boot of the production bundle. Typecheck clean for tenant-api, admin-api, tenant, storage.

| # | Status | What changed |
|---|---|---|
| 1 | **Open → WS1** | Tenant still reads Super Admin data (16 files). `/ready` checks it until then. |
| 2 | Fixed | Queue payloads carry ids only; the worker loads + decrypts (`cloud-connections/credentials.ts`). A job from an older release carrying credentials is ignored for them. |
| 3 | Fixed, **TLS not run against a real TLS Redis** | `rediss://`, username, db, keep-alive (`queue/redis-connection.ts`, parsed + unit-tested). Verify on Azure Managed Redis in the spike. |
| 4 | Fixed | `entra-sync-rules.ts` + `entra-sync.ts`: groups cannot grant CEO/CO; sync never touches CEO/CO; never re-enables admin-deactivated users (`User.deactivatedReason`); refuses removal of >30 % (≥3 people) or an empty directory unless confirmed (UI asks); lease prevents overlap; matches by directory id first. |
| 5 | Fixed | LMS designation writes scoped to the organisation; unknown/foreign ids rejected without half-applying; designation must exist; zod on the endpoints; audited. |
| 6 | Fixed | `assessment-input.ts`: department, assets, assignees (active IT Admins) checked before anything is written; `updateAsset` owner checked. |
| 7 | Fixed | CORS = portal origin + `CORS_ALLOWED_ORIGINS`; CSP enforced (`CSP_MODE`); HSTS only on https. CSP checked against the built SPA (no inline script, eval or worker; only Google Fonts external) but **not opened in a browser**. |
| 8 | Fixed | Deliberate errors → 4xx with message; Prisma/unexpected → generic 500 + `reference` (= `X-Request-Id`), detail only in the log. |
| 9 | Fixed | Per-request check of current status/role/password-change (30 s cache, instant on the instance that changes it); logout revokes that device's refresh token (`revoked_refresh_tokens`); refresh checks revocation. |
| 10 | Fixed | Sign-in uses signed `state` + browser-held nonce + server-side PKCE (works on plain http); identity bound to directory object id; throttled. SPA updated. |
| 11 | Fixed | `/health`, `/ready` (db, migrations finished, redis, storage + free space), `/version`; SIGTERM drains then closes queues/pools (verified on the production bundle); keep-alive 65 s. |
| 12 | Fixed | `config/validate.ts` at boot (api + worker), all problems listed; `.env.example`; dead/legacy settings removed (no evidence→vendor-account fallback). |
| 13 | Fixed | `code_counters` (atomic upsert), seeded by migration; used by assessments, assets, onboarding. 40 concurrent callers → no duplicate; rollback leaves no gap. |
| 14 | Fixed | Agreed rule: only tasks being worked (PENDING/IN_PROGRESS/OVERDUE) return to the pool with history; work submitted/in review/approved is never reopened. One shared `deactivation.ts` for admin and sync; same on IT-Admin demotion. |
| 15 | **Partly** | One read for existing users, lease, per-person transaction, failures reported per person. Still runs inside the HTTP request (large directories: move to a worker job, WS7/8). |
| 16 | Open → WS3 | Key id / rotation tool. |
| 17 | Fixed | Snapshot date from UTC parts; unit-tested. |
| 18 | Fixed, widened | Role change, department change, invitation cancel, course enrol/unenrol, draft dismiss now have their own audit actions (they were logged as "user activated/deactivated"). |
| 19, 20, 21 | Open | Quiz attempt uniqueness; unbounded lists/aggregation → load test (WS8); credential scripts + SMTP password in history (yours). |

**Found while fixing (all fixed unless noted)**
- A **refresh token (7 days) was accepted as an access token** — tokens now carry `type`; only access tokens authenticate.
- SSO sign-in set `source=ENTRA_ID` on anyone, making a **CEO/CO eligible for sync deactivation; `disconnect` would deactivate them** (lockout). Both fixed.
- Graph paging built `/v1.0/v1.0/…`, so a group of >100 people **failed on page 2**; now users-only endpoint with correct paging.
- Saving mappings deleted then recreated them (non-atomic, new ids orphaned users' group link); now one transaction keeping ids; departments/roles validated.
- DB pool had **no error handler** (an idle connection reset during a managed-DB failover crashes the process), no connect timeout, fixed size → `createPool` + `DATABASE_POOL_MAX`.
- Invitation email put names unescaped into HTML and the subject (injection) → escaped; SMTP now supports an unauthenticated relay and implicit TLS.
- LMS assignment upload skipped the file policy → same allow-list + content check applied. **Still open (WS6):** learner files go to the Azure account in `AZURE_STORAGE_CONNECTION_STRING` (vendor-style account, always Azure), not the tenant storage adapter — not usable on-prem.
- The SPA loads **Google Fonts from a CDN** → degraded look when air-gapped; bundle the fonts (M3).
- Unknown `/api/*` returned the SPA page; static assets had no cache headers → 404 JSON; hashed assets immutable, HTML no-cache.

**Behaviour changes to know about:** business errors are now 400 (were 500); Entra login request is `{code,state,nonce}`; group mappings cannot be CEO/CO; evidence needs `AZURE_EVIDENCE_CONNECTION_STRING` explicitly; the portal sends a CSP (`CSP_MODE=report-only` to observe first).

**Not covered here:** admin-api (Super Admin) has the same error-handling/CORS/shutdown gaps — it is the control plane and is reworked in WS1/WS2.
