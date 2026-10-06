// SKELETON (step 5). Key Vault holding what must never sit in an app setting: the database connection string, JWT secret,
// the two encryption keys (also BACKED UP SEPARATELY from the database), SMTP credentials and the licence.
// The apps read it through the managed identity (role: Key Vault Secrets User) using Key Vault references.
// Soft delete + purge protection on. Intended building block: AVM  avm/res/key-vault/vault
param name string
param location string

@description('Principal that may read secrets (the apps\' managed identity).')
param readerPrincipalId string

// TODO: vault + role assignment for readerPrincipalId

output uri string = 'TODO'
