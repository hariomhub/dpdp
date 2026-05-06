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

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}