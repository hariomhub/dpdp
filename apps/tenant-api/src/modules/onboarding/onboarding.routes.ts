import { Router } from 'express'
import { onboardingController } from './onboarding.controller'
import { authenticate, requireRole } from '../../middleware/auth'
import { ORG_SETUP_ROLES } from '../../utils/roles'

const router = Router()

// All onboarding routes require a valid JWT (tenant + userId in token)
router.use(authenticate)

// Changing the organisation's details, classification (which drives applicability), structure or team is an
// administrative act: CEO / CO only. Reading progress stays open to any signed-in user (it restores page state).
const canSetup = requireRole(...ORG_SETUP_ROLES)

// Step 1 — progress check (called on each page load to restore state)
router.get('/status', onboardingController.getStatus)

// Step 1 — Organization Details
router.patch('/org-details', canSetup, onboardingController.saveOrgDetails)

// Step 2 — Regulatory Classification
router.patch('/classification', canSetup, onboardingController.saveClassification)

// Step 3 — Organization Structure (departments, assets, suppliers)
// POST because it replaces the full structure on each save. Refused once onboarding is complete (see the service).
router.post('/structure', canSetup, onboardingController.saveStructure)

// Step 4 — Invite Team Members
router.post('/invite', canSetup, onboardingController.inviteTeamMembers)

// Step 5 — Complete Onboarding
router.post('/complete', canSetup, onboardingController.complete)

export default router
