import { Router } from 'express'
import { authenticate } from '../../middleware/auth'
import { filesController } from './files.controller'

const router = Router()

// Step 1 (authenticated): ask for a short-lived link to one file. Authorisation + audit happen here.
router.post('/evidence/:id/link',        authenticate, filesController.evidenceLink)
router.post('/gap-files/:id/link',       authenticate, filesController.gapFileLink)
router.post('/master-evidence/:id/link', authenticate, filesController.masterEvidenceLink)

// Step 2: redeem the link. No Authorization header - the signed, 60-second token IS the credential, which is
// what lets a plain browser tab or download work. It is re-authorised against the database on every use.
router.get('/dl/:token', filesController.download)

export default router
