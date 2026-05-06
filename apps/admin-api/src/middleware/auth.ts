import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AuthRequest extends Request {
  adminId?: string
  adminEmail?: string
}

export const authenticate = (
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

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as {
      adminId: string
      email: string
    }
    req.adminId = decoded.adminId
    req.adminEmail = decoded.email
    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    })
  }
}