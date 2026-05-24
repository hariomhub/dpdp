import axios from 'axios'
import { getTenantPrisma } from '@dpdp/database'
import { TenantRole, TenantAuditAction } from '@prisma/tenant-client'
import { logTenantAction } from '../../utils/audit-logger'
import { generateTokens } from '../../utils/tokens'
import { encrypt, decrypt } from '../../utils/crypto'
import { config } from '../../config'

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
    let cfg: any
    if (tenantId) {
      cfg = await db.entraConfig.findUnique({ where: { tenantId } })
    } else {
      // Single-tenant deployment — only one config exists
      cfg = await db.entraConfig.findFirst()
    }
    if (!cfg) throw new Error('Entra ID is not configured for this organization')
 
    const redirectUri = config.entra.redirectUri
    const params = new URLSearchParams({
      client_id:     cfg.clientId,
      response_type: 'code',
      redirect_uri:  redirectUri,
      scope:         'openid profile email User.Read',
      state:         cfg.tenantId,   // echoed back in callback, used to identify tenant
      response_mode: 'query',
    })
 
    return {
      authUrl:  `https://login.microsoftonline.com/${cfg.azureTenantId}/oauth2/v2.0/authorize?${params.toString()}`,
      tenantId: cfg.tenantId,
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
    // Replace strategy — delete all then recreate
    await db.entraGroupMapping.deleteMany({ where: { tenantId: params.tenantId } })

    const created = await Promise.all(
      params.mappings.map(m =>
        db.entraGroupMapping.create({
          data: {
            tenantId: params.tenantId,
            entraGroupId: m.entraGroupId,
            entraGroupName: m.entraGroupName,
            role: m.role,
            departmentId: m.departmentId ?? null,
          },
        })
      )
    )

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

    // Deactivate users synced from this group
    const { count } = await db.user.updateMany({
      where: {
        tenantId: params.tenantId,
        syncedGroupId: params.mappingId,
        source: 'ENTRA_ID',
        status: 'ACTIVE',
      },
      data: { status: 'INACTIVE' },
    })

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
   * Pulls group members from Microsoft Graph and upserts them as Users
   * in the tenant DB. Uses stored credentials — no creds in request body.
   */
  async syncUsers(params: { tenantId: string; userId: string }) {
    const creds = await getStoredCreds(params.tenantId)
    const token = await getMsToken(creds)
    const mappings = await db.entraGroupMapping.findMany({
      where: { tenantId: params.tenantId },
    })

    if (mappings.length === 0) {
      throw new Error('No group mappings configured. Set up group mappings first.')
    }

    let synced = 0, created = 0, updated = 0
    const activeEntraObjectIds = new Set<string>()

    for (const mapping of mappings) {
      let pageUrl: string | null =
        `/groups/${mapping.entraGroupId}/members?$select=id,displayName,mail,userPrincipalName`

      // Handle pagination (Graph returns max 100 members per page)
      while (pageUrl) {
        const data = await graphGet(token, pageUrl)

        for (const member of data.value as any[]) {
          const email = (member.mail || member.userPrincipalName || '').toLowerCase()
          if (!email) continue

          const existing = await db.user.findFirst({
            where: { tenantId: params.tenantId, email: email },
          })

          if (existing) {
            const isClaimedByThisMapping = existing.syncedGroupId === mapping.id || existing.syncedGroupId === null

            await db.user.update({
              where: { id: existing.id },
              data: { 
                entraObjectId: member.id, 
                source: 'ENTRA_ID', 
                status: 'ACTIVE',
                syncedGroupId: existing.syncedGroupId ?? mapping.id,
                ...(isClaimedByThisMapping ? { role: mapping.role as any } : {})
              },
            })

            if (isClaimedByThisMapping) {
              // Clean up old department primary designations
              if (existing.role === 'IT_ADMIN') {
                await db.department.updateMany({
                  where: { tenantId: params.tenantId, assignedItAdminId: existing.id },
                  data: { assignedItAdminId: null }
                })
              }
              if (existing.role === 'INTERNAL_AUDITOR') {
                await db.department.updateMany({
                  where: { tenantId: params.tenantId, assignedAuditorId: existing.id },
                  data: { assignedAuditorId: null }
                })
              }

              // Replace department memberships
              await db.departmentUser.deleteMany({ where: { userId: existing.id } })
              
              if (mapping.departmentId) {
                await db.departmentUser.create({
                  data: { userId: existing.id, departmentId: mapping.departmentId },
                })

                if (mapping.role === 'IT_ADMIN') {
                  await db.department.updateMany({
                    where: { id: mapping.departmentId, assignedItAdminId: null },
                    data: { assignedItAdminId: existing.id },
                  })
                }
                if (mapping.role === 'INTERNAL_AUDITOR') {
                  await db.department.updateMany({
                    where: { id: mapping.departmentId, assignedAuditorId: null },
                    data: { assignedAuditorId: existing.id },
                  })
                }
              }
            }

            updated++
          } else {
            const newUser = await db.user.create({
              data: {
                tenantId: params.tenantId,
                name: member.displayName || email.split('@')[0],
                email: email,
                entraObjectId: member.id,
                role: mapping.role,
                status: 'ACTIVE',
                source: 'ENTRA_ID',
                syncedGroupId: mapping.id,
                joinedAt: new Date(),
              },
            })
            if (mapping.departmentId) {
              await db.departmentUser.create({
                data: { userId: newUser.id, departmentId: mapping.departmentId },
              })

              if (mapping.role === 'IT_ADMIN') {
                await db.department.updateMany({
                  where: { id: mapping.departmentId, assignedItAdminId: null },
                  data: { assignedItAdminId: newUser.id },
                })
              }
              if (mapping.role === 'INTERNAL_AUDITOR') {
                await db.department.updateMany({
                  where: { id: mapping.departmentId, assignedAuditorId: null },
                  data: { assignedAuditorId: newUser.id },
                })
              }
            }
            created++
          }
          if (member.id) activeEntraObjectIds.add(member.id)
          synced++
        }

        // Follow nextLink if present
        pageUrl = data['@odata.nextLink']
          ? new URL(data['@odata.nextLink']).pathname + new URL(data['@odata.nextLink']).search
          : null
      }
    }

    // Deactivate users who are no longer in any mapped Entra group
    const entraUsers = await db.user.findMany({
      where: { tenantId: params.tenantId, source: 'ENTRA_ID', status: 'ACTIVE' },
    })
    
    let deactivated = 0
    for (const u of entraUsers) {
      if (u.entraObjectId && !activeEntraObjectIds.has(u.entraObjectId)) {
        await db.user.update({
          where: { id: u.id },
          data: { status: 'INACTIVE' }
        })
        deactivated++
      }
    }

    // Update lastSyncAt
    await db.entraConfig.update({
      where: { tenantId: params.tenantId },
      data: { lastSyncAt: new Date() },
    })

    await logTenantAction({
      tenantId: params.tenantId,
      userId: params.userId,
      action: TenantAuditAction.ENTRA_CONNECTED,
      targetType: 'entra_sync',
      details: { synced, created, updated, deactivated },
    })

    return { synced, created, updated, deactivated }
  },

  // ── POST /entra/login ─────────────────────────────────────────────────────
  /**
   * OAuth2 Authorization Code flow.
   * The frontend redirects the user to Microsoft, which redirects back with a `code`.
   * This endpoint exchanges that code for tokens, identifies the user, and returns
   * our own JWT pair.
   */
  async loginWithEntra(params: {
    code: string
    tenantId: string
    redirectUri: string
  }) {
    const creds = await getStoredCreds(params.tenantId)

    // Exchange authorization code for MS token
    const url = `https://login.microsoftonline.com/${creds.azureTenantId}/oauth2/v2.0/token`
    const tokenParams = new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code: params.code,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid profile email User.Read',
    })

    const tokenRes = await axios.post(url, tokenParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const msToken = tokenRes.data.access_token

    // Get user profile from Microsoft
    const profile = await graphGet(msToken, '/me?$select=id,displayName,mail,userPrincipalName')
    const email = (profile.mail || profile.userPrincipalName || '').toLowerCase()
    
    if (!email) {
      throw new Error(
        'Could not retrieve email from Microsoft account. ' +
        'Ensure your Microsoft account has an email address.'
      )
    }

    // Find matching active user in tenant DB
    const user = await db.user.findFirst({
      where: { tenantId: params.tenantId, email, status: 'ACTIVE' },
    })
    if (!user) {
      throw new Error(
        'No account found for this Microsoft user. ' +
        'Contact your Compliance Officer to get invited first.'
      )
    }

    // Sync entraObjectId on first SSO login
    if (!user.entraObjectId) {
      await db.user.update({
        where: { id: user.id },
        data: { entraObjectId: profile.id, source: 'ENTRA_ID', lastLoginAt: new Date() },
      })
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
    }

    await logTenantAction({
      tenantId: params.tenantId,
      userId: user.id,
      role: user.role,
      action: TenantAuditAction.USER_LOGIN,
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
    })

    const tokens = generateTokens({
      userId: user.id,
      tenantId: params.tenantId,
      role: user.role,
    })

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: params.tenantId,
      },
    }
  },

  // ── DELETE /entra/disconnect ──────────────────────────────────────────────
  async disconnect(tenantId: string, userId: string) {
    const { count } = await db.user.updateMany({
      where: { tenantId, source: 'ENTRA_ID', status: 'ACTIVE' },
      data: { status: 'INACTIVE' },
    })

    await Promise.all([
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
