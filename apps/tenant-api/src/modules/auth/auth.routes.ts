import { Router } from 'express'
import { authController } from './auth.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.get('/verify-invite/:token', authController.verifyInvite)
router.post('/set-password/:token', authController.setPassword)
router.post('/login', authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authenticate, authController.logout)
router.get('/me', authenticate, authController.getMe)

export default router