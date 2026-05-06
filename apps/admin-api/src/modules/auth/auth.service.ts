import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getSuperAdminPrisma } from '@dpdp/database'
import { config } from '../../config'

const db = getSuperAdminPrisma()

export const authService = {
  async login(email: string, password: string) {
    const admin = await db.superAdmin.findUnique({
      where: { email },
    })

    if (!admin || !admin.isActive) {
      throw new Error('Invalid credentials')
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    await db.superAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    )

    const refreshToken = jwt.sign(
      { adminId: admin.id, email: admin.email, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    )

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
    }
  },

  async refresh(refreshToken: string) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.secret
      ) as { adminId: string; email: string; type: string }

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      const admin = await db.superAdmin.findUnique({
        where: { id: decoded.adminId },
      })

      if (!admin || !admin.isActive) {
        throw new Error('Admin not found')
      }

      const accessToken = jwt.sign(
        { adminId: admin.id, email: admin.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as any }
      )

      return { accessToken }
    } catch {
      throw new Error('Invalid refresh token')
    }
  },

  async getMe(adminId: string) {
    const admin = await db.superAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })

    if (!admin) throw new Error('Admin not found')
    return admin
  },
}