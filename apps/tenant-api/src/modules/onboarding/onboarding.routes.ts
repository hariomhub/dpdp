import { Router } from 'express'
import { onboardingController } from './onboarding.controller'
import { authenticate } from '../../middleware/auth'

const router = Router()

// All onboarding routes require a valid JWT (tenant + userId in token)
router.use(authenticate)

// Step 1 — progress check (called on each page load to restore state)
router.get('/status', onboardingController.getStatus)

// Step 1 — Organization Details
router.patch('/org-details', onboardingController.saveOrgDetails)

// Step 2 — Regulatory Classification
router.patch('/classification', onboardingController.saveClassification)

// Step 3 — Organization Structure (departments, assets, suppliers)
// POST because it replaces the full structure on each save
router.post('/structure', onboardingController.saveStructure)

// Step 4 — Invite Team Members
router.post('/invite', onboardingController.inviteTeamMembers)

// Step 5 — Complete Onboarding
router.post('/complete', onboardingController.complete)

export default router