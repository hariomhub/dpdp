import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { cloudConnectionsController } from './cloud-connections.controller'

const router = Router()
router.use(authenticate)

router.get('/providers',      cloudConnectionsController.listProviders)
router.get('/',                cloudConnectionsController.listConnections)
router.post('/',               cloudConnectionsController.createConnection)
router.post('/:id/retest',     cloudConnectionsController.retestConnection)
router.delete('/:id',          cloudConnectionsController.disconnectConnection)

export default router
