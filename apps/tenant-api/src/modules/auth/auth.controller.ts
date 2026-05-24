import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from './auth.service'
import { AuthRequest } from '../../middleware/auth'

const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
})

export const authController = {
  async verifyInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verifyInvite(req.params.token)
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = setPasswordSchema.parse(req.body)
      const result = await authService.setPassword({
        token: req.params.token,
        ...body,
        ipAddress: req.ip,
      })
      res.status(201).json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body)
      const result = await authService.loginByEmail({
        ...body,
        ipAddress: req.ip,
      })
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
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
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, message: 'Logged out successfully' })
    } catch (err) {
      next(err)
    }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.getMe(req.userId!, req.tenantId!)
      res.json({ success: true, data: result })
    } catch (err) {
      next(err)
    }
  },
}