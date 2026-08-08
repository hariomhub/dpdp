/**
 * excel-to-json.js
 * ----------------
 * Reads master-seed-data.xlsx and writes the 3 seed JSON files.
 * Run from the project root:
 *   node excel-to-json.js
 *
 * Then seed the database:
 *   cd apps/admin-api && npx ts-node src/seed.ts
 */

const ExcelJS = (() => {
  try { return require('exceljs'); }
  catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); }
})();
const path = require('path');
const fs   = require('fs');

const EXCEL_FILE = path.join(__dirname, 'master-seed-data.xlsx');
const SEED_DIR   = path.join(__dirname, 'apps/admin-api/src/seed/data');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readSheet(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.warn(`  ⚠️   Sheet "${sheetName}" not found — skipping`);
    return [];
  }

  const headers = {};
  const rows    = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) {
      row.eachCell((cell, colNum) => {
        const raw = (cell.value ?? '').toString();
        // Strip " *" suffix and anything after " (" to get the clean key
        const key = raw.split(' *')[0].split(' (')[0].trim();
        if (key) headers[colNum] = key;
      });
      return;
    }

    const obj = {};
    let hasData = false;
    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      const key = headers[colNum];
      if (!key) return;
      let val = cell.value;
      if (val && typeof val === 'object' && val.text)   val = val.text;   // rich text
      if (val && typeof val === 'object' && val.result) val = val.result; // formula
      const str = val == null ? '' : String(val).trim();
      obj[key] = str;
      if (str) hasData = true;
    });

    if (hasData) rows.push(obj);
  });

  return rows;
}

function splitComma(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function num(str, fallback = 0) {
  const n = parseInt(str, 10);
  return isNaN(n) ? fallback : n;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`\n❌  File not found: master-seed-data.xlsx`);
    console.error(`   Run "node generate-excel.js" first to create the template.\n`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_FILE);
  console.log('\n📖  Reading master-seed-data.xlsx...\n');

  // ── Build regulations.json ─────────────────────────────────────────────────

  const regRows  = readSheet(wb, '1. Regulations');
  const chRows   = readSheet(wb, '2. Chapters');
  const secRows  = readSheet(wb, '3. Sections');

  const regMap = {};
  for (const r of regRows) {
    if (!r.shortCode || !r.name) { console.warn(`  ⚠️   Regulation skipped — missing shortCode or name`); continue; }
    regMap[r.shortCode] = {
      shortCode:        r.shortCode,
      name:             r.name,
      issuingAuthority: r.issuingAuthority || '',
      description:      r.description || '',
      jurisdiction:     r.jurisdiction || 'India',
      effectiveDate:    r.effectiveDate || '',
      status:           r.status || 'ACTIVE',
      chapters:         [],
    };
  }

  const chapterMap = {};
  for (const c of chRows) {
    if (!c.regulationShortCode || !c.name) continue;
    if (!regMap[c.regulationShortCode]) {
      console.warn(`  ⚠️   Chapter "${c.name}" references unknown regulation "${c.regulationShortCode}" — skipped`);
      continue;
    }
    const chapter = {
      name:       c.name,
      title:      c.title || null,
      orderIndex: num(c.orderIndex, 0),
      sections:   [],
    };
    const key = `${c.regulationShortCode}||${c.name}`;
    chapterMap[key] = chapter;
    regMap[c.regulationShortCode].chapters.push(chapter);
  }

  for (const s of secRows) {
    if (!s.regulationShortCode || !s.chapterName || !s.name) continue;
    const key = `${s.regulationShortCode}||${s.chapterName}`;
    if (!chapterMap[key]) {
      console.warn(`  ⚠️   Section "${s.name}" references unknown chapter "${s.chapterName}" — skipped`);
      continue;
    }
    chapterMap[key].sections.push({
      name:       s.name,
      title:      s.title || null,
      orderIndex: num(s.orderIndex, 0),
    });
  }

  const regulationsJson = Object.values(regMap);

  // ── Build controls.json ────────────────────────────────────────────────────

  const ctrlRows = readSheet(wb, '4. Controls');
  const actRows  = readSheet(wb, '5. Actions');

  const controlMap = {};
  for (const c of ctrlRows) {
    if (!c.id || !c.title) { console.warn(`  ⚠️   Control skipped — missing id or title`); continue; }

    if (!controlMap[c.id]) {
      controlMap[c.id] = {
        id:          c.id,
        title:       c.title,
        description: c.description || '',
        applicableTo: c.applicableTo || 'BOTH',
        status:      c.status || 'PUBLISHED',
        families:    splitComma(c.families),
        regulations: [],
        actions:     [],
      };
    }

    // Multiple rows with same id = multiple regulation mappings
    if (c.regulationShortCode) {
      controlMap[c.id].regulations.push({
        regulationShortCode: c.regulationShortCode,
        chapterName:         c.chapterName || null,
        sectionName:         c.sectionName || null,
      });
    }
  }

  for (const a of actRows) {
    if (!a.controlId || !a.title) { console.warn(`  ⚠️   Action skipped — missing controlId or title`); continue; }
    if (!controlMap[a.controlId]) {
      console.warn(`  ⚠️   Action "${a.title}" references unknown controlId "${a.controlId}" — skipped`);
      continue;
    }
    controlMap[a.controlId].actions.push({
      id:               a.id || null,
      title:            a.title,
      description:      a.description || '',
      evidenceTypes:    splitComma(a.evidenceTypes),
      priority:         a.priority || 'HIGH',
      suggestedDueDays: num(a.suggestedDueDays, 30),
      orderIndex:       a.orderIndex ? num(a.orderIndex) : null,
      products:         splitComma(a.products),
    });
  }

  const controlsJson = Object.values(controlMap);

  // ── Build product-families.json ────────────────────────────────────────────

  const pfRows = readSheet(wb, '6. Product Families');
  const familyMap = {};

  for (const p of pfRows) {
    if (!p.familyName || !p.productName) { console.warn(`  ⚠️   Product row skipped — missing familyName or productName`); continue; }

    if (!familyMap[p.familyName]) {
      familyMap[p.familyName] = {
        name:        p.familyName,
        description: p.familyDescription || '',
        products:    [],
      };
    }

    const product = { name: p.productName };
    if (p.productVendor)      product.vendor      = p.productVendor;
    if (p.productDescription) product.description = p.productDescription;

    familyMap[p.familyName].products.push(product);
  }

  const productFamiliesJson = Object.values(familyMap);

  // ── Write JSON files ───────────────────────────────────────────────────────

  fs.writeFileSync(
    path.join(SEED_DIR, 'regulations.json'),
    JSON.stringify(regulationsJson, null, 2)
  );
  fs.writeFileSync(
    path.join(SEED_DIR, 'controls.json'),
    JSON.stringify(controlsJson, null, 2)
  );
  fs.writeFileSync(
    path.join(SEED_DIR, 'product-families.json'),
    JSON.stringify(productFamiliesJson, null, 2)
  );

  console.log('✅  JSON files written to apps/admin-api/src/seed/data/\n');
  console.log(`    regulations.json      — ${regulationsJson.length} regulation(s), ${Object.values(chapterMap).length} chapter(s), ${secRows.length} section(s)`);
  console.log(`    controls.json         — ${controlsJson.length} control(s), ${actRows.length} action(s)`);
  console.log(`    product-families.json — ${productFamiliesJson.length} family/families, ${pfRows.length} product(s)`);
  console.log('\nNext step:');
  console.log('  cd apps/admin-api && npx ts-node src/seed.ts\n');
}

main().catch(err => {
  console.error('\n❌  Failed:', err.message);
  process.exit(1);
});
