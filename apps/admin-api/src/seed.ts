/**
 * DPDP CMS — Super Admin Seed Script
 * ====================================
 * Run: npx ts-node src/seed.ts
 *
 * Reads from src/seed/data/regulations.json and controls.json
 * Safe to run multiple times — skips existing records.
 */
import dotenv from 'dotenv'
dotenv.config()
import { RegulationStatus, ApplicableTo, ControlStatus, Priority, EvidenceType } from '@prisma/super-admin-client'

import { getSuperAdminPrisma } from '@dpdp/database'
import path from 'path'
import fs from 'fs'

const db = getSuperAdminPrisma()

function loadJson(file: string) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'seed/data', file), 'utf-8'))
}

const CONTROL_FAMILIES = [
  { name: 'Data Collection & Consent', icon: '🔒', color: '#3B82F6' },
  { name: 'Data Principal Rights', icon: '🛡️', color: '#8B5CF6' },
  { name: 'Data Security & Breach Response', icon: '🚨', color: '#EF4444' },
  { name: 'Data Retention & Minimization', icon: '💾', color: '#10B981' },
  { name: 'Third-Party & Vendor Management', icon: '🤝', color: '#F97316' },
  { name: 'Significant Data Fiduciary Obligations', icon: '⭐', color: '#EAB308' },
  { name: 'Privacy Governance & Accountability', icon: '📋', color: '#06B6D4' },
  { name: 'Notice & Transparency', icon: '📢', color: '#6366F1' },
]

async function seedControlFamilies() {
  console.log('  Seeding control families…')
  for (const cf of CONTROL_FAMILIES) {
    await db.controlFamily.upsert({
      where: { name: cf.name },
      update: {},
      create: { name: cf.name, icon: cf.icon, color: cf.color, status: 'ACTIVE' },
    })
  }
}

async function seedRegulations() {
  const regulations = loadJson('regulations.json')
  console.log(`  Seeding ${regulations.length} regulation(s)…`)

  for (const reg of regulations) {
    const regulation = await db.regulation.upsert({
      where: { shortCode: reg.shortCode },
      update: {
        name: reg.name,
        issuingAuthority: reg.issuingAuthority,
        description: reg.description,
        jurisdiction: reg.jurisdiction,
        effectiveDate: new Date(reg.effectiveDate),
        status: RegulationStatus[reg.status as keyof typeof RegulationStatus] ?? RegulationStatus.ACTIVE,
      },
      create: {
        name: reg.name,
        shortCode: reg.shortCode,
        issuingAuthority: reg.issuingAuthority,
        description: reg.description,
        jurisdiction: reg.jurisdiction,
        effectiveDate: new Date(reg.effectiveDate),
        status: RegulationStatus[reg.status as keyof typeof RegulationStatus] ?? RegulationStatus.ACTIVE,
      },
    })

    for (const chapter of reg.chapters ?? []) {
      const ch = await db.regulationChapter.upsert({
        where: { regulationId_name: { regulationId: regulation.id, name: chapter.name } },
        update: {},
        create: {
          regulationId: regulation.id,
          name: chapter.name,
          title: chapter.title ?? null,
          orderIndex: chapter.orderIndex ?? 0,
        },
      })

      for (const section of chapter.sections ?? []) {
        await db.regulationSection.upsert({
          where: { chapterId_name: { chapterId: ch.id, name: section.name } },
          update: {},
          create: {
            chapterId: ch.id,
            name: section.name,
            title: section.title ?? null,
            orderIndex: section.orderIndex ?? 0,
          },
        })
      }
    }
  }
}

