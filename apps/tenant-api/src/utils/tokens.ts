import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  userId:   string
  tenantId: string
  role:     string
}

export function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, role: payload.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  )
  const refreshToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, role: payload.role, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as any }
  )
  return { accessToken, refreshToken }
}