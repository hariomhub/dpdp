import { getSuperAdminPrisma } from '@dpdp/database'
import dotenv from 'dotenv'
dotenv.config()
async function main() {
  const db = getSuperAdminPrisma()
  try {
    const resReg = await db.regulation.deleteMany({
      where: { shortCode: 'DPDP' }
    })
    console.log(`Deleted DPDP 2026: ${resReg.count} records`)

    // Delete controls that have no regulation mappings
    const resCtrl = await db.control.deleteMany({
      where: { regulationMappings: { none: {} } }
    })
    console.log(`Deleted orphaned controls: ${resCtrl.count} records`)

    const controls = await db.control.count()
    console.log('Total controls remaining:', controls)
  } catch(e) {
    console.error(e)
  } finally {
    db.$disconnect()
  }
}
main()