async function seedProductsFromControls(controls: any[]) {
  const productNames = new Set<string>()
  for (const ctrl of controls) {
    for (const action of ctrl.actions ?? []) {
      for (const productName of action.products ?? []) {
        productNames.add(productName)
      }
    }
  }

  console.log(`  Seeding ${productNames.size} unique products…`)
  const productMap = new Map<string, string>()

  if (fs.existsSync(path.join(__dirname, 'seed/data/product-families.json'))) {
    const families = loadJson('product-families.json')
    for (const f of families) {
      const family = await db.productFamily.upsert({
        where: { name: f.name },
        update: { description: f.description },
        create: { name: f.name, description: f.description }
      })
      for (const prod of f.products) {
        let product = await db.product.findFirst({ where: { name: prod.name } })
        if (!product) {
          product = await db.product.create({
            data: {
              name: prod.name,
              productFamilyId: family.id,
              vendor: prod.vendor ?? null,
              description: prod.description ?? null,
            },
          })
        } else {
          product = await db.product.update({
            where: { id: product.id },
            data: {
              productFamilyId: family.id,
              vendor: prod.vendor ?? null,
              description: prod.description ?? null,
            },
          })
        }
        productNames.add(prod.name)
      }
    }
  }

  for (const name of productNames) {
    let product = await db.product.findFirst({ where: { name } })
    if (!product) {
      product = await db.product.create({ data: { name } })
    }
    if (product) productMap.set(name, product.id)
  }

  return productMap
}

async function seedControls(productMap: Map<string, string>) {
  const controls = loadJson('controls.json')
  console.log(`  Seeding ${controls.length} control(s)…`)

  for (const ctrl of controls) {
    // Get family IDs
    const families = await Promise.all(
      (ctrl.families ?? []).map((name: string) =>
        db.controlFamily.findFirst({ where: { name } })
      )
    )

    // Get regulation/chapter/section IDs for mappings
    const regulationMappings = []
    for (const mapping of ctrl.regulations ?? []) {
      const reg = await db.regulation.findUnique({ where: { shortCode: mapping.regulationShortCode } })
      if (!reg) continue

      let chapterId: string | null = null
      let sectionId: string | null = null

      if (mapping.chapterName) {
        const chapter = await db.regulationChapter.findFirst({
          where: { regulationId: reg.id, name: mapping.chapterName },
        })
        if (chapter) {
          chapterId = chapter.id

          if (mapping.sectionName) {
            const section = await db.regulationSection.findFirst({
              where: { chapterId: chapter.id, name: mapping.sectionName },
            })
            if (section) sectionId = section.id
          }
        }
      }

      regulationMappings.push({ regulationId: reg.id, chapterId, sectionId })
    }

    // Find or create/update the control
    let control = await db.control.findFirst({
      where: { title: ctrl.title, isCustom: false, tenantId: { equals: null } },
    })

    if (!control) {
      control = await db.control.create({
        data: {
          title: ctrl.title,
          description: ctrl.description,
          applicableTo: ApplicableTo[ctrl.applicableTo as keyof typeof ApplicableTo],
          status: ControlStatus[ctrl.status as keyof typeof ControlStatus],
          isCustom: false,
          tenantId: null,
        },
      })
    } else {
      control = await db.control.update({
        where: { id: control.id },
        data: {
          description: ctrl.description,
          applicableTo: ApplicableTo[ctrl.applicableTo as keyof typeof ApplicableTo],
          status: ControlStatus[ctrl.status as keyof typeof ControlStatus],
        },
      })
    }

    // Add regulation mappings
    for (const mapping of regulationMappings) {
      await db.controlRegulation.upsert({
        where: { controlId_regulationId: { controlId: control.id, regulationId: mapping.regulationId } },
        update: { chapterId: mapping.chapterId, sectionId: mapping.sectionId },
        create: {
          controlId: control.id,
          regulationId: mapping.regulationId,
          chapterId: mapping.chapterId,
          sectionId: mapping.sectionId,
        },
      })
    }

    // Add family memberships
    for (const family of families) {
      if (!family) continue
      await db.controlFamilyMember.upsert({
        where: { controlFamilyId_controlId: { controlFamilyId: family.id, controlId: control.id } },
        update: {},
        create: { controlFamilyId: family.id, controlId: control.id },
      })
    }

    // Add predefined actions
    let actionIndex = 0
    for (const action of ctrl.actions ?? []) {
      const existing = await db.controlPredefinedAction.findFirst({
        where: { controlId: control.id, title: action.title },
      })

      let predefinedAction = existing
      if (!existing) {
        predefinedAction = await db.controlPredefinedAction.create({
          data: {
            controlId: control.id,
            title: action.title,
            description: action.description,
            evidenceTypes: action.evidenceTypes.map((t: string) => EvidenceType[t as keyof typeof EvidenceType]),
            suggestedDueDays: action.suggestedDueDays,
            priority: Priority[action.priority as keyof typeof Priority],
            orderIndex: action.orderIndex ?? actionIndex,
          },
        })
      } else {
        predefinedAction = await db.controlPredefinedAction.update({
          where: { id: existing.id },
          data: {
            description: action.description,
            evidenceTypes: action.evidenceTypes.map((t: string) => EvidenceType[t as keyof typeof EvidenceType]),
            suggestedDueDays: action.suggestedDueDays,
            priority: Priority[action.priority as keyof typeof Priority],
            orderIndex: action.orderIndex ?? actionIndex,
          },
        })
      }

      // Link products to action
      for (const productName of action.products ?? []) {
        const productId = productMap.get(productName)
        if (!productId || !predefinedAction) continue

        await db.actionProduct.upsert({
          where: { predefinedActionId_productId: { predefinedActionId: predefinedAction.id, productId } },
          update: {},
          create: { predefinedActionId: predefinedAction.id, productId },
        })
      }

      actionIndex++
    }
  }
}

