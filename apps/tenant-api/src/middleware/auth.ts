import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { gateRequest } from '../platform/licence-gate'
import { evaluateSession, getUserAccess } from '../utils/user-access'

export interface AuthRequest extends Request {
  userId?: string
  tenantId?: string
  userRole?: string
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided',
    })
  }

  const token = authHeader.split(' ')[1]

  let decoded: { userId: string; tenantId: string; role: string; iat?: number; type?: string }
  try {
    decoded = jwt.verify(token, config.jwt.secret) as typeof decoded
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }

  // Only an access token may authenticate a request. A refresh token (valid for days) or a sign-in state token is signed
  // with the same secret and must not be usable as one. Tokens issued before the `type` claim existed carry none and
  // are still accepted until they expire (15 minutes).
  if ((decoded.type !== undefined && decoded.type !== 'access') || !decoded.userId || !decoded.tenantId || !decoded.role) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }

  // The token says who the caller WAS when it was issued. Check who they are NOW: still active, password not changed
  // since, and the role they hold today (a demotion or deactivation must not wait for the token to expire).
  let role = decoded.role
  const access = await getUserAccess(decoded.userId)
  if (access !== undefined) {
    const verdict = evaluateSession(decoded, access)
    if (!verdict.ok) return res.status(verdict.status).json({ success: false, message: verdict.message })
    role = verdict.role
  }

  // The licence decides whether this request may change anything. When it has lapsed the portal is read-only: reading
  // and exporting always work, changes are refused (platform/licence-gate.ts). A failed lookup does not lock people out.
  try {
    const gate = await gateRequest(decoded.tenantId, req.method, req.originalUrl)
    if (!gate.allowed) return res.status(403).json({ success: false, code: gate.code, message: gate.message })
  } catch (err) {
    console.error('licence check failed; allowing the request', err)
  }

  req.userId = decoded.userId
  req.tenantId = decoded.tenantId
  req.userRole = role
  next()
}

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      })
    }
    next()
  }
}
