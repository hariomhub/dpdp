import { getTenantPrisma } from '@dpdp/database'

/**
 * The organisation this deployment serves (TenantProfile, in the organisation's own database): its name,
 * classification, plan and onboarding status. Created when the instance is activated with a signed licence
 * (platform/activation.ts). Whether the portal may be used is the licence's business (platform/licence-gate.ts), not
 * a status flag.
 *
 * Every read of "who is this organisation" goes through here.
 */
export interface OrgSummary {
  id: string
  name: string
  tenantCode: string
  classification: string
  plan: string
  status: string
}

const db = () => getTenantPrisma()

export async function getOrgSummary(tenantId: string): Promise<OrgSummary | null> {
  return db().tenantProfile.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, tenantCode: true, classification: true, plan: true, status: true },
  })
}

export async function getOrgName(tenantId: string): Promise<string | null> {
  return (await db().tenantProfile.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ?? null
}

/** Organisations whose scheduled jobs should run (the daily snapshot): those that finished onboarding. */
export async function listActiveOrgs(): Promise<Array<{ id: string; name: string }>> {
  return db().tenantProfile.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true } })
}

/** The category (a Library id) the organisation holds under one regulation, if it has been classified explicitly. */
export async function getRegulationClassification(tenantId: string, regulationId: string): Promise<string | null> {
  const row = await db().tenantRegulationClassification.findUnique({
    where: { tenantId_regulationId: { tenantId, regulationId } }, select: { applicabilityCategoryId: true },
  })
  return row?.applicabilityCategoryId ?? null
}

/** Has any organisation been activated on this deployment? (false = a fresh install waiting for its licence) */
export async function isActivated(): Promise<boolean> {
  return (await db().tenantProfile.count()) > 0
}
