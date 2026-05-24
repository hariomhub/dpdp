import fs from 'fs'
import path from 'path'

const controls = JSON.parse(fs.readFileSync(path.join(__dirname, 'controls.json'), 'utf-8'))
const products = new Set<string>()

for (const ctrl of controls) {
  for (const action of ctrl.actions || []) {
    for (const prod of action.products || []) {
      products.add(prod)
    }
  }
}

const productList = Array.from(products).sort()

// Basic categorization
const families = [
  { name: 'Identity & Access Management (IAM)', keywords: ['AD', 'Okta', 'Auth', 'Ping', 'CyberArk', 'Duo', 'Google Workspace', 'Identity', 'Access', 'MFA'], products: [] as string[] },
  { name: 'Data Protection & Encryption', keywords: ['Encrypt', 'KMS', 'Vault', 'BitLocker', 'Vormetric', 'Thales', 'Protect', 'Data Loss', 'DLP'], products: [] as string[] },
  { name: 'Security Information and Event Management (SIEM)', keywords: ['Splunk', 'QRadar', 'Log', 'AlienVault', 'Datadog', 'Sumo', 'Sentinel'], products: [] as string[] },
  { name: 'Consent Management', keywords: ['OneTrust', 'TrustArc', 'Cookie', 'Consent', 'Didomi', 'Ketch', 'Privacy'], products: [] as string[] },
  { name: 'Endpoint Protection', keywords: ['CrowdStrike', 'Defender', 'Symantec', 'McAfee', 'Endpoint', 'Antivirus', 'EDR'], products: [] as string[] },
  { name: 'Cloud Security', keywords: ['AWS', 'Azure', 'GCP', 'Cloud', 'Prisma', 'Wiz', 'Orca'], products: [] as string[] },
  { name: 'Other / General Security', keywords: [], products: [] as string[] }
]

for (const prod of productList) {
  let matched = false
  for (const fam of families) {
    if (fam.keywords.some(k => prod.toLowerCase().includes(k.toLowerCase()))) {
      fam.products.push(prod)
      matched = true
      break
    }
  }
  if (!matched) {
    families[families.length - 1].products.push(prod)
  }
}

const output = families.map(f => ({
  name: f.name,
  description: `${f.name} solutions`,
  products: f.products.map(p => ({ name: p }))
})).filter(f => f.products.length > 0)

fs.writeFileSync(path.join(__dirname, 'product-families.json'), JSON.stringify(output, null, 2))
console.log('Created product-families.json')
