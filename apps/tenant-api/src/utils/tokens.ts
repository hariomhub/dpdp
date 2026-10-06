import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface TokenPayload {
  userId:   string
  tenantId: string
  role:     string
}

/**
 * Every signed token says what it is for (`type`). An access token is the only kind the API accepts on a request, so a
 * refresh token (valid for days) or a sign-in `state` token can never be used as one.
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, role: payload.role, type: 'access' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any },
  )
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, role: payload.role, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn as any },
  )
}

export function generateTokens(payload: TokenPayload) {
  return { accessToken: signAccessToken(payload), refreshToken: signRefreshToken(payload) }
}
