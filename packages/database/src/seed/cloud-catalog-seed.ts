/**
 * Seeds the Cloud Provider Registry and the initial Generic Asset Catalog.
 *
 * Provider list and keys match Prowler's own provider directory exactly
 * (verified against prowler/providers/* in the prowler-cloud/prowler repo).
 * Credential schemas for the 16 providers Prowler's own hosted API exposes
 * are copied verbatim from that API's serializer_utils/providers.py — not
 * guessed. The remaining 7 providers Prowler's CLI engine supports but its
 * hosted API does not yet expose (e2enetworks, huaweicloud, linode, llm,
 * nhn, scaleway, stackit) are seeded inactive with an empty credential
 * schema — their real required fields haven't been verified yet, so they
 * are deliberately left as a known gap rather than guessed.
 *
 * Generic Asset Catalog seeding is intentionally conservative: only entries
 * for exact `cloudResourceType` strings actually confirmed from Prowler's
 * check metadata are included (Azure's 6 confirmed types, AWS's 1 confirmed
 * type). This catalog is meant to grow as real scans surface unmapped
 * resource types — seeding guessed resource-type strings would silently
 * produce mappings that never match anything.
 */

import { getSuperAdminPrisma } from '../index'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const db = getSuperAdminPrisma()

type ProviderSeed = {
  key: string
  displayName: string
  category:
    | 'CLOUD_INFRASTRUCTURE'
    | 'IDENTITY_SAAS'
    | 'DEVOPS_SOURCE'
    | 'DATABASE_SERVICE'
    | 'EDGE_PLATFORM'
    | 'CONTAINER_ORCHESTRATION'
    | 'EMERGING'
  isActive: boolean
  credentialSchema: object
}

// ─── Credential schemas verified verbatim from Prowler's own
//     api/src/backend/api/v1/serializer_utils/providers.py ────────────────

const AWS_SCHEMA = {
  oneOf: [
    {
      title: 'AWS Static Credentials',
      properties: {
        aws_access_key_id: { type: 'string' },
        aws_secret_access_key: { type: 'string' },
        aws_session_token: { type: 'string' },
      },
      required: ['aws_access_key_id', 'aws_secret_access_key'],
    },
    {
      title: 'AWS Assume Role',
      properties: {
        role_arn: { type: 'string' },
        external_id: { type: 'string' },
        aws_access_key_id: { type: 'string' },
        aws_secret_access_key: { type: 'string' },
        aws_session_token: { type: 'string' },
        session_duration: { type: 'integer', minimum: 900, maximum: 43200, default: 3600 },
        role_session_name: { type: 'string' },
      },
      required: ['role_arn', 'external_id'],
    },
  ],
}

const AZURE_SCHEMA = {
  title: 'Azure Static Credentials',
  properties: {
    client_id: { type: 'string' },
    client_secret: { type: 'string' },
    tenant_id: { type: 'string' },
  },
  required: ['client_id', 'client_secret', 'tenant_id'],
}

const GCP_SCHEMA = {
  oneOf: [
    {
      title: 'GCP Static Credentials',
      properties: {
        client_id: { type: 'string' },
        client_secret: { type: 'string' },
        refresh_token: { type: 'string' },
      },
      required: ['client_id', 'client_secret', 'refresh_token'],
    },
    {
      title: 'GCP Service Account Key',
      properties: { service_account_key: { type: 'object' } },
      required: ['service_account_key'],
    },
  ],
}

const M365_SCHEMA = {
  oneOf: [
    {
      title: 'M365 Static Credentials',
      properties: {
        client_id: { type: 'string' },
        tenant_id: { type: 'string' },
        client_secret: { type: 'string' },
        user: { type: 'email', deprecated: true },
        password: { type: 'string', deprecated: true },
      },
      required: ['client_id', 'client_secret', 'tenant_id', 'user', 'password'],
    },
    {
      title: 'M365 Certificate Credentials',
      properties: {
        client_id: { type: 'string' },
        tenant_id: { type: 'string' },
        certificate_content: { type: 'string' },
      },
      required: ['client_id', 'tenant_id', 'certificate_content'],
    },
  ],
}

