import fs from 'fs'
import { config } from '../config'
import { installLicence } from './activation'

/**
 * Installing the licence from configuration: a deployment pipeline (Azure Container Apps secret, Compose env/secret
 * file) hands the licence over as LICENCE_TOKEN or LICENCE_FILE, and the instance installs it at start-up. Safe on every
 * start: the same licence again changes nothing, and a newer one replaces an older one (that is how a renewal that is
 * delivered through the pipeline takes effect). A problem is logged and never stops the portal from starting.
 */
export async function activateFromConfiguration(log: (msg: string) => void = console.log): Promise<void> {
  let token = config.licence.token
  if (!token && config.licence.tokenFile) {
    try { token = fs.readFileSync(config.licence.tokenFile, 'utf8') } catch (err: any) { log(`[licence] cannot read LICENCE_FILE: ${err?.message}`); return }
  }
  if (!token.trim()) return

  try {
    const r = await installLicence(token, { allowFirstActivation: true })
    log(r.firstActivation
      ? `[licence] activated ${r.organization.name}${r.ceoInvite ? ` - CEO invitation: ${r.ceoInvite.url}` : ''}`
      : `[licence] licence for ${r.organization.name} is in place (${r.licence.state})`)
  } catch (err: any) {
    log(`[licence] the configured licence was not applied: ${err?.message ?? err}`)
  }
}
