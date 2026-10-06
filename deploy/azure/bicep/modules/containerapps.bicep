// SKELETON (step 5). The Container Apps environment and the workloads.
//   api      : web app + API. Ingress HTTPS, custom domain + managed certificate (or the customer's), min replicas per size,
//              probes: liveness /health, readiness /ready, startup /ready; terminationGracePeriod > SHUTDOWN_GRACE_SECONDS.
//   worker   : same image, worker command; scales on queue length (KEDA); no ingress.
//   migration: a Job that runs before each new revision takes traffic (backup gate -> lock -> migrate -> drift check).
// All settings arrive as Key Vault references through the managed identity. The image is pulled by digest.
// Intended building blocks: AVM  avm/res/app/managed-environment, avm/res/app/container-app, avm/res/app/job
param name string
param location string
param logAnalyticsId string
param identityId string
param image string
param workerImage string
param apiCpu string
param apiMemory string
param apiMin int
param apiMax int
param workerMin int
param workerMax int
param portalHostname string
param licenceSecretName string
param keyVaultUri string

// TODO: managed environment, api app, worker app (KEDA scale rule), migration job, custom domain / certificate

output apiFqdn string = 'TODO'
