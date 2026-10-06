// SKELETON (step 5). Storage account for customer evidence: private container, ZRS, blob soft delete and versioning,
// no anonymous access, shared-key access disabled (managed identity only). Optional Microsoft Defender for Storage
// (malware scanning on upload) — the customer's choice.
// Intended building block: AVM  avm/res/storage/storage-account
param name string
param location string

@description('Principal allowed to read/write blobs (the apps\' managed identity): Storage Blob Data Contributor.')
param writerPrincipalId string

// TODO: account, 'evidence' container, role assignment, lifecycle policy (none: the software never deletes on its own)

output blobEndpoint string = 'TODO'
