/**
 * Seed the organisation record (TenantProfile) and per-regulation classifications into the TENANT database from the
 * Super Admin database - for an EXISTING deployment whose organisations were created the old way.
 *
 * A new deployment never needs this: it is activated with a signed licence, which carries the organisation's details
 * (see apps/tenant-api/src/platform/activation.ts). Use this script for:
 *   - the shared development database (several organisations in one tenant database, licences not enforced), and
 *   - a one-time conversion of an existing live deployment, followed by installing its licence.
 *
 * It only ADDS (an organisation that already has a profile is skipped), and it is safe to re-run.
 *
 *   npx ts-node packages/database/src/backfill/profiles-from-super-admin.ts            dry run
 *   npx ts-node packages/database/src/backfill/profiles-from-super-admin.ts --apply
 *   ... --tenant <id>      only that organisation
 *
 * A SUSPENDED organisation is not copied as suspended: the portal no longer has a "suspended" lock-out, only a read-only
 * licence state. It is copied with its normal status and a note is printed.
 */
import { getSuperAdminPrisma, getTenantPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const sa = getSuperAdminPrisma()
const tdb = getTenantPrisma()
const APPLY = process.argv.includes('--apply')
const only = process.argv.includes('--tenant') ? process.argv[process.argv.indexOf('--tenant') + 1] : undefined

async function main() {
  console.log(APPLY ? 'APPLY mode.\n' : 'DRY RUN (add --apply to write).\n')
  const orgs = await sa.tenant.findMany({ where: only ? { id: only } : {}, include: { regulationClassifications: true } as any })
  let created = 0, skipped = 0
  for (const o of orgs as any[]) {
    if (await tdb.tenantProfile.findUnique({ where: { id: o.id }, select: { id: true } })) { skipped++; continue }
    const note = o.status === 'SUSPENDED' || o.status === 'INACTIVE' ? `  (was ${o.status} - copied as ${o.onboardedAt ? 'ACTIVE' : 'ONBOARDING'}; issue it a licence only when it should work)` : ''
    console.log(`  ${o.id}  ${o.name}  [${o.plan}]${note}`)
    if (APPLY) {
      await tdb.tenantProfile.create({
        data: {
          id: o.id, tenantCode: o.tenantCode, name: o.name, industry: o.industry ?? '', orgSize: o.orgSize ?? '', address: o.address ?? '', country: o.country,
          website: o.website, contactEmail: o.contactEmail, dpoName: o.dpoName ?? '', dpoEmail: o.dpoEmail ?? '', dpoPhone: o.dpoPhone,
          panNumber: o.panNumber, gstNumber: o.gstNumber, classification: o.classification, classUncertain: o.classUncertain,
          ceoName: o.ceoName, ceoEmail: o.ceoEmail, plan: o.plan, status: o.onboardedAt ? 'ACTIVE' : 'ONBOARDING',
          inviteToken: o.inviteToken, inviteExpiresAt: o.inviteExpiresAt, inviteAcceptedAt: o.inviteAcceptedAt, onboardedAt: o.onboardedAt,
        },
      })
      for (const c of o.regulationClassifications ?? []) {
        await tdb.tenantRegulationClassification.create({
          data: { tenantId: o.id, regulationId: c.regulationId, applicabilityCategoryId: c.applicabilityCategoryId, isUncertain: c.isUncertain },
        })
      }
    }
    created++
  }
  console.log(`\n${orgs.length} organisation(s) in Super Admin; ${APPLY ? 'copied' : 'to copy'}: ${created}; already had a profile: ${skipped}.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(async () => { await sa.$disconnect(); await tdb.$disconnect() })
