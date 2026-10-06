# Bundle format (v1, draft)

> Status: 🔲 design for step 7. Everything here is intended; field names may change until implemented.

A bundle is a single archive (`.dpdpbundle`, a tar) plus a `SHA256SUMS` file shipped next to it. It is **self-describing and
self-verifying**: the manifest names every file with its hash, and the manifest itself is signed.

## Layout

```
bundle-1.3.0-to-1.4.2.dpdpbundle
├── manifest.json                 what is inside and what it requires          ← signed
├── manifest.sig                  Ed25519 signature over the exact bytes of manifest.json (key id in the manifest)
├── images/                       OCI image archives, one per changed image
│   ├── niyamsaathi-api@sha256-<digest>.tar
│   └── niyamsaathi-worker@sha256-<digest>.tar
├── migrations/                   forward-only SQL migrations, in order, with their checksums
├── library/                      Library release(s): packs of regulations, controls, LMS content, signed individually
│   └── 2026.10.1/…
├── assets/                       content-addressed media packs, chunked for resumable copy
│   └── sha256-<hash>/chunk-0001 …
├── licence/                      optional refreshed licence (a signed file, bound to the organisation)
└── tools/                        dpdpctl (install bundles only)
```

## `manifest.json`

| Field | Meaning |
|---|---|
| `format` | Bundle format version (integer). An older tool refuses a newer format with a clear message |
| `bundleId`, `sequence` | Unique id and a **monotonic sequence**; a site never applies a lower sequence than it already has |
| `kind` | `install` or `update` |
| `channel` | `stable`, `lts`, … |
| `from`, `to` | Application versions this bundle moves between (`from` is empty for `install`) |
| `requiredStops` | Versions that cannot be skipped between `from` and `to` (destructive schema steps) |
| `schema` | `{ from, to }` migration identifiers |
| `library` | `{ from, to, contentFormat }` — the Library release and the content format the importer must understand |
| `images[]` | `{ name, digest, file, sha256, size }` |
| `migrations[]` | `{ name, file, sha256 }` |
| `assets[]` | `{ hash, size, chunks, required }` |
| `licence` | Present when a refreshed licence is included |
| `binding` | `{ organisationId, instanceId? }` — the only site this bundle may be applied to; `null` for a generic install bundle |
| `createdAt`, `notBefore`, `expiresAt` | Validity window (anti-replay / anti-freeze) |
| `requires` | `{ minDpdpctl, minTrustVersion, minFreeDiskGb }` |
| `revokedKeys[]`, `newTrustKeys[]` | Key rotation material (new keys are only accepted from a bundle signed by a currently trusted key) |
| `sbom` | Reference to the SBOM file for the images |
| `keyId` | Which trusted public key verifies `manifest.sig` |

See [manifest.example.json](manifest.example.json).

## How `dpdpctl bundle verify` decides (offline, nothing is changed)

1. **Format**: the format version is one this `dpdpctl` understands.
2. **Signature**: `manifest.sig` verifies over the exact bytes of `manifest.json` with a key from the **built-in trust list** (the
   vendor key compiled into the release, not a setting). Unknown key id → refuse.
3. **Window**: now is within `notBefore`…`expiresAt` (with a small tolerance); the clock is checked against the stored
   monotonic "last seen" time first.
4. **Sequence**: `sequence` is greater than the site's highest applied sequence.
5. **Binding**: `binding.organisationId` equals this site's organisation (from the installed licence).
6. **Files**: every file listed exists, has the stated size and SHA-256. A single mismatch refuses the whole bundle.
7. **Fit**: `from` equals the installed version (or is inside the support window); `requiredStops` are respected; free disk and
   `requires` are met; the licence's `updatesUntil` covers `to`.
8. **Result**: a plain report — what would change, what is missing, and why anything is refused.

`plan` adds the *drift check* (the live schema compared to the expected fingerprint) and the backup gate; `apply` performs the
update and writes the result to the `platform_*` tables and `update-report.json`.

## Compatibility rules

- The importer ignores unknown **additive** fields in the same `format`; a new `format` number means "update `dpdpctl` first".
- Library content carries its own `contentFormat`; an application that cannot read it refuses the Library release but keeps running.
- Bundles are cumulative inside the support window, so a site that skips a bundle can still catch up with the next one.