const GOOGLE_WORKSPACE_SCHEMA = {
  title: 'Google Workspace Service Account',
  properties: {
    credentials_content: { type: 'string' },
    delegated_user: { type: 'string', format: 'email' },
  },
  required: ['credentials_content', 'delegated_user'],
}

const KUBERNETES_SCHEMA = {
  title: 'Kubernetes Static Credentials',
  properties: { kubeconfig_content: { type: 'string' } },
  required: ['kubeconfig_content'],
}

const GITHUB_SCHEMA = {
  oneOf: [
    { title: 'GitHub Personal Access Token', properties: { personal_access_token: { type: 'string' } }, required: ['personal_access_token'] },
    { title: 'GitHub OAuth App Token', properties: { oauth_app_token: { type: 'string' } }, required: ['oauth_app_token'] },
    { title: 'GitHub App Credentials', properties: { github_app_id: { type: 'integer' }, github_app_key: { type: 'string' } }, required: ['github_app_id', 'github_app_key'] },
  ],
}

const IAC_SCHEMA = {
  title: 'IaC Repository Credentials',
  properties: { repository_url: { type: 'string' }, access_token: { type: 'string' } },
  required: ['repository_url'],
}

const ORACLECLOUD_SCHEMA = {
  title: 'Oracle Cloud Infrastructure (OCI) API Key Credentials',
  properties: {
    user: { type: 'string' },
    fingerprint: { type: 'string' },
    key_file: { type: 'string' },
    key_content: { type: 'string' },
    tenancy: { type: 'string' },
    pass_phrase: { type: 'string' },
  },
  required: ['user', 'fingerprint', 'tenancy'],
  anyOf: [{ required: ['key_file'] }, { required: ['key_content'] }],
}

const MONGODBATLAS_SCHEMA = {
  title: 'MongoDB Atlas API Key',
  properties: { atlas_public_key: { type: 'string' }, atlas_private_key: { type: 'string' } },
  required: ['atlas_public_key', 'atlas_private_key'],
}

const ALIBABACLOUD_SCHEMA = {
  oneOf: [
    { title: 'Alibaba Cloud Static Credentials', properties: { access_key_id: { type: 'string' }, access_key_secret: { type: 'string' }, security_token: { type: 'string' } }, required: ['access_key_id', 'access_key_secret'] },
    { title: 'Alibaba Cloud RAM Role Assumption', properties: { role_arn: { type: 'string' }, access_key_id: { type: 'string' }, access_key_secret: { type: 'string' }, role_session_name: { type: 'string' } }, required: ['role_arn', 'access_key_id', 'access_key_secret'] },
  ],
}

const CLOUDFLARE_SCHEMA = {
  oneOf: [
    { title: 'Cloudflare API Token', properties: { api_token: { type: 'string' } }, required: ['api_token'] },
    { title: 'Cloudflare API Key + Email', properties: { api_key: { type: 'string' }, api_email: { type: 'string', format: 'email' } }, required: ['api_key', 'api_email'] },
  ],
}

const OPENSTACK_SCHEMA = {
  title: 'OpenStack clouds.yaml Credentials',
  properties: { clouds_yaml_content: { type: 'string' }, clouds_yaml_cloud: { type: 'string' } },
  required: ['clouds_yaml_content', 'clouds_yaml_cloud'],
}

const OKTA_SCHEMA = {
  title: 'Okta OAuth Credentials',
  properties: {
    okta_client_id: { type: 'string' },
    okta_private_key: { type: 'string' },
    okta_scopes: { type: 'array', items: { type: 'string' } },
  },
  required: ['okta_client_id', 'okta_private_key'],
}

const VERCEL_SCHEMA = {
  title: 'Vercel API Token',
  properties: { api_token: { type: 'string' } },
  required: ['api_token'],
}

// IMAGE provider — Prowler's hosted API lists it as a provider type but its
// credential shape wasn't captured in the serializer excerpt reviewed.
// Seeded inactive until verified.
const UNVERIFIED_SCHEMA = { note: 'Credential schema not yet verified against Prowler source — do not activate until confirmed.' }

