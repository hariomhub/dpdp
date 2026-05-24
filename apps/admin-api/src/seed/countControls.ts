import { getSuperAdminPrisma } from '@dpdp/database'
import dotenv from 'dotenv'
dotenv.config()
async function main() {
  const db = getSuperAdminPrisma()
  try {
    const controls = await db.control.findMany({ include: { regulationMappings: { include: { regulation: true } } } });
    const byReg: Record<string, number> = {};
    for (const c of controls) {
      if (c.regulationMappings.length === 0) byReg['none'] = (byReg['none'] || 0) + 1;
      for (const m of c.regulationMappings) {
        const code = m.regulation?.shortCode || 'unknown';
        byReg[code] = (byReg[code] || 0) + 1;
      }
    }
    console.log("Controls mapped to regulations:", byReg)
    console.log("Total controls fetched:", controls.length)
  } catch(e) {
    console.error(e)
  } finally {
    db.$disconnect()
  }
}
main()
