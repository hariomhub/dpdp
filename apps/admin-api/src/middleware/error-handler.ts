import { Request, Response, NextFunction } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error'

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

  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message })
  }

  if (err instanceof MulterError) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE'
    return res.status(tooBig ? 413 : 400).json({
      success: false,
      message: tooBig ? 'The file is larger than the allowed upload size.' : `Upload error: ${err.message}`,
    })
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}
