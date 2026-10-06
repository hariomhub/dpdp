import { randomUUID } from 'crypto'
import { Request, Response, NextFunction } from 'express'

/**
 * Gives every request a reference. A caller (a reverse proxy, a gateway) may supply one in X-Request-Id; it is kept only
 * if it is short and plain, so it can be put in logs and responses safely. The id is echoed back in the response header
 * and quoted in the body of unexpected errors, so a support ticket can be matched to a log line.
 */
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/

export function requestId(req: Request, res: Response, next: NextFunction) {
  const supplied = req.headers['x-request-id']
  const id = typeof supplied === 'string' && SAFE_ID.test(supplied) ? supplied : randomUUID()
  ;(req as any).id = id
  res.setHeader('X-Request-Id', id)
  next()
}
