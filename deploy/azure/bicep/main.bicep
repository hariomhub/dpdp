// =====================================================================================================================
// SKELETON — NOT DEPLOYABLE YET (step 5). Shows how the Azure package is organised and parameterised.
// Intent: one resource group per customer deployment; modules built on Azure Verified Modules (AVM) where one exists.
// Architecture and rationale: ../README.md
// =====================================================================================================================
targetScope = 'resourceGroup'

@description('Short prefix for every resource name, e.g. "acme-prod".')
@minLength(3)
@maxLength(16)
param name string

param location string = resourceGroup().location

@description('Reference size. The numbers below are placeholders until the load test sets them.')
@allowed(['small', 'medium', 'large'])
param size string = 'small'

@description('Public host name of the portal, e.g. compliance.acme.com')
param portalHostname string

@description('Application image version, pinned by digest in production, e.g. "1.4.2@sha256:..."')
param appVersion string

@description('Container registry that holds the images (the vendor registry, or a customer mirror).')
param imageRegistry string

@description('Name of the Key Vault secret holding the licence (installed at first start).')
param licenceSecretName string = 'licence'

@description('Use the Valkey container instead of Azure Managed Redis (until Managed Redis is verified with the job queue).')
param useValkeyContainer bool = true

@description('Create a VNet with private endpoints (recommended) instead of public access restricted by firewall.')
param privateNetworking bool = true

// Reference sizes — PLACEHOLDERS, set from the load test (decision D20).
var sizes = {
  small:  { apiCpu: '0.5', apiMemory: '1Gi', apiMin: 1, apiMax: 3,  workerMin: 1, workerMax: 2, pgSku: 'Standard_D2ds_v5', pgStorageGb: 128, pgHa: false }
  medium: { apiCpu: '1.0', apiMemory: '2Gi', apiMin: 2, apiMax: 6,  workerMin: 1, workerMax: 4, pgSku: 'Standard_D4ds_v5', pgStorageGb: 256, pgHa: true  }
  large:  { apiCpu: '2.0', apiMemory: '4Gi', apiMin: 3, apiMax: 10, workerMin: 2, workerMax: 8, pgSku: 'Standard_D8ds_v5', pgStorageGb: 512, pgHa: true  }
}
var s = sizes[size]

// ---- Modules (each is a stub today) ----------------------------------------------------------------------------
module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: { name: name, location: location }
}

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: { name: name, location: location }
}

module network 'modules/network.bicep' = if (privateNetworking) {
  name: 'network'
  params: { name: name, location: location }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: { name: name, location: location, readerPrincipalId: identity.outputs.principalId }
}

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: { name: name, location: location, sku: s.pgSku, storageGb: s.pgStorageGb, highAvailability: s.pgHa }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: { name: name, location: location, writerPrincipalId: identity.outputs.principalId }
}

module redis 'modules/redis.bicep' = {
  name: 'redis'
  params: { name: name, location: location, useValkeyContainer: useValkeyContainer }
}

module apps 'modules/containerapps.bicep' = {
  name: 'apps'
  params: {
    name: name
    location: location
    logAnalyticsId: monitoring.outputs.workspaceId
    identityId: identity.outputs.id
    image: '${imageRegistry}/niyamsaathi-api:${appVersion}'
    workerImage: '${imageRegistry}/niyamsaathi-worker:${appVersion}'
    apiCpu: s.apiCpu
    apiMemory: s.apiMemory
    apiMin: s.apiMin
    apiMax: s.apiMax
    workerMin: s.workerMin
    workerMax: s.workerMax
    portalHostname: portalHostname
    licenceSecretName: licenceSecretName
    keyVaultUri: keyvault.outputs.uri
    // Settings the application validates at start-up (see apps/tenant-api/.env.example):
    //   TENANT_DATABASE_URL, REDIS_URL, STORAGE_PROVIDER=azure, AZURE_EVIDENCE_*, TENANT_APP_URL, TRUST_PROXY=1 ...
    // all supplied as Key Vault references — no secret values in this template.
  }
}

output portalUrl string = 'https://${portalHostname}'
output resourceGroup string = resourceGroup().name
