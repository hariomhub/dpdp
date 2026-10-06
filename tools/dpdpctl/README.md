# dpdpctl — the operator's tool

> Status: 🔲 **step 4** (core, migrations) and **steps 6–7** (install, bundles). Nothing is built yet; this page fixes what it is
> for and how it behaves. Overview of where it fits: [deploy/README.md](../../deploy/README.md).

`dpdpctl` is the one tool that installs, updates, backs up, restores and diagnoses a deployment. Customers' IT teams run it
(we assist at first); in Azure only its migration part runs, as a job. It talks to **the deployment** (database, containers) and,
when allowed, **outbound** to the update source — never the other way round.

## Commands

| Command | Variant | What it does |
|---|---|---|
| `install` | B, C | Checks the host (Docker, disk, time, ports, DNS) → writes `.env` and secrets → pulls/loads images (verifying signatures) → starts the stack → runs migrations → activates with the licence → prints the CEO invitation |
| `plan` | B, C (A in pipelines) | Reads the installed version and the signed update metadata; says what an update would do, which **required stops** lie between, disk needed, licence `updatesUntil`. Changes nothing |
| `update` | B, A | Pull → verify signature + checksums → **backup gate** → migrate (advisory lock, drift check) → switch containers → `/ready` → record in `platform_*` |
| `bundle verify \| plan \| apply` | C | The same, from a signed file; `verify` runs fully offline |
| `migrate` | A, B, C | The migration runner alone (what the Azure migration **job** and the Compose `migrate` service run) |
| `backup`, `backup verify`, `restore` | B, C (A: customer's tooling + runbook) | Database + files; the encryption keys are handled **separately** on purpose; `verify` restores to a scratch database and checks counts and sample files |
| `doctor` | all | Time/NTP, disk, DNS, ports, database, Redis `noeviction`, storage reachability and space, licence state, version skew |
| `licence install` | all | Installs a licence file (same as Settings → Licence) |
| `keys rotate` | all | Re-encrypts stored credentials with a new key (needs key ids in the ciphertext — 🔲) |
| `support-bundle` | B, C | Redacted logs + settings + `doctor` output in one archive, no internet needed |

## Behaviour rules

- **Idempotent and resumable**: running a command twice is safe; an interrupted update continues or reports exactly where it stopped.
- **Never destructive without a backup**: the backup gate runs before any migration; a failed gate stops the update.
- **One at a time**: an advisory lock in the database prevents two updates (or two instances of `dpdpctl`) from overlapping.
- **Forward-only schema**: migrations are additive; rollback is "start the previous image". Destructive steps only at a required stop,
  after at least two releases of deprecation.
- **Drift check**: the live schema is compared to the expected fingerprint. Extra customer objects are tolerated; a changed or
  dropped managed object blocks the update with a report (`--accept-drift` is explicit and logged).
- **Verify before touching anything**: signatures, hashes, validity window, organisation binding, sequence number.
- **Plain output**: every refusal says what is wrong and what to do; `--json` for automation; exit codes are stable.

## Planned layout

```
tools/dpdpctl/
  README.md
  src/
    commands/   install · plan · update · bundle · migrate · backup · restore · doctor · licence · support-bundle
    lib/        trust (keys, signatures) · backup-gate · drift · lock · compose · registry-client · report
  test/
```

## Open decisions (step 4)

- Packaging: inside the API image (so it exists wherever the stack runs) **and** as a standalone executable for hosts.
- Where state lives on a host (config directory, last-applied sequence is in the database, not on disk).
- The registry and update-metadata endpoint (decided with the CI work).
