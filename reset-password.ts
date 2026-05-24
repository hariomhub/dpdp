import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/tenant-api/.env' });
import { getTenantPrisma } from './packages/database/src/clients/tenant';
import * as bcrypt from 'bcryptjs';

async function main() {
  const db = getTenantPrisma();
  const email = 'hariom.sde@gmail.com';
  
  const user = await db.user.findFirst({
    where: { email }
  });
  
  if (user) {
    const newHash = await bcrypt.hash('Hariom@321', 12);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    });
    console.log(`Password reset for ${email}. You can now log in with Hariom@321`);
  } else {
    console.log('User not found!');
  }
  await db.$disconnect();
}
main().catch(console.error);
