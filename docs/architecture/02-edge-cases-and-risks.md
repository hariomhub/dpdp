# 02 — Edge cases and risks

| Area | Situation | Rule / handling |
|---|---|---|
| **Update** | Update fails or is interrupted mid-migration | Backup gate first; one advisory lock; migration runs transactionally where possible; on failure keep previous revision serving (N-1 compatible), report, never half-switch. Destructive step failed → restore backup. |
| | Customer skips versions | Direct upgrade only inside the support window; otherwise `dpdpctl plan` names the required stop(s). Cumulative bundles for air-gap. |
| | Rollback after the new version wrote data | Possible without DB restore because schema N+1 is N-compatible; content is forward-fix only (publish N+1). |
| | Update during business hours | Windows + approval states (available → staged → approved → scheduled → applying → verified/rolled back); P0 content patches are in-app and non-disruptive. |
| | Very large table migration | Expand-only in patches; batched idempotent backfills; `lock_timeout`; index builds in their own step. |
| **Database** | Customer DBA changed the schema | Drift check before update; extra objects tolerated, conflicts block with a report; `--accept-drift` is explicit and logged. |
| | DB restored from a backup older than installed content/app | `platform_*` records versions; on start the app compares and enters "needs reconcile": re-import content, run pending migrations; never serve a newer app on an older schema. |
| | Catalog damaged/edited | Catalog is disposable: rebuild by re-importing the retained bundles. Customer data never lives in `catalog`. |
| | Two importers run at once | Advisory lock; second waits/aborts. |
| | Tenant rows reference a retired Library item | Tombstone keeps the row; UI shows "retired, replaced by X"; importer never deletes referenced IDs; post-import dangling-reference count must be 0. |
| **Library** | Overlay overrides a field the platform later changes | Conflict queue (keep/accept/merge); nothing silently overwritten. |
| | Licensed control cites an unlicensed regulation | Reference stub (id, code, title) so mappings stay intact. |
| | Bundle for one customer applied to another | Bundle is bound to licence/instance; importer verifies binding and signature. |
| | Content format newer than the app | `requires` check refuses; additive fields in the same format are ignored by older apps. |
| **Licence** | Expires | Grace → restricted mode; data access and export always remain; renewal page works. |
| | Same licence on two instances | Instance binding in the licence; heartbeat flags duplicates (connected); air-gapped relies on binding. |
| | Clock wound back (air-gap) | Monotonic last-seen timestamp in DB; larger backward jumps flag the licence state and require re-activation. |
| | Cannot renew in time (air-gap) | 60-day grace; renewal arrives as a file like a bundle. |
| | Licence revoked (connected) | Heartbeat response → restricted mode, not deletion. |
| **Supply chain** | Signing key compromised/rotated | Trust store holds key ids; new keys introduced by a release signed by the old key; revocation list in metadata. |
| | Rollback/freeze attack on update metadata | Version + expiry in signed metadata; instance refuses older/expired metadata. |
| | Corrupted/tampered offline bundle | Signature + per-file SHA-256 verified before anything is applied. |
| **Storage** | Disk or container full | `/ready` reports capacity; uploads refused with a clear message; alert at threshold. |
| | File missing after a partial restore | Link creation checks existence → "file unavailable" (never a broken link); DB row and audit trail intact. |
| | Provider switched (e.g. local → Azure) | Each row stores its own provider; old rows keep resolving. |
| | Orphaned upload (DB write failed) | Service discards the stored object (compensation). |
| | Malicious upload | Allow-list + magic-byte check, attachment/sandbox serving, optional AV hook / Defender for Storage. |
| | Embedded external video offline | Flagged at build; offline entitlement includes only courses with uploaded media. |
| | Media pack incomplete | Course not published until every asset hash is present. |
| **Identity** | IdP down / misconfigured | Local break-glass admin always works. |
| | Same email in two orgs (shared-era data) | One org per deployment removes the ambiguity going forward; reset emails currently go once per matching account. |
| | User removed at IdP | Deactivation on next sync/login check; tokens are short-lived (15 min), refresh checks status. |
| | External auditor access expires mid-audit | Auto-deactivate at end date; CEO/CO can extend; export package remains available. |
| | Password reset race / reuse | Link claimed atomically; single use; older links voided; sessions issued before the reset are rejected. |
| **Email** | No mail server | Copy-link fallback for invites and resets; SMTP optional auth/TLS. |
| | Mail fails | Invitation/reset still exist and can be resent; failure logged, never blocks the request. |
| **Operations** | Server lost | Restore DB + files + **keys** to a new host; keys stored separately or stored credentials are unreadable. |
| | Clock skew | NTP required; JWT/licence/token checks assume sane time. |
| | Many users behind one NAT | Rate limits are per user; login limits per IP+email. |
| | Several app replicas | App stateless; shared file store required; per-process rate limit counters (shared store later); worker idempotent (BullMQ keyed schedulers). |
| | Redis evicts keys | BullMQ needs `maxmemory-policy=noeviction`; checked in `doctor`. |
| | Restore drill never run | `dpdpctl backup verify` restores to a scratch DB and checks counts + sample files. |
| **Concurrency** | Two edits to one evidence record | Version-guarded update; the loser gets a clear retry message. |
| | Code generation races (task/asset codes) | Counter allocated in the DB (not max+1) — audit item. |
| **Compliance** | Evidence deleted/replaced | Soft delete + versions; audit entries; hashes recorded. |
| | Regulator asks "what was submitted first?" | Version history with file, uploader, replaced-by, timestamps. |
| | Customer wants a retention rule | Out of scope until asked; software never deletes on its own. |

## Top risks
1. **Tenant ↔ Super Admin DB coupling** (13 files) — blocks every variant. *Mitigation: WS1 first.*
2. **No tests before this work** — mitigated by the new test/CI harness; keep extending it.
3. **Fleet version skew** (every customer separate) — support window, required stops, `doctor`, heartbeat visibility.
4. **Managed Redis + BullMQ unverified** — spike; fallback Valkey.
5. **Content contract frozen too early** — cut `contentFormat` v1 only after the node cutover.
6. **Secrets history** — an SMTP password committed in the first git commit is still in use; rotate.
