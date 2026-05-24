import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../../middleware/auth'
import { usersService } from './users.service'
import { TenantRole } from '@prisma/tenant-client'

const inviteSchema = z.object({
  email:         z.string().email('Invalid email address'),
  role:          z.nativeEnum(TenantRole),
  departmentIds: z.array(z.string().uuid()).optional().default([]),
  note:          z.string().max(500).optional(),
})

const roleUpdateSchema = z.object({
  role: z.nativeEnum(TenantRole),
})

const departmentsSchema = z.object({
  departmentIds: z.array(z.string().uuid()),
})

export const usersController = {

  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const users = await usersService.listUsers(req.tenantId!)
      res.json({ success: true, data: users })
    } catch (err) { next(err) }
  },

  async listInvitations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const invitations = await usersService.listInvitations(req.tenantId!)
      res.json({ success: true, data: invitations })
    } catch (err) { next(err) }
  },

  async inviteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const body   = inviteSchema.parse(req.body)
      const result = await usersService.inviteUser({
        tenantId:      req.tenantId!,
        actorId:       req.userId!,
        email:         body.email,
        role:          body.role,
        departmentIds: body.departmentIds,
        note:          body.note,
      })
      res.status(201).json({ success: true, data: result, message: 'Invitation sent' })
    } catch (err) { next(err) }
  },

  async resendInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await usersService.resendInvitation({
        tenantId:     req.tenantId!,
        actorId:      req.userId!,
        invitationId: req.params.id,
      })
      res.json({ success: true, data: result, message: 'Invitation resent' })
    } catch (err) { next(err) }
  },

  async cancelInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await usersService.cancelInvitation({
        tenantId:     req.tenantId!,
        actorId:      req.userId!,
        invitationId: req.params.id,
      })
      res.json({ success: true, message: 'Invitation cancelled' })
    } catch (err) { next(err) }
  },

  async updateUserRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role } = roleUpdateSchema.parse(req.body)
      const result   = await usersService.updateUserRole({
        tenantId:     req.tenantId!,
        actorId:      req.userId!,
        targetUserId: req.params.id,
        newRole:      role,
      })
      res.json({ success: true, data: result, message: 'Role updated' })
    } catch (err) { next(err) }
  },

  async deactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await usersService.deactivateUser({
        tenantId:     req.tenantId!,
        actorId:      req.userId!,
        targetUserId: req.params.id,
      })
      res.json({ success: true, message: 'User deactivated and tasks unassigned' })
    } catch (err) { next(err) }
  },

  async reactivateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await usersService.reactivateUser({
        tenantId:     req.tenantId!,
        actorId:      req.userId!,
        targetUserId: req.params.id,
      })
      res.json({ success: true, message: 'User reactivated' })
    } catch (err) { next(err) }
  },

  async updateUserDepartments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { departmentIds } = departmentsSchema.parse(req.body)
      const result = await usersService.updateUserDepartments({
        tenantId:      req.tenantId!,
        actorId:       req.userId!,
        targetUserId:  req.params.id,
        departmentIds,
      })
      res.json({ success: true, data: result, message: 'Departments updated' })
    } catch (err) { next(err) }
  },
}