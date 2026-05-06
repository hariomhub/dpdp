import { PrismaClient } from '@prisma/tenant-client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

let instance: PrismaClient | undefined

export function getTenantPrisma(): PrismaClient {
  if (!instance) {
    if (!process.env.TENANT_DATABASE_URL) {
      throw new Error('TENANT_DATABASE_URL is not defined')
    }
    const pool = new Pool({ connectionString: process.env.TENANT_DATABASE_URL })
    const adapter = new PrismaPg(pool)
    instance = new PrismaClient({ adapter })
  }
  return instance
}