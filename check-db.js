const { Pool } = require('pg');
const db = new Pool({ connectionString: 'postgresql://postgres:hariom@localhost:5433/dpdp_super_admin' });

async function run() {
  // 1. Control-regulation summary
  const q1 = await db.query(`
    SELECT
      r."shortCode" as reg,
      COUNT(cr."controlId") as total_controls,
      COUNT(cr."chapterId") as with_chapter,
      COUNT(cr."sectionId") as with_section
    FROM regulations r
    LEFT JOIN control_regulations cr ON cr."regulationId" = r.id
    GROUP BY r."shortCode"
    ORDER BY r."shortCode"
  `);
  console.log('\n=== Control-Regulation Summary ===');
  console.table(q1.rows);

  // 2. Controls per chapter per regulation
  const q2 = await db.query(`
    SELECT
      r."shortCode" as reg,
      COALESCE(rc.name, '(no chapter)') as chapter,
      COUNT(cr."controlId") as controls
    FROM regulations r
    LEFT JOIN control_regulations cr ON cr."regulationId" = r.id
    LEFT JOIN regulation_chapters rc ON rc.id = cr."chapterId"
    GROUP BY r."shortCode", rc.name
    ORDER BY r."shortCode", rc.name NULLS LAST
  `);
  console.log('\n=== Controls per Chapter ===');
  console.table(q2.rows);

  // 3. Sample the Control-Reg Map to see if chapterIds look valid
  const q3 = await db.query(`
    SELECT
      c.title as control,
      r."shortCode" as reg,
      cr."chapterId",
      rc.name as chapter_name,
      cr."sectionId",
      rs.name as section_name
    FROM control_regulations cr
    JOIN controls c ON c.id = cr."controlId"
    JOIN regulations r ON r.id = cr."regulationId"
    LEFT JOIN regulation_chapters rc ON rc.id = cr."chapterId"
    LEFT JOIN regulation_sections rs ON rs.id = cr."sectionId"
    ORDER BY r."shortCode", rc.name
    LIMIT 15
  `);
  console.log('\n=== Sample Control-Reg-Chapter-Section Data (first 15) ===');
  console.table(q3.rows);

  await db.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