async function main() {
  console.log('\n🌱 DPDP CMS — Seed Script\n')

  try {
    await seedControlFamilies()
    await seedLmsDesignations()
    await seedRegulations()
    const productMap = await seedProductsFromControls(loadJson('controls.json'))
    await seedControls(productMap)

    const counts = {
      regulations: await db.regulation.count(),
      chapters: await db.regulationChapter.count(),
      sections: await db.regulationSection.count(),
      controls: await db.control.count({ where: { isCustom: false } }),
      actions: await db.controlPredefinedAction.count(),
      products: await db.product.count(),
      families: await db.controlFamily.count(),
    }

    console.log('\n✅ Seed complete!\n')
    console.log('  Regulations:      ', counts.regulations)
    console.log('  Chapters:         ', counts.chapters)
    console.log('  Sections:         ', counts.sections)
    console.log('  Controls:         ', counts.controls)
    console.log('  Actions:          ', counts.actions)
    console.log('  Products:         ', counts.products)
    console.log('  Control Families: ', counts.families)
    console.log()

  } catch (err) {
    console.error('\n❌ Seed failed:', err)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main()
// ─── Seed LMS Designations (appended) ─────────────────────────────────────────
const LMS_DESIGNATIONS = [
  { name: 'CEO',     description: 'Chief Executive Officer — executive privacy and governance awareness',  displayOrder: 1 },
  { name: 'CFO',     description: 'Chief Financial Officer — data governance for finance and audit',        displayOrder: 2 },
  { name: 'CISO',    description: 'Chief Information Security Officer — security, privacy, and compliance', displayOrder: 3 },
  { name: 'CTO',     description: 'Chief Technology Officer — technical privacy, security engineering',     displayOrder: 4 },
  { name: 'COO',     description: 'Chief Operating Officer — operational compliance and process',           displayOrder: 5 },
  { name: 'CLO',     description: 'Chief Legal Officer — regulatory, legal and contractual compliance',     displayOrder: 6 },
  { name: 'CPO',     description: 'Chief Privacy Officer — full DPDP Act curriculum',                      displayOrder: 7 },
  { name: 'DPO',     description: 'Data Protection Officer — full DPDP Act + audit + board reporting',     displayOrder: 8 },
  { name: 'IT_LEAD', description: 'IT Team Lead — technical security fundamentals',                         displayOrder: 9 },
  { name: 'MANAGER', description: 'Department Manager — team privacy awareness',                            displayOrder: 10 },
]

async function seedLmsDesignations() {
  console.log('  Seeding LMS designations…')
  for (const d of LMS_DESIGNATIONS) {
    await db.lmsDesignation.upsert({
      where:  { name: d.name },
      update: { description: d.description, displayOrder: d.displayOrder },
      create: d,
    })
  }
}