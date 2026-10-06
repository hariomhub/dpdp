// SKELETON (step 5). User-assigned managed identity used by the apps: no passwords or connection strings anywhere.
// Role assignments (granted in the modules that own the resource): AcrPull (registry), Key Vault Secrets User,
// Storage Blob Data Contributor (evidence container).
// Intended building block: AVM  avm/res/managed-identity/user-assigned-identity  (verify exact name/version when implementing).
param name string
param location string

// TODO: resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities' = { name: '${name}-id', location: location }

output id string = 'TODO'
output principalId string = 'TODO'
