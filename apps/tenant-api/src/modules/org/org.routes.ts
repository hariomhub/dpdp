import { Router } from 'express'
import { authenticate, requireRole } from '../../middleware/auth'
import { orgController } from './org.controller'

const router = Router()

// All org routes require authentication
router.use(authenticate)

// Write operations require CEO or CO
const canWrite = requireRole('CEO', 'CO')

// ── Departments ───────────────────────────────────────────────────────────────
router.get(   '/departments',         orgController.listDepartments)
router.post(  '/departments',         canWrite, orgController.createDepartment)
router.patch( '/departments/:id',     canWrite, orgController.updateDepartment)
router.delete('/departments/:id',     canWrite, orgController.deleteDepartment)

// ── Own Assets ────────────────────────────────────────────────────────────────
router.post(  '/departments/:deptId/assets', canWrite, orgController.createAsset)
router.patch( '/assets/:id',                 canWrite, orgController.updateAsset)
router.delete('/assets/:id',                 canWrite, orgController.deleteAsset)

// ── PII Records ───────────────────────────────────────────────────────────────
router.get(   '/assets/:assetId/pii-records', orgController.listPiiRecords)
router.post(  '/assets/:assetId/pii-records', canWrite, orgController.createPiiRecord)
router.patch( '/pii-records/:id',             canWrite, orgController.updatePiiRecord)
router.delete('/pii-records/:id',             canWrite, orgController.deletePiiRecord)

// ── Suppliers ─────────────────────────────────────────────────────────────────
router.post(  '/departments/:deptId/suppliers', canWrite, orgController.createSupplier)
router.patch( '/suppliers/:id',                 canWrite, orgController.updateSupplier)
router.delete('/suppliers/:id',                 canWrite, orgController.deleteSupplier)

// ── Supplier Assets ───────────────────────────────────────────────────────────
router.post(  '/suppliers/:supplierId/assets', canWrite, orgController.createSupplierAsset)
router.delete('/supplier-assets/:id',          canWrite, orgController.deleteSupplierAsset)

export default router
