import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { CLOUD_OPERATOR_ROLES } from '../../utils/roles'
import { discoveryController } from './discovery.controller'

const router = Router()
router.use(authenticate)

// Per the product spec, IT Admin / CO trigger scans and review (confirm or dismiss) the draft assets; confirming a draft
// writes to the live asset register, so it is not open to every role.
const canOperate = requireRole(...CLOUD_OPERATOR_ROLES)

router.post('/connections/:connectionId/scan', canOperate, discoveryController.triggerDiscovery)
router.get('/drafts',                          discoveryController.listDrafts)
router.post('/drafts/:id/confirm',             canOperate, discoveryController.confirmDraft)
router.post('/drafts/:id/dismiss',             canOperate, discoveryController.dismissDraft)

export default router
