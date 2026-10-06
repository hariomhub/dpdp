import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { CLOUD_OPERATOR_ROLES } from '../../utils/roles'
import { cloudConnectionsController } from './cloud-connections.controller'

const router = Router()
router.use(authenticate)

// Connecting a cloud environment stores credentials for it, so only the people who run that (IT Admin, CO, CEO) may
// create, re-test or remove a connection. Listing stays open (no credentials are ever returned).
const canManage = requireRole(...CLOUD_OPERATOR_ROLES)

router.get('/providers',      cloudConnectionsController.listProviders)
router.get('/',                cloudConnectionsController.listConnections)
router.post('/',               canManage, cloudConnectionsController.createConnection)
router.post('/:id/retest',     canManage, cloudConnectionsController.retestConnection)
router.delete('/:id',          canManage, cloudConnectionsController.disconnectConnection)

export default router
