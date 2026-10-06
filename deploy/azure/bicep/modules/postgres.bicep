// SKELETON (step 5). PostgreSQL Flexible Server for the organisation's database (schemas: public = customer data,
// catalog = Library replica, platform_* = versions/licence). Zone-redundant HA in the medium/large sizes, point-in-time
// restore (7–35 days), private access only, TLS required. The migration job and the apps use separate roles.
// Intended building block: AVM  avm/res/db-for-postgre-sql/flexible-server
param name string
param location string

@description('Compute SKU, e.g. Standard_D2ds_v5 (placeholder sizes until the load test).')
param sku string
param storageGb int
param highAvailability bool

// TODO: flexible server, database, firewall / private endpoint, backup retention, extensions allow-list

output host string = 'TODO'
