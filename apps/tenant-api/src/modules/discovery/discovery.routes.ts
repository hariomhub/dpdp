import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { discoveryController } from './discovery.controller'

const router = Router()
router.use(authenticate)

router.post('/connections/:connectionId/scan', discoveryController.triggerDiscovery)
router.get('/drafts',                          discoveryController.listDrafts)
router.post('/drafts/:id/confirm',             discoveryController.confirmDraft)
router.post('/drafts/:id/dismiss',             discoveryController.dismissDraft)

export default router
