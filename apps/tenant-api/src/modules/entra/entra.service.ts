import axios from 'axios'
import { getTenantPrisma } from '@dpdp/database'
import { TenantRole, TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { generateTokens } from '../../utils/tokens'
import { encrypt, decrypt } from '../../utils/crypto'
import { config } from '../../config'
import { HttpError } from '../../utils/http-error'
import { invalidateUserAccess } from '../../utils/user-access'
import { deactivateWithinTransaction } from '../users/deactivation'
import { runDirectorySync, DirectoryMember } from './entra-sync'
import { PROTECTED_ROLES, isMappableRole } from './entra-sync-rules'
import { createLoginSession, openLoginSession } from './entra-state'

const db = getTenantPrisma()

// ─── Internal Microsoft Graph helpers ────────────────────────────────────────

interface EntraCreds {
  clientId: string
  clientSecret: string
  azureTenantId: string
}

async function getMsToken(creds: EntraCreds): Promise<string> {
  const url = `https://login.microsoftonline.com/${creds.azureTenantId}/oauth2/v2.0/token`
  const params = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await axios.post(url, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data.access_token
}

async function graphGet(token: string, endpoint: string) {
  const res = await axios.get(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Every user in one directory group (all pages). Direct members only, and only people (not nested groups or devices). */
async function fetchGroupMembers(token: string, groupId: string): Promise<DirectoryMember[]> {
  if (!GUID.test(groupId)) throw new Error('A mapped directory group has an invalid id. Re-save the group mappings.')
  const members: DirectoryMember[] = []
  let pageUrl: string | null = `/groups/${groupId}/members/microsoft.graph.user?$select=id,displayName,mail,userPrincipalName&$top=999`
  while (pageUrl) {
    const data = await graphGet(token, pageUrl)
    for (const m of data.value as any[]) {
      members.push({ id: m.id, email: m.mail || m.userPrincipalName || '', displayName: m.displayName })
    }
    // Graph returns an absolute @odata.nextLink; only its path and query are used (the host is fixed in graphGet).
    pageUrl = data['@odata.nextLink']
      ? new URL(data['@odata.nextLink']).pathname.replace(/^\/v1\.0/, '') + new URL(data['@odata.nextLink']).search
      : null
  }
  return members
}

/** Load and decrypt stored Entra credentials for a tenant. */
async function getStoredCreds(tenantId: string): Promise<EntraCreds> {
  const cfg = await db.entraConfig.findUnique({ where: { tenantId } })
  if (!cfg) throw new Error('Entra ID is not connected. Configure it in Settings first.')
  return {
    clientId: cfg.clientId,
    clientSecret: decrypt(cfg.clientSecretEncrypted),
    azureTenantId: cfg.azureTenantId,
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const entraService = {

  async getAuthUrl(tenantId?: string) {
    // One organisation per deployment: without an id, the single configuration is used.
    const cfg = tenantId
      ? await db.entraConfig.findUnique({ where: { tenantId } })
      : await db.entraConfig.findFirst()
    if (!cfg) throw new Error('Entra ID is not configured for this organization')

    // `state` is a signed, short-lived token for this attempt; the nonce goes to the browser only (see entra-state.ts).
    const session = createLoginSession(cfg.tenantId)
    const params = new URLSearchParams({
      client_id:             cfg.clientId,
      response_type:         'code',
      redirect_uri:          config.entra.redirectUri,
      scope:                 'openid profile email User.Read',
      state:                 session.state,
      response_mode:         'query',
      code_challenge:        session.codeChallenge,
      code_challenge_method: 'S256',
    })

    return {
      authUrl:  `https://login.microsoftonline.com/${cfg.azureTenantId}/oauth2/v2.0/authorize?${params.toString()}`,
      tenantId: cfg.tenantId,
      nonce:    session.nonce,
    }
  },

  // ── GET /entra/mappings ───────────────────────────────────────────────────
  async getMappings(tenantId: string) {
    const mappings = await db.entraGroupMapping.findMany({
      where: { tenantId },
      include: { department: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    })

    // Compute user count per mapping (Entra-sourced users matching role + dept)
    const withCounts = await Promise.all(
      mappings.map(async m => {
        const userCount = await db.user.count({
          where: {
            tenantId,
            role: m.role,
            status: 'ACTIVE',
            source: 'ENTRA_ID',
            ...(m.departmentId
              ? { departments: { some: { departmentId: m.departmentId } } }
              : {}),
          },
        })
        return {
          id: m.id,
          entraGroupId: m.entraGroupId,
          entraGroupName: m.entraGroupName,
          role: m.role,
          departmentId: m.departmentId ?? null,
          departmentName: m.department?.name ?? 'Org-wide',
          userCount,
        }
      })
    )
    return withCounts
  },

  // ── POST /entra/connect ───────────────────────────────────────────────────
  /**
   * Test the provided credentials against Microsoft Graph.
   * If valid, persist them (clientSecret encrypted at rest).
   */
  async connect(params: {
    tenantId: string
    tenantDomain: string
    clientId: string
    clientSecret: string
    azureTenantId: string
    userId: string
  }) {
    // 1. Validate credentials before storing
    try {
      const token = await getMsToken({
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        azureTenantId: params.azureTenantId,
      })
      // Verify we can read the org
      await graphGet(token, '/organization')
    } catch {
      throw new Error(
        'Failed to connect to Microsoft Entra ID. ' +
        'Check your Client ID, Client Secret, and Azure Tenant ID.'
      )
    }

    // 2. Persist (upsert — re-connecting overwrites old config)
    await db.entraConfig.upsert({
      where: { tenantId: params.tenantId },
      create: {
        tenantId: params.tenantId,
        tenantDomain: params.tenantDomain,
        clientId: params.clientId,
        clientSecretEncrypted: encrypt(params.clientSecret),
        azureTenantId: params.azureTenantId,
        isConnected: true,
        connectedById: params.userId,
      },
      update: {
        tenantDomain: params.tenantDomain,
        clientId: params.clientId,
        clientSecretEncrypted: encrypt(params.clientSecret),
        azureTenantId: params.azureTenantId,
        isConnected: true,
        connectedById: params.userId,
      },
    })

    await logTenantAction({
      tenantId: params.tenantId,
      userId: params.userId,
      action: TenantAuditAction.ENTRA_CONNECTED,
      targetType: 'entra',
      targetName: params.tenantDomain,
    })

    return {
      connected: true,
      tenantDomain: params.tenantDomain,
      message: 'Successfully connected to Microsoft Entra ID',
    }
  },

  // ── POST /entra/reconnect ─────────────────────────────────────────────────
  async reconnect(params: {
    tenantId: string
    tenantDomain: string
    clientId: string
    clientSecret: string
    azureTenantId: string
    userId: string
  }) {
    // 1. Validate credentials
    try {
      const token = await getMsToken({
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        azureTenantId: params.azureTenantId,
      })
      await graphGet(token, '/organization')
    } catch {
      throw new Error(
        'Failed to connect to Microsoft Entra ID. ' +
        'Check your Client ID, Client Secret, and Azure Tenant ID.'
      )
    }

    // 2. Persist
    await db.entraConfig.upsert({
      where: { tenantId: params.tenantId },
      create: {
        tenantId: params.tenantId,
        tenantDomain: params.tenantDomain,
        clientId: params.clientId,
        clientSecretEncrypted: encrypt(params.clientSecret),
        azureTenantId: params.azureTenantId,
        isConnected: true,
        connectedById: params.userId,
      },
      update: {
        tenantDomain: params.tenantDomain,
        clientId: params.clientId,
        clientSecretEncrypted: encrypt(params.clientSecret),
        azureTenantId: params.azureTenantId,
        isConnected: true,
        connectedById: params.userId,
      },
    })

    await logTenantAction({
      tenantId: params.tenantId,
      userId: params.userId,
      action: TenantAuditAction.ENTRA_RECONNECTED,
      targetType: 'entra',
      targetName: params.tenantDomain,
    })

    return {
      reconnected: true,
      message: 'Entra ID reconnected. Run a sync to reactivate users.',
    }
  },

  // ── GET /entra/status ─────────────────────────────────────────────────────
  async getStatus(tenantId: string) {
    const cfg = await db.entraConfig.findUnique({
      where: { tenantId },
      select: {
        tenantDomain: true,
        clientId: true,
        azureTenantId: true,
        isConnected: true,
        lastSyncAt: true,
        createdAt: true,
      },
    })
    return {
      connected: !!cfg?.isConnected,
      tenantDomain: cfg?.tenantDomain ?? null,
      lastSyncAt: cfg?.lastSyncAt ?? null,
      connectedAt: cfg?.createdAt ?? null,
    }
  },

  // ── GET /entra/groups ─────────────────────────────────────────────────────
  /** Fetches groups from the stored credentials — no credentials in the request. */
  async getGroups(tenantId: string) {
    const creds = await getStoredCreds(tenantId)
    const token = await getMsToken(creds)
    const data = await graphGet(
      token,
      '/groups?$select=id,displayName,description,mail&$top=100'
    )
    return (data.value as any[]).map(g => ({
      id: g.id,
      name: g.displayName,
      description: g.description ?? null,
      mail: g.mail ?? null,
    }))
  },

  // ── POST /entra/mappings ──────────────────────────────────────────────────
  async saveMappings(params: {
    tenantId: string
    mappings: Array<{
      entraGroupId: string
      entraGroupName: string
      role: TenantRole
      departmentId?: string
    }>
    userId: string
  }) {
    // A directory group may only grant roles that are safe to hand out automatically.
    for (const m of params.mappings) {
      if (!isMappableRole(m.role)) {
        throw HttpError.badRequest(
          `A directory group cannot be mapped to the ${m.role === 'CO' ? 'Compliance Officer' : m.role === 'CEO' ? 'CEO' : m.role} role. ` +
          'Invite those people by hand; groups can grant IT Admin, Internal Auditor and External Auditor.',
        )
      }
    }
    if (new Set(params.mappings.map(m => m.entraGroupId)).size !== params.mappings.length) {
      throw HttpError.badRequest('Each directory group can be mapped only once.')
    }
    const deptIds = [...new Set(params.mappings.map(m => m.departmentId).filter((d): d is string => !!d))]
    if (deptIds.length > 0 && (await db.department.count({ where: { tenantId: params.tenantId, id: { in: deptIds } } })) !== deptIds.length) {
      throw HttpError.badRequest('One or more departments were not found in your organization.')
    }

    // All or nothing, and a group that stays mapped keeps its id (users carry it as the group that manages them).
    const created = await db.$transaction(async tx => {
      await tx.entraGroupMapping.deleteMany({
        where: { tenantId: params.tenantId, entraGroupId: { notIn: params.mappings.map(m => m.entraGroupId) } },
      })
      const saved = []
      for (const m of params.mappings) {
        saved.push(await tx.entraGroupMapping.upsert({
          where: { tenantId_entraGroupId: { tenantId: params.tenantId, entraGroupId: m.entraGroupId } },
          update: { entraGroupName: m.entraGroupName, role: m.role, departmentId: m.departmentId ?? null },
          create: {
            tenantId: params.tenantId, entraGroupId: m.entraGroupId, entraGroupName: m.entraGroupName,
            role: m.role, departmentId: m.departmentId ?? null,
          },
        }))
      }
      return saved
    })

    await logTenantAction({
      tenantId: params.tenantId,
      userId: params.userId,
      action: TenantAuditAction.ENTRA_CONNECTED,
      targetType: 'entra_mappings',
      details: { mappingCount: created.length },
    })

    return created
  },

  // ── DELETE /entra/mappings/:id ────────────────────────────────────────────
  async removeGroupMapping(params: { mappingId: string; tenantId: string; userId: string }) {
    const mapping = await db.entraGroupMapping.findFirst({
      where: { id: params.mappingId, tenantId: params.tenantId },
    })
    if (!mapping) throw new Error('Group mapping not found')

    // Switch off the accounts this group manages - same rules as a sync: never CEO / Compliance Officer, the work they
    // were doing goes back to the pool, work in review stays.
    const users = await db.user.findMany({
      where: {
        tenantId: params.tenantId, syncedGroupId: params.mappingId, source: 'ENTRA_ID', status: 'ACTIVE',
        role: { notIn: [...PROTECTED_ROLES] as any },
      },
      select: { id: true },
    })
    let count = 0
    for (const u of users) {
      await db.$transaction(tx => deactivateWithinTransaction(tx as any, params.tenantId, u.id, 'ENTRA_SYNC', params.userId))
      invalidateUserAccess(u.id)
      count++
    }

    await db.entraGroupMapping.delete({ where: { id: params.mappingId } })

    await logTenantAction({
      tenantId: params.tenantId,
      userId: params.userId,
      action: TenantAuditAction.ENTRA_GROUP_REMOVED,
      targetType: 'entra_group_mapping',
      targetId: params.mappingId,
      targetName: mapping.entraGroupName,
      details: { role: mapping.role, deactivatedUsers: count },
    })

    return { removed: mapping.entraGroupName, deactivatedUsers: count }
  },

  // ── POST /entra/sync ──────────────────────────────────────────────────────
  /**
   * Pulls group members from Microsoft Graph and brings the portal's users in line, under the rules in
   * entra-sync-rules.ts (never touches CEO/CO, never re-enables what an administrator switched off, stops before an
   * unusually large removal). Uses the stored credentials - none in the request.
   */
  async syncUsers(params: { tenantId: string; userId: string; confirmRemovals?: boolean }) {
    const creds = await getStoredCreds(params.tenantId)
    const token = await getMsToken(creds)
    return runDirectorySync(
      { db, fetchMembers: (mapping) => fetchGroupMembers(token, mapping.entraGroupId) },
      params,
    )
  },

  // ── POST /entra/login ─────────────────────────────────────────────────────
  /**
   * OAuth2 Authorization Code flow with PKCE.
   * The browser is sent to Microsoft (see getAuthUrl), which redirects back with a `code`. This endpoint proves the
   * sign-in was started by this same browser (state + nonce), exchanges the code, identifies the person, and returns
   * our own session tokens.
   */
  async loginWithEntra(params: { code: string; state: string; nonce: string }) {
    const { tenantId, codeVerifier } = openLoginSession(params.state, params.nonce)
    const creds = await getStoredCreds(tenantId)

    // Exchange authorization code for MS token. The redirect address is the server's own setting - the one used when
    // the sign-in was started - never a value supplied by the browser.
    let msToken: string
    try {
      const tokenRes = await axios.post(
        `https://login.microsoftonline.com/${creds.azureTenantId}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          code: params.code,
          redirect_uri: config.entra.redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid profile email User.Read',
          code_verifier: codeVerifier,
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 20_000 },
      )
      msToken = tokenRes.data.access_token
    } catch (err: any) {
      // Detail (which can name the app registration) stays in the log; the person gets a plain message.
      console.error('[entra] token exchange failed:', err?.response?.data?.error_description ?? err?.message)
      throw HttpError.badRequest('Microsoft did not accept this sign-in. Please start again from the login page.')
    }

    // Get user profile from Microsoft
    const profile = await graphGet(msToken, '/me?$select=id,displayName,mail,userPrincipalName')
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase()
    if (!profile.id || !email) {
      throw new Error(
        'Could not retrieve email from Microsoft account. ' +
        'Ensure your Microsoft account has an email address.'
      )
    }

    // The Microsoft identity (object id) is the stable key. An e-mail address alone can be re-used or edited, so once an
    // account is linked to an identity, a different identity with the same e-mail is refused.
    let user = await db.user.findFirst({ where: { tenantId, entraObjectId: profile.id } })
    if (!user) {
      user = await db.user.findFirst({ where: { tenantId, email: { equals: email, mode: 'insensitive' } } })
      if (user?.entraObjectId && user.entraObjectId !== profile.id) {
        throw new Error('This account is linked to a different Microsoft identity. Contact your Compliance Officer.')
      }
    }
    if (!user || user.status !== 'ACTIVE') {
      throw new Error(
        'No account found for this Microsoft user. ' +
        'Contact your Compliance Officer to get invited first.'
      )
    }

    // Link the identity on first SSO login. `source` (who manages the account) is NOT changed by signing in - only a
    // directory sync decides that.
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), ...(user.entraObjectId ? {} : { entraObjectId: profile.id }) },
    })

    await logTenantAction({
      tenantId,
      userId: user.id,
      role: user.role,
      action: TenantAuditAction.USER_LOGIN,
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      details: { method: 'entra' },
    })

    const tokens = generateTokens({
      userId: user.id,
      tenantId,
      role: user.role,
    })

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId,
      },
    }
  },

  // ── DELETE /entra/disconnect ──────────────────────────────────────────────
  async disconnect(tenantId: string, userId: string) {
    // Directory-managed accounts have no other way in, so they are switched off - but never the people who run the
    // organisation (CEO / Compliance Officer), who would otherwise be locked out by a settings change. The same rules
    // as a sync apply: the work they were doing goes back to the pool, work in review stays.
    const users = await db.user.findMany({
      where: { tenantId, source: 'ENTRA_ID', status: 'ACTIVE', role: { notIn: [...PROTECTED_ROLES] as any } },
      select: { id: true },
    })
    let count = 0
    for (const u of users) {
      await db.$transaction(tx => deactivateWithinTransaction(tx as any, tenantId, u.id, 'ENTRA_SYNC', userId))
      invalidateUserAccess(u.id)
      count++
    }

    await db.$transaction([
      db.entraGroupMapping.deleteMany({ where: { tenantId } }),
      db.entraConfig.deleteMany({ where: { tenantId } }),
    ])

    await logTenantAction({
      tenantId,
      userId,
      action: TenantAuditAction.ENTRA_DISCONNECTED,
      targetType: 'entra',
      details: { deactivatedUsers: count },
    })

    return { message: 'Entra ID disconnected and credentials removed', deactivatedUsers: count }
  },
}
