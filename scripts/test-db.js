#!/usr/bin/env node
/**
 * Database-backed tests: creates two scratch PostgreSQL databases, applies every migration of both schemas to them
 * (exactly what a fresh install does), runs the tests in apps/tenant-api/test/db, and drops the databases.
 *
 *   npm run test:db                      uses TENANT_DATABASE_URL from apps/tenant-api/.env to find the server
 *   TEST_PG_ADMIN_URL=postgresql://postgres:ci@localhost:5432/postgres npm run test:db
 *   KEEP_TEST_DBS=1 npm run test:db      leave the databases in place afterwards
 *   npm run test:db -- -t "entra"        extra arguments go to vitest
 *
 * The tests themselves skip when TEST_TENANT_DATABASE_URL / TEST_SUPER_ADMIN_DATABASE_URL are not set, so a plain
 * `npm test` never needs a database.
 */
const path = require('path')
const { spawnSync } = require('child_process')
const root = path.resolve(__dirname, '..')

try { require('dotenv').config({ path: path.join(root, 'apps/tenant-api/.env'), quiet: true }) } catch { /* dotenv optional */ }
const { Client } = require('pg')

const adminUrl = process.env.TEST_PG_ADMIN_URL || (() => {
  if (!process.env.TENANT_DATABASE_URL) {
    console.error('Set TEST_PG_ADMIN_URL (a postgresql:// URL of a server where databases may be created) or TENANT_DATABASE_URL.')
    process.exit(2)
  }
  const u = new URL(process.env.TENANT_DATABASE_URL); u.pathname = '/postgres'; return u.toString()
})()

const suffix = `${process.pid}`
const names = { tenant: `dpdp_test_tenant_${suffix}`, sa: `dpdp_test_sa_${suffix}` }
const urlFor = (db) => { const u = new URL(adminUrl); u.pathname = '/' + db; return u.toString() }

function run(cmd, args, env, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit', shell: true })
  return r.status ?? 1
}

;(async () => {
  const admin = new Client({ connectionString: adminUrl })
  await admin.connect()
  let code = 1
  try {
    for (const n of Object.values(names)) {
      await admin.query(`DROP DATABASE IF EXISTS "${n}" WITH (FORCE)`)
      await admin.query(`CREATE DATABASE "${n}"`)
    }
    const tenantUrl = urlFor(names.tenant), saUrl = urlFor(names.sa)
    const dbEnv = { TENANT_DATABASE_URL: tenantUrl, SUPER_ADMIN_DATABASE_URL: saUrl }

    console.log('> applying migrations to the scratch databases')
    const pkg = path.join(root, 'packages/database')
    if (run('npx', ['prisma', 'migrate', 'deploy', '--config=prisma/tenant/prisma.config.ts'], dbEnv, pkg) !== 0) throw new Error('tenant migrations failed')
    if (run('npx', ['prisma', 'migrate', 'deploy', '--config=prisma/super-admin/prisma.config.ts'], dbEnv, pkg) !== 0) throw new Error('super-admin migrations failed')

    console.log('> running database tests')
    code = run('npx', ['vitest', 'run', 'apps/tenant-api/test/db', '--no-file-parallelism', ...process.argv.slice(2)], {
      TEST_TENANT_DATABASE_URL: tenantUrl,
      TEST_SUPER_ADMIN_DATABASE_URL: saUrl,
    })
  } catch (e) {
    console.error(e.message)
  } finally {
    if (!process.env.KEEP_TEST_DBS) {
      for (const n of Object.values(names)) await admin.query(`DROP DATABASE IF EXISTS "${n}" WITH (FORCE)`).catch(() => {})
    } else {
      console.log(`kept: ${names.tenant}, ${names.sa}`)
    }
    await admin.end()
  }
  process.exit(code)
})()
