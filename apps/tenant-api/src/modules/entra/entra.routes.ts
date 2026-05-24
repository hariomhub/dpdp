import { Router } from 'express'
import { entraController, entraLoginHandler } from './entra.controller'
import { authenticate, requireRole } from '../../middleware/auth'

const router = Router()

// ── Public (no JWT) ───────────────────────────────────────────────────────────
// Called after Microsoft OAuth redirect — user is not yet logged in
router.get('/auth-url', entraController.getAuthUrl)
router.post('/login', entraLoginHandler)

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate)

// Status is readable by any authenticated tenant user
router.get('/status',   entraController.getStatus)
router.get('/mappings', entraController.getMappings)

// All other Entra management is restricted to CEO and CO
router.use(requireRole('CEO', 'CO'))

router.post('/connect',    entraController.connect)
router.post('/reconnect',  entraController.reconnect)
router.get('/groups',      entraController.getGroups)     // reads stored creds — no params needed
router.post('/mappings',   entraController.saveMappings)
router.delete('/mappings/:id', entraController.removeGroupMapping)
router.post('/sync',       entraController.syncUsers)     // reads stored creds — no params needed
router.delete('/disconnect', entraController.disconnect)

export default router