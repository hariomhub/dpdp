import { Router } from 'express'
import { login, logout, refreshToken, getMe } from './auth.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

router.post('/login', login)
router.post('/refresh', refreshToken)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)

export default router