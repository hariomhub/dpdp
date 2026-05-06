import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from './auth.service'
import { AuthRequest } from '../../middleware/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = loginSchema.parse(req.body)
    const result = await authService.login(email, password)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      })
    }
    const result = await authService.refresh(refreshToken)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    res.json({ success: true, message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = await authService.getMe(req.adminId!)
    res.json({ success: true, data: admin })
  } catch (err) {
    next(err)
  }
}