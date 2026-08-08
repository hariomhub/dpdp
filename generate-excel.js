/**
 * generate-excel.js
 * -----------------
 * Reads the 3 seed JSON files and produces master-seed-data.xlsx.
 * Run from the project root:
 *   node generate-excel.js
 */

const ExcelJS = (() => {
  try { return require('exceljs'); }
  catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); }
})();
const path = require('path');
const fs   = require('fs');

const SEED_DIR = path.join(__dirname, 'apps/admin-api/src/seed/data');
const OUTPUT   = path.join(__dirname, 'master-seed-data.xlsx');

function loadJson(file) {
  const p = path.join(SEED_DIR, file);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function addSheet(wb, name, columns, rows) {
  const ws = wb.addWorksheet(name);

  ws.columns = columns.map(c => ({
    header: c.header,
    key:    c.key,
    width:  c.width || 20,
  }));

  // Header row styling — light grey background, bold text
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.height = 18;

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  // Data rows
  for (const row of rows) {
    ws.addRow(row);
  }

  return ws;
}

async function main() {
  const regulations    = loadJson('regulations.json');
  const controls       = loadJson('controls.json');
  const productFamilies = loadJson('product-families.json');

  const wb = new ExcelJS.Workbook();
  wb.creator  = 'DPDP Seed Generator';
  wb.created  = new Date();

  // ── Sheet 1: Regulations ──────────────────────────────────────────────────
  const regRows = regulations.map(r => ({
    shortCode:        r.shortCode,
    name:             r.name,
    issuingAuthority: r.issuingAuthority,
    description:      r.description,
    jurisdiction:     r.jurisdiction || 'India',
    effectiveDate:    r.effectiveDate,
    status:           r.status || 'ACTIVE',
  }));

  addSheet(wb, '1. Regulations', [
    { header: 'shortCode *',                          key: 'shortCode',        width: 15 },
    { header: 'name *',                               key: 'name',             width: 45 },
    { header: 'issuingAuthority',                     key: 'issuingAuthority', width: 45 },
    { header: 'description',                          key: 'description',      width: 60 },
    { header: 'jurisdiction',                         key: 'jurisdiction',     width: 15 },
    { header: 'effectiveDate (YYYY-MM-DD)',            key: 'effectiveDate',    width: 22 },
    { header: 'status (DRAFT / ACTIVE / ARCHIVED)',   key: 'status',           width: 30 },
  ], regRows);

  // ── Sheet 2: Chapters ─────────────────────────────────────────────────────
  const chapterRows = [];
  for (const r of regulations) {
    for (const ch of r.chapters || []) {
      chapterRows.push({
        regulationShortCode: r.shortCode,
        name:       ch.name,
        title:      ch.title || '',
        orderIndex: ch.orderIndex ?? 0,
      });
    }
  }

  addSheet(wb, '2. Chapters', [
    { header: 'regulationShortCode *', key: 'regulationShortCode', width: 22 },
    { header: 'name *',                key: 'name',                width: 15 },
    { header: 'title',                 key: 'title',               width: 45 },
    { header: 'orderIndex',            key: 'orderIndex',          width: 12 },
  ], chapterRows);

  // ── Sheet 3: Sections ─────────────────────────────────────────────────────
  const sectionRows = [];
  for (const r of regulations) {
    for (const ch of r.chapters || []) {
      for (const sec of ch.sections || []) {
        sectionRows.push({
          regulationShortCode: r.shortCode,
          chapterName: ch.name,
          name:        sec.name,
          title:       sec.title || '',
          orderIndex:  sec.orderIndex ?? 0,
        });
      }
    }
  }

  addSheet(wb, '3. Sections', [
    { header: 'regulationShortCode *', key: 'regulationShortCode', width: 22 },
    { header: 'chapterName *',         key: 'chapterName',         width: 15 },
    { header: 'name *',                key: 'name',                width: 15 },
    { header: 'title',                 key: 'title',               width: 45 },
    { header: 'orderIndex',            key: 'orderIndex',          width: 12 },
  ], sectionRows);

  // ── Sheet 4: Controls ─────────────────────────────────────────────────────
  const controlRows = [];
  controls.forEach((ctrl, idx) => {
    const id   = ctrl.id || `C${String(idx + 1).padStart(3, '0')}`;
    const regs = ctrl.regulations || [];

    if (regs.length === 0) {
      controlRows.push({
        id,
        title:               ctrl.title,
        description:         ctrl.description || '',
        applicableTo:        ctrl.applicableTo || 'BOTH',
        status:              ctrl.status || 'PUBLISHED',
        families:            (ctrl.families || []).join(', '),
        regulationShortCode: '',
        chapterName:         '',
        sectionName:         '',
      });
    } else {
      for (const r of regs) {
        controlRows.push({
          id,
          title:               ctrl.title,
          description:         ctrl.description || '',
          applicableTo:        ctrl.applicableTo || 'BOTH',
          status:              ctrl.status || 'PUBLISHED',
          families:            (ctrl.families || []).join(', '),
          regulationShortCode: r.regulationShortCode || '',
          chapterName:         r.chapterName || '',
          sectionName:         r.sectionName || '',
        });
      }
    }
  });

  addSheet(wb, '4. Controls', [
    { header: 'id *',                                                     key: 'id',                  width: 10 },
    { header: 'title *',                                                   key: 'title',               width: 45 },
    { header: 'description',                                               key: 'description',         width: 65 },
    { header: 'applicableTo (BOTH / DATA_FIDUCIARY / SIGNIFICANT_DF)',     key: 'applicableTo',        width: 48 },
    { header: 'status (DRAFT / PUBLISHED)',                                key: 'status',              width: 22 },
    { header: 'families (comma-separated)',                                key: 'families',            width: 35 },
    { header: 'regulationShortCode',                                       key: 'regulationShortCode', width: 20 },
    { header: 'chapterName',                                               key: 'chapterName',         width: 15 },
    { header: 'sectionName',                                               key: 'sectionName',         width: 15 },
  ], controlRows);

  // ── Sheet 5: Actions ──────────────────────────────────────────────────────
  const actionRows = [];
  controls.forEach((ctrl, idx) => {
    const controlId = ctrl.id || `C${String(idx + 1).padStart(3, '0')}`;
    for (const a of ctrl.actions || []) {
      actionRows.push({
        controlId,
        id:               a.id || '',
        title:            a.title,
        description:      a.description || '',
        evidenceTypes:    (a.evidenceTypes || []).join(', '),
        priority:         a.priority || 'HIGH',
        suggestedDueDays: a.suggestedDueDays ?? 30,
        orderIndex:       a.orderIndex ?? '',
        products:         (a.products || []).join(', '),
      });
    }
  });

  addSheet(wb, '5. Actions', [
    { header: 'controlId *',                                                                          key: 'controlId',        width: 12 },
    { header: 'id',                                                                                   key: 'id',               width: 14 },
    { header: 'title *',                                                                              key: 'title',            width: 45 },
    { header: 'description',                                                                          key: 'description',      width: 65 },
    { header: 'evidenceTypes * (FILE / SCREENSHOT / CONFIG / DOCUMENT / LINK / TEXT_NOTE / LOG)',    key: 'evidenceTypes',    width: 65 },
    { header: 'priority (LOW / MEDIUM / HIGH / CRITICAL)',                                            key: 'priority',         width: 32 },
    { header: 'suggestedDueDays',                                                                     key: 'suggestedDueDays', width: 18 },
    { header: 'orderIndex',                                                                           key: 'orderIndex',       width: 12 },
    { header: 'products (comma-separated product names)',                                             key: 'products',         width: 45 },
  ], actionRows);

  // ── Sheet 6: Product Families ─────────────────────────────────────────────
  const pfRows = [];
  for (const f of productFamilies) {
    for (const p of f.products || []) {
      pfRows.push({
        familyName:         f.name,
        familyDescription:  f.description || '',
        productName:        p.name,
        productVendor:      p.vendor || '',
        productDescription: p.description || '',
      });
    }
  }

  addSheet(wb, '6. Product Families', [
    { header: 'familyName *',       key: 'familyName',         width: 35 },
    { header: 'familyDescription',  key: 'familyDescription',  width: 40 },
    { header: 'productName *',      key: 'productName',        width: 30 },
    { header: 'productVendor',      key: 'productVendor',      width: 25 },
    { header: 'productDescription', key: 'productDescription', width: 40 },
  ], pfRows);

  // ─────────────────────────────────────────────────────────────────────────
  await wb.xlsx.writeFile(OUTPUT);

  console.log('\n✅  Excel generated: master-seed-data.xlsx');
  console.log(`    Regulations : ${regulations.length}`);
  console.log(`    Chapters    : ${chapterRows.length}`);
  console.log(`    Sections    : ${sectionRows.length}`);
  console.log(`    Controls    : ${controls.length}`);
  console.log(`    Actions     : ${actionRows.length}`);
  console.log(`    Products    : ${pfRows.length}`);
  console.log('\nShare master-seed-data.xlsx with the team.');
  console.log('When they return the filled file, run:  node excel-to-json.js\n');
}

main().catch(err => {
  console.error('\n❌  Failed:', err.message);
  process.exit(1);
});
