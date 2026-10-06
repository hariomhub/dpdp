import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middleware/auth'
import { authLimiter, resetRequestLimiter } from '../../middleware/rate-limit'

const router = Router()

router.get('/verify-invite/:token', authController.verifyInvite)
// Credential endpoints: throttled per IP + email (failed attempts only), on top of the general API limit.
router.post('/set-password/:token', authLimiter, authController.setPassword)
router.post('/login', authLimiter, authController.login)
// Password reset. Requests always "succeed", so they are counted regardless of outcome (a separate limiter);
// the reset itself is throttled like any credential endpoint.
router.post('/forgot-password', resetRequestLimiter, authController.forgotPassword)
router.post('/reset-password', authLimiter, authController.resetPassword)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)
router.get('/me', authenticate, authController.getMe)

export default router
