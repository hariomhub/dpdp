import { NextFunction, Response, Router } from 'express'
import { z } from 'zod'
import { AuthRequest, authenticate, requireRole } from '../../middleware/auth'
import { authLimiter } from '../../middleware/rate-limit'
import { HttpError } from '../../utils/http-error'
import { config } from '../../config'
import { installLicence } from '../../platform/activation'
import { getLicenceView } from '../../platform/licence-store'
import { isActivated } from '../../platform/tenant-profile'

const router = Router()

const licenceBody = z.object({ licence: z.string().trim().min(20, 'Paste the licence you were given').max(20_000) })

const publicView = (v: Awaited<ReturnType<typeof getLicenceView>>) => ({
  state: v.state, reason: v.reason ?? null, mode: v.mode,
  validUntil: v.validUntil ?? null, graceUntil: v.graceUntil ?? null, daysLeft: v.daysLeft ?? null,
  plan: v.plan ?? null, limits: v.limits ?? null,
})

// ── Public ───────────────────────────────────────────────────────────────────
// Is this a fresh install waiting for its licence? The login page uses it to send a first-time installer to /activate.
router.get('/status', async (_req, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: { activated: await isActivated(), licenceMode: config.licence.mode } })
  } catch (err) { next(err) }
})

// First activation of a fresh deployment. Needs a valid licence from the vendor; refused once the deployment has an
// organisation (renewals go through POST /licence, signed in).
router.post('/activate', authLimiter, async (req, res: Response, next: NextFunction) => {
  try {
    const { licence } = licenceBody.parse(req.body ?? {})
    if (await isActivated()) throw HttpError.conflict('This deployment is already activated. Sign in and renew the licence from Settings.')
    const result = await installLicence(licence, { allowFirstActivation: true })
    res.status(201).json({ success: true, data: result })
  } catch (err) { next(err) }
})

// ── Signed in ────────────────────────────────────────────────────────────────
router.get('/licence', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: publicView(await getLicenceView(req.tenantId!)) })
  } catch (err) { next(err) }
})

// Renewal. Works while the portal is read-only (it is how it stops being read-only).
router.post('/licence', authenticate, requireRole('CEO', 'CO'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { licence } = licenceBody.parse(req.body ?? {})
    const result = await installLicence(licence, { allowFirstActivation: false, expectTenantId: req.tenantId!, actorId: req.userId })
    res.json({ success: true, data: { ...result, licence: publicView(await getLicenceView(req.tenantId!)) }, message: 'Licence installed' })
  } catch (err) { next(err) }
})

export default router
