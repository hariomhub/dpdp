import { getSuperAdminPrisma } from '@dpdp/database'
import dotenv from 'dotenv'
dotenv.config()
async function main() {
  const db = getSuperAdminPrisma()
  try {
    const regs = await db.regulation.findMany()
    console.log(regs.map(r => ({id: r.id, shortCode: r.shortCode, name: r.name})))
    const controls = await db.control.count()
    console.log('Total controls:', controls)
  } catch(e) {
    console.error(e)
  } finally {
    db.$disconnect()
  }
}
main()
