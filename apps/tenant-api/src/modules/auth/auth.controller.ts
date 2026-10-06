import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authService } from './auth.service'
import { AuthRequest } from '../../middleware/auth'
import { passwordSchema } from './password-policy'
import { passwordResetService } from './password-reset.service'

const setPasswordSchema = z.object({
  password: passwordSchema,
  name: z.string().optional(),
})

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token:    z.string().min(20).max(200),
  password: passwordSchema,
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
})

export const authController = {
  /**
   * Always answers the same thing, immediately, whether or not the address has an account; the work happens after the
   * response, so neither the message nor the response time reveals which emails are registered.
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body)
      void passwordResetService.request(email, req.ip).catch(err => console.error('[password-reset] request failed:', err))
      res.json({ success: true, message: 'If an account exists for that email, a reset link is on its way.' })
    } catch (err) {
      next(err)
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body)
      await passwordResetService.reset({ token: body.token, password: body.password, ipAddress: req.ip })
      res.json({ success: true, message: 'Your password has been changed. You can sign in now.' })
    } catch (err) {
      next(err)
    }
  },

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
      const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined
      await authService.logout({
        userId: req.userId!, tenantId: req.tenantId!, role: req.userRole,
        refreshToken, ipAddress: req.ip,
      })
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