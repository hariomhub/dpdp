// SKELETON (step 5). Log Analytics workspace for container logs and metrics; alert rules (readiness failing, restarts,
// database CPU/storage, queue backlog) are added here. Retention is set per customer.
// Intended building block: AVM  avm/res/operational-insights/workspace
param name string
param location string

// TODO: resource workspace 'Microsoft.OperationalInsights/workspaces'

output workspaceId string = 'TODO'
