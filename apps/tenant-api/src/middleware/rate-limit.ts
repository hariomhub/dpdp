import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { config } from '../config'

/**
 * Who is calling, for rate-limiting purposes. A signed-in user gets their own bucket, so an office of 200 people
 * behind one NAT or reverse proxy does not share (and instantly exhaust) a single per-IP counter. Callers with no
 * valid token are limited by IP address.
 */
export function rateLimitKey(req: Request): string {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), config.jwt.secret) as { userId?: string }
      if (decoded.userId) return `u:${decoded.userId}`
    } catch {
      // invalid or expired token: falls through to the IP bucket
    }
  }
  return `ip:${req.ip}`
}

const tooMany = (_req: Request, res: Response) => {
  res.status(429).json({ success: false, message: 'Too many requests. Please wait a moment and try again.' })
}

/**
 * General API limiter. Only API routes are limited - the SPA's static assets and /health are not - so loading a
 * page no longer burns the budget.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  keyGenerator: (req) => {
    const key = rateLimitKey(req)
    ;(req as any).__rlKey = key
    return key
  },
  limit: (req) => ((req as any).__rlKey as string | undefined)?.startsWith('u:')
    ? config.security.rateLimit.userPerMinute
    : config.security.rateLimit.anonPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
})

/**
 * "Forgot password" requests. The endpoint always answers 200 (so it never reveals which emails exist), which means the
 * credential limiter below - which ignores successful requests - would never count them. This one counts every request,
 * keyed by IP + email, so one address cannot be used to flood a mailbox or probe the system.
 */
export const resetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => config.security.rateLimit.resetRequestPer15Min,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return `reset:${req.ip}:${email}`
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
})

/**
 * Tight limiter for credential endpoints (sign-in, set/reset password). Keyed by IP + the email being tried, so one
 * person's typos never lock out colleagues behind the same address, while guessing at one account is throttled.
 * Successful requests are not counted.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => config.security.rateLimit.authPer15Min,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return `auth:${req.ip}:${email || req.params?.token || ''}`
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
})