// ─── Provider Registry seed ────────────────────────────────────────────────

const PROVIDERS: ProviderSeed[] = [
  // Cloud Infrastructure — active on day one
  { key: 'aws',           displayName: 'Amazon Web Services',  category: 'CLOUD_INFRASTRUCTURE', isActive: true,  credentialSchema: AWS_SCHEMA },
  { key: 'azure',         displayName: 'Microsoft Azure',      category: 'CLOUD_INFRASTRUCTURE', isActive: true,  credentialSchema: AZURE_SCHEMA },
  { key: 'gcp',           displayName: 'Google Cloud Platform', category: 'CLOUD_INFRASTRUCTURE', isActive: true,  credentialSchema: GCP_SCHEMA },
  // Cloud Infrastructure — supported, inactive by default
  { key: 'oraclecloud',   displayName: 'Oracle Cloud Infrastructure', category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: ORACLECLOUD_SCHEMA },
  { key: 'alibabacloud',  displayName: 'Alibaba Cloud',        category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: ALIBABACLOUD_SCHEMA },
  { key: 'openstack',     displayName: 'OpenStack',            category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: OPENSTACK_SCHEMA },
  { key: 'huaweicloud',   displayName: 'Huawei Cloud',         category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
  { key: 'linode',        displayName: 'Linode (Akamai)',      category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
  { key: 'scaleway',      displayName: 'Scaleway',             category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
  { key: 'stackit',       displayName: 'STACKIT',              category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
  { key: 'nhn',           displayName: 'NHN Cloud',            category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
  { key: 'e2enetworks',   displayName: 'E2E Networks',         category: 'CLOUD_INFRASTRUCTURE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },

  // Identity & SaaS Workspace — active on day one (high relevance for DPDP Act — where org data/identity actually lives)
  { key: 'm365',              displayName: 'Microsoft 365',      category: 'IDENTITY_SAAS', isActive: true,  credentialSchema: M365_SCHEMA },
  { key: 'googleworkspace',   displayName: 'Google Workspace',   category: 'IDENTITY_SAAS', isActive: true,  credentialSchema: GOOGLE_WORKSPACE_SCHEMA },
  { key: 'okta',              displayName: 'Okta',               category: 'IDENTITY_SAAS', isActive: true,  credentialSchema: OKTA_SCHEMA },

  // DevOps / Source & Supply Chain — inactive by default (specialized scan targets, not "cloud accounts")
  { key: 'github',  displayName: 'GitHub',                category: 'DEVOPS_SOURCE', isActive: false, credentialSchema: GITHUB_SCHEMA },
  { key: 'iac',      displayName: 'Infrastructure as Code (repo scan)', category: 'DEVOPS_SOURCE', isActive: false, credentialSchema: IAC_SCHEMA },
  { key: 'image',    displayName: 'Container Image Registry', category: 'DEVOPS_SOURCE', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },

  // Database-as-a-Service
  { key: 'mongodbatlas', displayName: 'MongoDB Atlas', category: 'DATABASE_SERVICE', isActive: false, credentialSchema: MONGODBATLAS_SCHEMA },

  // Edge / Platform
  { key: 'cloudflare', displayName: 'Cloudflare', category: 'EDGE_PLATFORM', isActive: false, credentialSchema: CLOUDFLARE_SCHEMA },
  { key: 'vercel',     displayName: 'Vercel',     category: 'EDGE_PLATFORM', isActive: false, credentialSchema: VERCEL_SCHEMA },

  // Container Orchestration
  { key: 'kubernetes', displayName: 'Kubernetes', category: 'CONTAINER_ORCHESTRATION', isActive: false, credentialSchema: KUBERNETES_SCHEMA },

  // Emerging
  { key: 'llm', displayName: 'LLM Security', category: 'EMERGING', isActive: false, credentialSchema: UNVERIFIED_SCHEMA },
]

// ─── Generic Asset Catalog seed ────────────────────────────────────────────
// Only cloudResourceType strings actually confirmed from Prowler's own
// check metadata.json files are included here.

const ASSET_TEMPLATES: Array<{
  providerKey: string
  cloudResourceType: string
  displayName: string
  assetType: string
  defaultCriticality: string
}> = [
  // Azure — verified from prowler/providers/azure/services/*/*.metadata.json
  { providerKey: 'azure', cloudResourceType: 'microsoft.storage/storageaccounts',        displayName: 'Azure Storage Account',   assetType: 'DATABASE_DATA_STORE', defaultCriticality: 'HIGH' },
  { providerKey: 'azure', cloudResourceType: 'microsoft.sql/servers',                    displayName: 'Azure SQL Server',        assetType: 'DATABASE_DATA_STORE', defaultCriticality: 'HIGH' },
  { providerKey: 'azure', cloudResourceType: 'microsoft.documentdb/databaseaccounts',    displayName: 'Azure Cosmos DB',         assetType: 'DATABASE_DATA_STORE', defaultCriticality: 'HIGH' },
  { providerKey: 'azure', cloudResourceType: 'microsoft.compute/virtualmachines',        displayName: 'Azure Virtual Machine',   assetType: 'SYSTEM_APPLICATION',  defaultCriticality: 'MEDIUM' },
  { providerKey: 'azure', cloudResourceType: 'microsoft.containerservice/managedclusters', displayName: 'Azure Kubernetes Service (AKS)', assetType: 'SYSTEM_APPLICATION', defaultCriticality: 'MEDIUM' },
  { providerKey: 'azure', cloudResourceType: 'microsoft.keyvault/vaults/keys',           displayName: 'Azure Key Vault',         assetType: 'SYSTEM_APPLICATION',  defaultCriticality: 'HIGH' },

  // AWS — only one string actually confirmed (s3_bucket_level_public_access_block.metadata.json);
  // remaining AWS resource types intentionally left unseeded pending verification.
  { providerKey: 'aws', cloudResourceType: 'AwsS3Bucket', displayName: 'AWS S3 Bucket', assetType: 'DATABASE_DATA_STORE', defaultCriticality: 'HIGH' },
]

async function seedCloudCatalog() {
  console.log('Seeding Cloud Provider Registry...')

  const providerIdByKey = new Map<string, string>()

  for (const p of PROVIDERS) {
    const row = await db.cloudProviderType.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        displayName: p.displayName,
        category: p.category as any,
        isActive: p.isActive,
        credentialSchema: p.credentialSchema as any,
      },
      update: {
        displayName: p.displayName,
        category: p.category as any,
        credentialSchema: p.credentialSchema as any,
        // isActive intentionally NOT overwritten on update — Super Admin's
        // toggle choice, once made, should survive re-running this seed.
      },
    })
    providerIdByKey.set(p.key, row.id)
  }
  console.log(`Upserted ${PROVIDERS.length} provider types (${PROVIDERS.filter(p => p.isActive).length} active).`)

  console.log('\nSeeding Generic Asset Catalog...')
  let templateCount = 0
  for (const t of ASSET_TEMPLATES) {
    const providerId = providerIdByKey.get(t.providerKey)
    if (!providerId) {
      console.warn(`Skipping template "${t.displayName}" — provider "${t.providerKey}" not found`)
      continue
    }
    await db.genericAssetTemplate.upsert({
      where: { providerId_cloudResourceType: { providerId, cloudResourceType: t.cloudResourceType } },
      create: {
        providerId,
        cloudResourceType: t.cloudResourceType,
        displayName: t.displayName,
        assetType: t.assetType,
        defaultCriticality: t.defaultCriticality,
        status: 'PUBLISHED',
      },
      update: {
        displayName: t.displayName,
        assetType: t.assetType,
        defaultCriticality: t.defaultCriticality,
      },
    })
    templateCount++
  }
  console.log(`Upserted ${templateCount} asset templates.`)

  console.log('\nCloud catalog seed complete.')
  process.exit(0)
}

seedCloudCatalog().catch(err => {
  console.error('Cloud catalog seed failed:', err)
  process.exit(1)
})
