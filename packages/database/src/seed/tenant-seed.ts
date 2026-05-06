import { getSuperAdminPrisma, getTenantPrisma } from '../index'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const superAdmin = getSuperAdminPrisma()
const tenant = getTenantPrisma()

async function seedTenant() {
  console.log('Starting tenant seed from Super Admin data...')

  // 1. Fetch all active regulations from super admin
  const regulations = await superAdmin.regulation.findMany({
    where: { status: 'ACTIVE' },
    include: {
      controlMappings: {
        where: {
          control: { status: 'PUBLISHED', isCustom: false },
        },
        include: {
          control: {
            include: {
              predefinedActions: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      },
    },
  })

  console.log(`Found ${regulations.length} active regulations`)

  // 2. Fetch all published LMS courses
  const courses = await superAdmin.lmsCourse.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      sections: {
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: { orderBy: { orderIndex: 'asc' } },
          quiz: {
            include: {
              questions: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  options: { orderBy: { orderIndex: 'asc' } },
                },
              },
            },
          },
        },
      },
      certificateTemplate: true,
    },
  })

  console.log(`Found ${courses.length} published courses`)

  // 3. Output seed summary as JSON
  const seedPackage = {
    generatedAt: new Date().toISOString(),
    regulations: regulations.map(r => ({
      id: r.id,
      name: r.name,
      shortCode: r.shortCode,
      issuingAuthority: r.issuingAuthority,
      description: r.description,
      jurisdiction: r.jurisdiction,
      effectiveDate: r.effectiveDate,
      status: r.status,
      controls: r.controlMappings
        .filter(m => m.control)
        .map(m => ({
          id: m.control.id,
          title: m.control.title,
          description: m.control.description,
          chapterReference: m.control.chapterReference,
          sectionReference: m.control.sectionReference,
          applicableTo: m.control.applicableTo,
          status: m.control.status,
          predefinedActions: m.control.predefinedActions,
        })),
    })),
    courses: courses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      estimatedHours: c.estimatedHours,
      estimatedMinutes: c.estimatedMinutes,
      status: c.status,
      sections: c.sections,
    })),
  }

  // Write seed package to file
  const fs = await import('fs')
  const outputPath = path.resolve(__dirname, '../../seed-output/tenant-seed.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(seedPackage, null, 2))

  console.log(`Seed package written to: ${outputPath}`)
  console.log(`Summary:`)
  console.log(`  Regulations: ${seedPackage.regulations.length}`)
  console.log(`  Total Controls: ${seedPackage.regulations.reduce((s, r) => s + r.controls.length, 0)}`)
  console.log(`  Courses: ${seedPackage.courses.length}`)
  console.log('Tenant seed complete.')

  process.exit(0)
}

seedTenant().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})