import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tenant-api/.env' });
import { getTenantPrisma } from './packages/database/src/clients/tenant';

async function main() {
  const db = getTenantPrisma();
  
  const depts = await db.department.findMany();
  console.log('Departments:', depts.length);
  depts.forEach(d => console.log(`  ${d.id} - ${d.name}`));

  const assets = await db.asset.findMany();
  console.log('\nAssets:', assets.length);
  assets.forEach(a => console.log(`  ${a.id} - ${a.name} (Dept: ${a.departmentId})`));

  await db.$disconnect();
}
main().catch(console.error);
