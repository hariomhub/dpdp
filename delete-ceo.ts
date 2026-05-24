import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tenant-api/.env' });
import { getTenantPrisma } from './packages/database/src/clients/tenant';

async function main() {
  const db = getTenantPrisma();
  const email = 'hariom.sde@gmail.com';
  
  const deletedUser = await db.user.deleteMany({
    where: { 
      email,
      role: 'CEO'
    }
  });
  
  console.log(`Deleted ${deletedUser.count} CEO account(s) for ${email}.`);
  
  // Verify remaining accounts
  const remaining = await db.user.findMany({
    where: { email }
  });
  
  console.log('\nRemaining accounts:');
  remaining.forEach(u => console.log(`- ID: ${u.id}, Role: ${u.role}, Tenant: ${u.tenantId}`));

  await db.$disconnect();
}
main().catch(console.error);
