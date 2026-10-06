import { Request, Response, NextFunction } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error'

/**
 * What the client is allowed to learn about a failure.
 *
 *  - Errors raised on purpose (HttpError, validation, upload limits, a service's `throw new Error('Department not found')`)
 *    are the user's business: they get a 4xx and the message.
 *  - Anything unexpected (a bug, the database, a network call) is a 500 with a generic message and a request id.
 *    The detail - which for a database error includes table, column and query text - goes to the server log only.
 */

const GENERIC_500 = 'Something went wrong on our side. Please try again; if it keeps happening, contact support and quote the reference.'

/** A plain Error whose text is really an infrastructure failure, not a business rule. */
const INFRASTRUCTURE_TEXT = /ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up|connection (terminated|refused|timeout)|can't reach database|prisma|invocation|timeout exceeded|too many clients/i

interface Classified { status: number; message: string; body?: Record<string, unknown>; unexpected: boolean }

const isPrismaError = (err: any): boolean => typeof err?.name === 'string' && err.name.startsWith('PrismaClient')

function classifyPrisma(err: any): Classified {
  switch (err.code) {
    case 'P2002': return { status: 409, message: 'A record with these details already exists.', unexpected: false }
    case 'P2025': return { status: 404, message: 'The record was not found.', unexpected: false }
    case 'P2003': return { status: 409, message: 'This record is linked to other records, so the change was not allowed.', unexpected: false }
    case 'P2034': return { status: 409, message: 'Another change happened at the same time. Please try again.', unexpected: false }
    default:      return { status: 500, message: GENERIC_500, unexpected: true }
  }
}

export function classifyError(err: any): Classified {
  if (err instanceof ZodError) {
    return {
      status: 400, message: 'Validation error', unexpected: false,
      body: { errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })) },
    }
  }

  if (err instanceof HttpError) return { status: err.status, message: err.message, body: err.extra, unexpected: false }

  if (err instanceof MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE'
    return {
      status: tooBig ? 413 : 400, unexpected: false,
      message: tooBig ? 'The file is larger than the allowed upload size.' : `Upload error: ${err.message}`,
    }
  }

  if (isPrismaError(err)) return classifyPrisma(err)

  // Errors from Express middleware (malformed JSON, body too large) carry their own safe status and message.
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500 && err.expose === true) {
    return { status: err.status, message: err.message, unexpected: false }
  }

  // A deliberate `throw new Error('...')` in a service. Subclasses (TypeError, AxiosError, ...) are bugs or
  // infrastructure and fall through to the generic 500.
  if (err && err.constructor === Error && typeof err.message === 'string' && err.message && !INFRASTRUCTURE_TEXT.test(err.message)) {
    const message: string = err.message
    const status = message === 'Unauthorized' ? 401
      : message.includes('not found') ? 404
      : message.includes('already exists') ? 409
      : 400
    return { status, message, unexpected: false }
  }

  return { status: 500, message: GENERIC_500, unexpected: true }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) return next(err)

  const c = classifyError(err)
  const requestId = (req as any)?.id as string | undefined

  if (c.unexpected) console.error(`[error] ${requestId ?? '-'} ${req?.method ?? ''} ${req?.originalUrl ?? ''}`, err)

  return res.status(c.status).json({
    success: false,
    message: c.message,
    ...(c.body ?? {}),
    ...(c.unexpected && requestId ? { reference: requestId } : {}),
  })
}
