# Evidence & file storage — setup

How customer evidence is stored, what to create in Azure, and the settings to apply. Evidence handling is identical in every
deployment mode; only the storage *provider* changes (`azure` in the cloud, a local directory or NAS on-prem).

## What is stored where

| Files | Store | Notes |
|---|---|---|
| Evidence uploads, gap-finding attachments (**customer data**) | **Evidence storage account**, container `evidence` | Private. Key: `<tenantId>/evidence/<taskId>/<uuid>.<ext>` and `<tenantId>/gap-findings/<taskId>/<uuid>.<ext>`. The customer's file name is stored in the database only. |
| Sample evidence shown to tenants (vendor content) | **Vendor content account** (the existing one), container `master-evidence` | Written by Super Admin, read by the tenant API. Interim: replaced later by the Asset Library. |
| LMS content and learner submissions | Vendor content account (existing containers) | **Unchanged.** |

Keep customer evidence in its **own storage account**, separate from the vendor content account, so only the tenant API holds
the evidence account's key.

## Create in Azure

1. A **new storage account** for customer evidence (any unique name you like), with:
   - Performance *Standard*; redundancy to match your recovery needs (ZRS or GRS recommended for evidence).
   - **Allow Blob anonymous access: Disabled.** Minimum TLS version 1.2.
   - **Blob soft delete** (e.g. 30 days) and **container soft delete** on; optionally **blob versioning**.
   - Optional later: an immutability (WORM) policy on the container if a customer needs legal-hold style retention.
   - Optional: **Microsoft Defender for Storage → malware scanning on upload** (a paid add-on; check pricing). The application
     already restricts file types; this adds known-malware detection with no code change.
2. A container named **`evidence`** (private). The app will also create it on first upload if its identity is allowed to.
3. In the **vendor content account**, a private container **`master-evidence`** (the app creates it if missing).

## Application settings

**tenant-api**

| Setting | Value |
|---|---|
| `STORAGE_PROVIDER` | `azure` |
| `AZURE_EVIDENCE_CONNECTION_STRING` | connection string of the **evidence** account |
| `AZURE_EVIDENCE_CONTAINER` | `evidence` (default) |
| `AZURE_STORAGE_CONNECTION_STRING` | the existing **vendor content** account (LMS + sample evidence) — do **not** point this at the evidence account |
| `AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER` | `master-evidence` (default) |
| `MAX_FILE_SIZE_MB` | `25` (default) |
| `ALLOWED_UPLOAD_EXTENSIONS` | optional comma list to override the built-in allow-list |
| `FILE_LINK_TTL_SECONDS` | `60` (default) — lifetime of a view/download link |
| `TRUST_PROXY` | number of proxy hops in front of the app (`1` for Azure App Service; default `1` in production) |
| `RATE_LIMIT_USER_PER_MINUTE` / `RATE_LIMIT_ANON_PER_MINUTE` / `RATE_LIMIT_AUTH_PER_15MIN` / `RATE_LIMIT_RESET_REQUEST_PER_15MIN` | `600` / `120` / `10` / `5` (defaults) |

> `AZURE_EVIDENCE_CONNECTION_STRING` is **required** when `STORAGE_PROVIDER=azure` (the app refuses to start without it). There is no
> fallback to `AZURE_STORAGE_CONNECTION_STRING`: that account holds vendor content, and customer files must never land in it by accident.
> A complete, commented list of every setting is in `apps/tenant-api/.env.example`.

**admin-api**

| Setting | Value |
|---|---|
| `STORAGE_PROVIDER` | `azure` |
| `AZURE_STORAGE_CONNECTION_STRING` | the vendor content account |
| `AZURE_STORAGE_MASTER_EVIDENCE_CONTAINER` | `master-evidence` (default) |

## How files are served

Files have **no public URL**. A signed-in user who may see a file asks the API for a link; the API checks access, writes an
`EVIDENCE_VIEWED` entry to the audit log, and returns a ~60-second single-purpose link. PDFs and images open in the browser;
everything else downloads. Evidence that is replaced or deleted is **kept** (earlier versions stay retrievable, delete is a
soft delete); nothing is purged automatically.

## Local development (no Azure account needed)

```bash
npm run azurite                     # starts the Azure Storage emulator (Docker is not required)
```

then, in `apps/tenant-api/.env` and `apps/admin-api/.env`:

```
STORAGE_PROVIDER=azure
AZURE_EVIDENCE_CONNECTION_STRING=UseDevelopmentStorage=true     # tenant-api
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true      # admin-api (and tenant-api, for sample evidence)
```

Leave `STORAGE_PROVIDER` unset to use plain local disk instead (`UPLOAD_DIR`, default `./uploads`). Note: with local disk,
sample evidence uploaded in Super Admin cannot be seen by the tenant API (they run from different directories) — use the emulator
for that.

## Tests

```bash
npm test                                                   # unit tests
AZURE_TEST_CONNECTION_STRING="UseDevelopmentStorage=true" npm test    # also runs the Azure adapter tests (Azurite must be running)
```

## Rollout notes

- New database migrations are **additive only** and are applied by the existing deploy workflows (`prisma migrate deploy`).
- Set the application settings above **before** (or together with) the deploy; with `STORAGE_PROVIDER=azure` and no connection
  string, uploads fail with a clear error rather than falling back silently.
- Rows created before this change that point at server-disk files (`/uploads/...`) show as "file unavailable" wherever the file
  is not on that server; nothing is ever served from a public URL.
