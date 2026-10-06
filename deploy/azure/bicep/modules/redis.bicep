// SKELETON (step 5). The job queue (BullMQ). Two options behind one output (REDIS_URL):
//   1. Azure Managed Redis (Microsoft.Cache/redisEnterprise) — TO BE VERIFIED: BullMQ needs maxmemory-policy = noeviction
//      and a cluster policy it accepts; TLS only (rediss://, port 10000). Azure Cache for Redis is being retired and is closed
//      to new customers, so it is not an option.
//   2. A Valkey container app in the same environment (fallback, also what variants B and C use).
// A spike in step 5 decides the default.
param name string
param location string
param useValkeyContainer bool

// TODO: if (!useValkeyContainer) redis enterprise cluster + database, else nothing here (Valkey lives in containerapps.bicep)

output redisUrlSecretName string = 'TODO'
