/**
 * Licence tooling for operators.
 *
 *   npx ts-node scripts/licence.ts keygen [--dir .licence-keys] [--kid dev-1]
 *       Creates a signing key pair. Keep the PRIVATE key secret (production: a managed key, never in the repo).
 *       Writes trust-keys.json (the public half) - for development point PLATFORM_TRUST_KEYS_FILE at it; for production
 *       put the public key into packages/platform/src/built-in-keys.ts before building the images.
 *
 *   npx ts-node -P apps/admin-api/tsconfig.json scripts/licence.ts issue --tenant <organisation id> [--airgapped] [--months 12] [--out file]
 *       Issues a licence from the Super Admin database (needs LICENCE_SIGNING_KEY_FILE + LICENCE_KEY_ID in
 *       apps/admin-api/.env). Same code as the Super Admin endpoint.
 *
 *   npx ts-node scripts/licence.ts inspect <file>
 *       Verifies a licence against the trusted keys and prints what it says and what state it is in right now.
 */
import * as fs from 'fs'
import * as path from 'path'
import { evaluateLicence, generateSigningKeyPair, loadTrustKeys, verifyLicence } from '@dpdp/platform'

const [, , cmd, ...rest] = process.argv
const arg = (name: string, fallback?: string) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 ? (rest[i + 1] && !rest[i + 1].startsWith('--') ? rest[i + 1] : 'true') : fallback
}

async function main() {
  if (cmd === 'keygen') {
    const dir = path.resolve(arg('dir', '.licence-keys')!)
    const kid = arg('kid', 'dev-1')!
    fs.mkdirSync(dir, { recursive: true })
    const { privateKeyPem, publicKeyPem } = generateSigningKeyPair()
    fs.writeFileSync(path.join(dir, `${kid}.private.pem`), privateKeyPem, { mode: 0o600 })
    fs.writeFileSync(path.join(dir, `${kid}.public.pem`), publicKeyPem)
    fs.writeFileSync(path.join(dir, 'trust-keys.json'), JSON.stringify([{ kid, publicKey: publicKeyPem }], null, 2))
    console.log(`Key pair written to ${dir}\n`)
    console.log('Super Admin (apps/admin-api/.env):')
    console.log(`  LICENCE_SIGNING_KEY_FILE=${path.join(dir, `${kid}.private.pem`)}`)
    console.log(`  LICENCE_KEY_ID=${kid}\n`)
    console.log('Instance (apps/tenant-api/.env, development only):')
    console.log(`  PLATFORM_TRUST_KEYS_FILE=${path.join(dir, 'trust-keys.json')}`)
    return
  }

  if (cmd === 'issue') {
    const tenant = arg('tenant')
    if (!tenant) throw new Error('--tenant <organisation id> is required')
    // Loaded only for this command: it needs the Super Admin environment.
    require('dotenv').config({ path: path.resolve(__dirname, '../apps/admin-api/.env') })
    const { issueLicence } = require('../apps/admin-api/src/modules/organizations/licence-issuer')
    const r = await issueLicence({ tenantId: tenant, airGapped: arg('airgapped') === 'true', extendMonths: arg('months') ? Number(arg('months')) : undefined })
    const out = arg('out')
    if (out) { fs.writeFileSync(out, r.licence); console.log(`Licence for ${r.organization.name} written to ${out} (valid until ${r.validUntil.toISOString().slice(0, 10)})`) }
    else console.log(r.licence)
    return
  }

  if (cmd === 'inspect') {
    const file = rest[0]
    if (!file) throw new Error('usage: inspect <file>')
    const p = verifyLicence(fs.readFileSync(file, 'utf8'), loadTrustKeys(process.env))
    const status = evaluateLicence({ validFrom: new Date(p.validFrom * 1000), validUntil: new Date(p.validUntil * 1000), graceDays: p.graceDays }, new Date())
    console.log(JSON.stringify({ signature: 'valid', organisation: p.org.name, code: p.org.code, plan: p.plan, limits: p.limits, validUntil: new Date(p.validUntil * 1000).toISOString(), graceDays: p.graceDays, airGapped: p.airGapped, stateNow: status.state, daysLeft: status.daysLeft }, null, 2))
    return
  }

  console.log('Commands: keygen | issue | inspect  (see the header of scripts/licence.ts)')
}

main().catch(e => { console.error(e.message ?? e); process.exit(1) })
