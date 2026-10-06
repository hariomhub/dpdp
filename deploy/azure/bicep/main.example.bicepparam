// EXAMPLE parameter file (skeleton). One file per customer deployment; kept in the customer's/ops repository, not here.
// No secrets: those live in Key Vault.
using './main.bicep'

param name = 'acme-prod'
param size = 'small'
param portalHostname = 'compliance.acme.com'
param imageRegistry = 'ghcr.io/REPLACE-ORG'          // or the customer's own mirror
param appVersion = '1.0.0@sha256:REPLACE-WITH-DIGEST'
param useValkeyContainer = true
param privateNetworking = true
