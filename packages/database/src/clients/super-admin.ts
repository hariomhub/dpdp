import { PrismaClient } from '@prisma/super-admin-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

let instance: PrismaClient | undefined

export function getSuperAdminPrisma(): PrismaClient {
  if (!instance) {
    if (!process.env.SUPER_ADMIN_DATABASE_URL) {
      throw new Error('SUPER_ADMIN_DATABASE_URL is not defined')
    }
    const pool = new Pool({ connectionString: process.env.SUPER_ADMIN_DATABASE_URL })
    const adapter = new PrismaPg(pool)
    instance = new PrismaClient({ adapter })
  }
  return instance
}