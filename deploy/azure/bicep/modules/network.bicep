// SKELETON (step 5). OPTIONAL profile (privateNetworking = true): a VNet with a subnet for the Container Apps environment
// and subnets for private endpoints (PostgreSQL, Storage, Key Vault, Redis) plus the matching private DNS zones.
// With privateNetworking = false the data services stay reachable only through their firewalls (a simpler profile for
// small customers; to be decided in step 5).
// Intended building blocks: AVM  avm/res/network/virtual-network, avm/res/network/private-dns-zone
param name string
param location string

// TODO: virtual network, subnets (apps, endpoints), private DNS zones

output appsSubnetId string = 'TODO'
output endpointsSubnetId string = 'TODO'
