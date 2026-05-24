import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { usersController } from './users.controller'

const router = Router()
router.use(authenticate)

// Read — any authenticated user can see the team
router.get('/',            usersController.listUsers)
router.get('/invitations', usersController.listInvitations)

// Write — CEO and CO only
const canManage = requireRole('CEO', 'CO')
router.post(  '/invite',                canManage, usersController.inviteUser)
router.post(  '/invitations/:id/resend',canManage, usersController.resendInvitation)
router.delete('/invitations/:id',       canManage, usersController.cancelInvitation)
router.patch( '/:id/role',              canManage, usersController.updateUserRole)
router.patch( '/:id/deactivate',        canManage, usersController.deactivateUser)
router.patch( '/:id/reactivate',        canManage, usersController.reactivateUser)
router.patch( '/:id/departments',       canManage, usersController.updateUserDepartments)

export default router