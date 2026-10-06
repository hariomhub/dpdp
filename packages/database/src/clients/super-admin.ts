import { PrismaClient } from '@prisma/super-admin-client'
import { createPool } from './pool'
import { PrismaPg } from '@prisma/adapter-pg'

let instance: PrismaClient | undefined

export function getSuperAdminPrisma(): PrismaClient {
  if (!instance) {
    if (!process.env.SUPER_ADMIN_DATABASE_URL) {
      throw new Error('SUPER_ADMIN_DATABASE_URL is not defined')
    }
    const pool = createPool(process.env.SUPER_ADMIN_DATABASE_URL, 'super-admin')
    const adapter = new PrismaPg(pool)
    instance = new PrismaClient({ adapter })
  }
  return instance
}