import bcrypt from 'bcryptjs'
import { getSuperAdminPrisma } from '@dpdp/database'
import dotenv from 'dotenv'

dotenv.config()

const db = getSuperAdminPrisma()

async function seed() {
  console.log('Seeding Super Admin...')

  const existingAdmin = await db.superAdmin.findFirst()

  if (existingAdmin) {
    console.log('Super Admin already exists. Skipping seed.')
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash('Admin@123456', 12)

  const admin = await db.superAdmin.create({
    data: {
      name: 'Super Admin',
      email: 'admin@dpdpcms.in',
      passwordHash,
      isActive: true,
    },
  })

  console.log('Super Admin created:')
  console.log('  Email:', admin.email)
  console.log('  Password: Admin@123456')
  console.log('  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION')

  process.exit(0)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})