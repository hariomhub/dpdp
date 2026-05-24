import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err)

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  const message = err.message || 'Internal server error'
  const status = message === 'Unauthorized' ? 401
    : message.includes('not found') ? 404
    : message.includes('already exists') ? 409
    : 500

  return res.status(status).json({
    success: false,
    message,
  })
}