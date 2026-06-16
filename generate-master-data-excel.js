/**
 * Generates the Super Admin Master Data Excel workbook from live DB data.
 * Existing DB rows → teal (editable)
 * Empty rows below  → yellow (new entries)
 *
 * Run: node generate-master-data-excel.js
 * Output: super-admin-master-data.xlsx
 */

const ExcelJS = require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs');
const { Pool } = require('pg');
const path = require('path');

const OUT_FILE = path.join(__dirname, 'super-admin-master-data.xlsx');
const DB_URL   = 'postgresql://postgres:hariom@localhost:5433/dpdp_super_admin';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  headerBg  : '1F3864',
  headerFg  : 'FFFFFF',
  existBg   : 'D6EAF8',  // teal-blue  – from DB
  newBg     : 'FFF2CC',  // yellow     – new entry
  optBg     : 'EAF4FB',  // light blue – optional field in new rows
  refBg     : 'E2EFDA',  // green      – FK reference
  enumBg    : 'F4ECFF',  // purple     – dropdown
  actionBg  : 'FDECEA',  // light red  – Action column header
  deleteBg  : 'FADBD8',  // red tint   – row marked for DELETE
  border    : 'BFBFBF',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function applyBorder(cell) {
  cell.border = {
    top:    { style: 'thin', color: { argb: C.border } },
    left:   { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    right:  { style: 'thin', color: { argb: C.border } },
  };
}

function styleHeader(cell, text) {
  cell.value = text;
  cell.font      = { bold: true, color: { argb: C.headerFg }, size: 11 };
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  applyBorder(cell);
}

function styleCell(cell, bgArgb, fromDb = false) {
  cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
  cell.alignment = { vertical: 'middle', wrapText: true };
  if (fromDb) cell.font = { color: { argb: '1A5276' } };
  applyBorder(cell);
}

function addDropdown(ws, col, fromRow, toRow, values) {
  const formula = `"${values.join(',')}"`;
  for (let r = fromRow; r <= toRow; r++) {
    ws.getCell(r, col).dataValidation = {
      type: 'list', allowBlank: true, formulae: [formula],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: 'Please select from the dropdown.',
    };
  }
}

/**
 * colDef: { header, key, width, kind, required, note, dropdown }
 *   kind: 'req' | 'opt' | 'ref' | 'enum'
 *
 * Action column is prepended automatically to every sheet:
 *   blank  = insert (new rows) or update (existing rows)
 *   DELETE = remove from DB on import
 */
function buildSheet(wb, sheetName, colDefs, dbRows = []) {
  // Prepend Action column — offset all data columns by 1
  const ACTION_COL = 1;
  const dataOffset = 1; // data columns start at col 2

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  const totalCols = colDefs.length + 1; // +1 for Action

  // Row 1 – legend
  ws.mergeCells(1, 1, 1, totalCols);
  const leg = ws.getCell(1, 1);
  leg.value = `📋 ${sheetName}    │    🔵 From DB (editable)    🟡 New entry    🟢 Reference    🟣 Dropdown    🔴 Action=DELETE → removes from DB`;
  leg.font      = { bold: true, size: 10, color: { argb: '333333' } };
  leg.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
  leg.alignment = { vertical: 'middle', horizontal: 'left' };
  ws.getRow(1).height = 22;

  // Row 2 – Action header
  ws.getRow(2).height = 30;
  const actionHeader = ws.getCell(2, ACTION_COL);
  actionHeader.value = 'Action';
  actionHeader.font      = { bold: true, color: { argb: 'C0392B' }, size: 11 };
  actionHeader.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.actionBg } };
  actionHeader.alignment = { vertical: 'middle', horizontal: 'center' };
  actionHeader.note      = { texts: [{ text: 'Leave blank to insert/update.\nType DELETE to remove this record from the database on import.' }] };
  applyBorder(actionHeader);
  ws.getColumn(ACTION_COL).width = 12;

  // Row 2 – data column headers
  colDefs.forEach((col, i) => {
    const cell = ws.getCell(2, i + 1 + dataOffset);
    styleHeader(cell, col.header + (col.required ? ' *' : ''));
    if (col.note) cell.note = { texts: [{ text: col.note }] };
    ws.getColumn(i + 1 + dataOffset).width = col.width || 22;
  });

  const kindBg = { req: C.newBg, opt: C.optBg, ref: C.refBg, enum: C.enumBg };
  const EMPTY_ROWS = 300;
  const totalRows  = dbRows.length + EMPTY_ROWS;

  // Action column dropdown (DELETE only) for all data rows
  addDropdown(ws, ACTION_COL, 3, 3 + totalRows - 1, ['DELETE']);

  // ── Existing DB rows (teal) ──────────────────────────────────────────────
  dbRows.forEach((row, ri) => {
    const r = 3 + ri;
    // Action cell
    styleCell(ws.getCell(r, ACTION_COL), C.existBg, false);
    // Data cells
    colDefs.forEach((col, ci) => {
      const cell = ws.getCell(r, ci + 1 + dataOffset);
      let val = row[col.key];
      if (Array.isArray(val)) val = val.join(', ');
      if (val instanceof Date) val = val.toISOString().split('T')[0];
      cell.value = val ?? '';
      styleCell(cell, C.existBg, true);
    });
  });

  // ── Empty rows for new entries ───────────────────────────────────────────
  const newStart = 3 + dbRows.length;
  for (let r = newStart; r < newStart + EMPTY_ROWS; r++) {
    styleCell(ws.getCell(r, ACTION_COL), C.newBg, false);
    colDefs.forEach((col, ci) => {
      styleCell(ws.getCell(r, ci + 1 + dataOffset), kindBg[col.kind] || C.newBg, false);
    });
  }

  // ── Dropdowns for data columns ───────────────────────────────────────────
  colDefs.forEach((col, ci) => {
    if (col.dropdown) {
      addDropdown(ws, ci + 1 + dataOffset, 3, newStart + EMPTY_ROWS - 1, col.dropdown);
    }
  });

  return ws;
}

// ─── DB Queries ───────────────────────────────────────────────────────────────
async function fetchAll(db) {
  const q = (sql) => db.query(sql).then(r => r.rows);

  const [
    regulations,
    chapters,
    sections,
    controlFamilies,
    controls,
    controlRegMap,
    controlFamilyMap,
    predefinedActions,
    productFamilies,
    products,
    actionProductMap,
  ] = await Promise.all([

    // 1. Regulations
    q(`SELECT name, "shortCode", "issuingAuthority", description, jurisdiction,
              TO_CHAR("effectiveDate", 'YYYY-MM-DD') AS "effectiveDate", status
       FROM regulations ORDER BY "createdAt"`),

    // 2. Regulation Chapters  →  resolve regulationShortCode
    q(`SELECT r."shortCode" AS "regulationShortCode", rc.name, rc.title, rc."orderIndex"
       FROM regulation_chapters rc
       JOIN regulations r ON r.id = rc."regulationId"
       ORDER BY r."shortCode", rc."orderIndex"`),

    // 3. Regulation Sections  →  resolve regulationShortCode + chapterName
    q(`SELECT r."shortCode" AS "regulationShortCode",
              rc.name AS "chapterName",
              rs.name, rs.title, rs."orderIndex"
       FROM regulation_sections rs
       JOIN regulation_chapters rc ON rc.id = rs."chapterId"
       JOIN regulations r ON r.id = rc."regulationId"
       ORDER BY r."shortCode", rc."orderIndex", rs."orderIndex"`),

    // 4. Control Families
    q(`SELECT name, description, icon, color, status
       FROM control_families ORDER BY "createdAt"`),

    // 5. Controls
    q(`SELECT title, description, "applicableTo", status
       FROM controls WHERE "isCustom" = false ORDER BY "createdAt"`),

    // 6. Control-Regulation Map  →  human-readable keys
    q(`SELECT c.title AS "controlTitle",
              r."shortCode" AS "regulationShortCode",
              rc.name AS "chapterName",
              rs.name AS "sectionName"
       FROM control_regulations cr
       JOIN controls c ON c.id = cr."controlId"
       JOIN regulations r ON r.id = cr."regulationId"
       LEFT JOIN regulation_chapters rc ON rc.id = cr."chapterId"
       LEFT JOIN regulation_sections rs ON rs.id = cr."sectionId"
       ORDER BY c.title`),

    // 7. Control-Family Map
    q(`SELECT cf.name AS "controlFamilyName", c.title AS "controlTitle"
       FROM control_family_members cfm
       JOIN control_families cf ON cf.id = cfm."controlFamilyId"
       JOIN controls c ON c.id = cfm."controlId"
       ORDER BY cf.name, c.title`),

    // 8. Predefined Actions
    q(`SELECT c.title AS "controlTitle",
              cpa.title, cpa.description,
              cpa."evidenceTypes",
              cpa."suggestedDueDays", cpa.priority, cpa."orderIndex"
       FROM control_predefined_actions cpa
       JOIN controls c ON c.id = cpa."controlId"
       ORDER BY c.title, cpa."orderIndex"`),

    // 9. Product Families
    q(`SELECT name, description, category
       FROM product_families ORDER BY "createdAt"`),

    // 10. Products
    q(`SELECT p.name, p.description, p.vendor, p.website, p.category,
              pf.name AS "productFamilyName"
       FROM products p
       LEFT JOIN product_families pf ON pf.id = p."productFamilyId"
       ORDER BY p."createdAt"`),

    // 11. Action-Product Map
    q(`SELECT c.title AS "controlTitle",
              cpa.title AS "actionTitle",
              p.name AS "productName"
       FROM action_products ap
       JOIN control_predefined_actions cpa ON cpa.id = ap."predefinedActionId"
       JOIN controls c ON c.id = cpa."controlId"
       JOIN products p ON p.id = ap."productId"
       ORDER BY c.title, cpa.title, p.name`),
  ]);

  return {
    regulations, chapters, sections,
    controlFamilies, controls, controlRegMap, controlFamilyMap,
    predefinedActions, productFamilies, products, actionProductMap,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Pool({ connectionString: DB_URL });
  console.log('✅  Connected to dpdp_super_admin');

  const data = await fetchAll(db);
  await db.end();

  console.log(`   regulations          : ${data.regulations.length}`);
  console.log(`   chapters             : ${data.chapters.length}`);
  console.log(`   sections             : ${data.sections.length}`);
  console.log(`   control_families     : ${data.controlFamilies.length}`);
  console.log(`   controls             : ${data.controls.length}`);
  console.log(`   control_reg_map      : ${data.controlRegMap.length}`);
  console.log(`   control_family_map   : ${data.controlFamilyMap.length}`);
  console.log(`   predefined_actions   : ${data.predefinedActions.length}`);
  console.log(`   product_families     : ${data.productFamilies.length}`);
  console.log(`   products             : ${data.products.length}`);
  console.log(`   action_product_map   : ${data.actionProductMap.length}`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DPDP Platform – Super Admin Setup';
  wb.created = new Date();

  // ── 0. Instructions ──────────────────────────────────────────────────────
  const instr = wb.addWorksheet('📖 Instructions');
  instr.getColumn(1).width = 120;
  const lines = [
    ['DPDP Platform – Super Admin Master Data Workbook', true, '1F3864', 'FFFFFF', 16],
    ['', false],
    ['HOW TO USE THIS FILE', true, 'D9E1F2', '1F3864', 12],
    ['1. Fill each sheet IN ORDER (top to bottom in the tab list).', false],
    ['2. Each sheet represents one database table.', false],
    ['', false],
    ['COLOUR LEGEND', true, 'D9E1F2', '1F3864', 12],
    ['   🔵 Blue rows   = Already in database — you can edit any value here', false],
    ['   🟡 Yellow rows = New entry rows — fill these for new records', false],
    ['   🟢 Green cells = Reference field — type the EXACT name/shortCode from another sheet', false],
    ['   🟣 Purple cells = Dropdown field — choose from the provided list', false],
    ['', false],
    ['IMPORTANT RULES', true, 'D9E1F2', '1F3864', 12],
    ['• Blue rows ARE editable. Any change you make here will update that record in the database.', false],
    ['• Do NOT add or remove columns. Do NOT change column headers.', false],
    ['• IDs (UUIDs) are auto-generated — do not add them.', false],
    ['• effectiveDate format: YYYY-MM-DD  (e.g. 2024-08-11)', false],
    ['• evidenceTypes: comma-separated — FILE, SCREENSHOT, CONFIG, DOCUMENT, LINK, TEXT_NOTE, LOG', false],
    ['• Master Evidence (actual files) is uploaded separately via super admin portal.', false],
    ['', false],
    ['FILL ORDER', true, 'D9E1F2', '1F3864', 12],
    ['Step 1  →  Regulations', false],
    ['Step 2  →  Regulation Chapters  (references Regulations)', false],
    ['Step 3  →  Regulation Sections  (references Chapters)', false],
    ['Step 4  →  Control Families', false],
    ['Step 5  →  Controls', false],
    ['Step 6  →  Control-Reg Map      (links Controls ↔ Regulations/Chapters/Sections)', false],
    ['Step 7  →  Control-Family Map   (links Controls ↔ Control Families)', false],
    ['Step 8  →  Predefined Actions   (references Controls)', false],
    ['Step 9  →  Product Families', false],
    ['Step 10 →  Products             (references Product Families)', false],
    ['Step 11 →  Action-Product Map   (links Predefined Actions ↔ Products)', false],
  ];
  lines.forEach(([text, bold, bgArgb, fgArgb, fontSize], i) => {
    const cell = instr.getCell(i + 1, 1);
    cell.value = text;
    cell.font  = { bold: !!bold, size: fontSize || 11, color: { argb: fgArgb || '333333' } };
    if (bgArgb) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
    instr.getRow(i + 1).height = bold ? 24 : 18;
  });

  // ── 1. Regulations ───────────────────────────────────────────────────────
  buildSheet(wb, '1. Regulations', [
    { header: 'Name',              key: 'name',             width: 40, kind: 'req', required: true,  note: 'Full name of the regulation' },
    { header: 'Short Code',        key: 'shortCode',        width: 16, kind: 'req', required: true,  note: 'Unique abbreviation — used as reference key in other sheets (e.g. DPDP)' },
    { header: 'Issuing Authority', key: 'issuingAuthority', width: 36, kind: 'req', required: true  },
    { header: 'Description',       key: 'description',      width: 60, kind: 'req', required: true  },
    { header: 'Jurisdiction',      key: 'jurisdiction',     width: 16, kind: 'opt', required: false, note: 'Default: India' },
    { header: 'Effective Date',    key: 'effectiveDate',    width: 18, kind: 'req', required: true,  note: 'Format: YYYY-MM-DD' },
    { header: 'Status',            key: 'status',           width: 14, kind: 'enum', required: true, dropdown: ['DRAFT','ACTIVE','ARCHIVED'] },
  ], data.regulations);

  // ── 2. Regulation Chapters ───────────────────────────────────────────────
  buildSheet(wb, '2. Reg Chapters', [
    { header: 'Regulation Short Code', key: 'regulationShortCode', width: 22, kind: 'ref', required: true,  note: 'Must match a shortCode from sheet "1. Regulations"' },
    { header: 'Chapter Name',          key: 'name',               width: 22, kind: 'req', required: true  },
    { header: 'Chapter Title',         key: 'title',              width: 40, kind: 'opt', required: false },
    { header: 'Order Index',           key: 'orderIndex',         width: 14, kind: 'req', required: true,  note: 'Display order — start from 1' },
  ], data.chapters);

  // ── 3. Regulation Sections ───────────────────────────────────────────────
  buildSheet(wb, '3. Reg Sections', [
    { header: 'Regulation Short Code', key: 'regulationShortCode', width: 22, kind: 'ref', required: true,  note: 'Must match a shortCode from sheet "1. Regulations"' },
    { header: 'Chapter Name',          key: 'chapterName',         width: 22, kind: 'ref', required: true,  note: 'Must match a Chapter Name from sheet "2. Reg Chapters"' },
    { header: 'Section Name',          key: 'name',                width: 22, kind: 'req', required: true  },
    { header: 'Section Title',         key: 'title',               width: 50, kind: 'opt', required: false },
    { header: 'Order Index',           key: 'orderIndex',          width: 14, kind: 'req', required: true,  note: 'Display order within chapter — start from 1' },
  ], data.sections);

  // ── 4. Control Families ──────────────────────────────────────────────────
  buildSheet(wb, '4. Control Families', [
    { header: 'Name',        key: 'name',        width: 36, kind: 'req',  required: true  },
    { header: 'Description', key: 'description', width: 60, kind: 'opt',  required: false },
    { header: 'Icon',        key: 'icon',        width: 10, kind: 'opt',  required: false, note: 'Emoji or icon, e.g. 🔐' },
    { header: 'Color (Hex)', key: 'color',       width: 16, kind: 'opt',  required: false, note: 'Hex color e.g. #3B82F6' },
    { header: 'Status',      key: 'status',      width: 14, kind: 'enum', required: true,  dropdown: ['ACTIVE','INACTIVE'] },
  ], data.controlFamilies);

  // ── 5. Controls ──────────────────────────────────────────────────────────
  buildSheet(wb, '5. Controls', [
    { header: 'Title',         key: 'title',        width: 50, kind: 'req',  required: true,  note: 'Short name — used as reference key in other sheets' },
    { header: 'Description',   key: 'description',  width: 80, kind: 'req',  required: true  },
    { header: 'Applicable To', key: 'applicableTo', width: 22, kind: 'enum', required: true,  dropdown: ['DATA_FIDUCIARY','SIGNIFICANT_DF','BOTH'] },
    { header: 'Status',        key: 'status',       width: 14, kind: 'enum', required: true,  dropdown: ['DRAFT','PUBLISHED'] },
  ], data.controls);

  // ── 6. Control-Regulation Map ────────────────────────────────────────────
  buildSheet(wb, '6. Control-Reg Map', [
    { header: 'Control Title',         key: 'controlTitle',        width: 50, kind: 'ref', required: true,  note: 'Must match a Title from sheet "5. Controls"' },
    { header: 'Regulation Short Code', key: 'regulationShortCode', width: 22, kind: 'ref', required: true,  note: 'Must match a shortCode from sheet "1. Regulations"' },
    { header: 'Chapter Name',          key: 'chapterName',         width: 22, kind: 'ref', required: false, note: 'Optional. Must match a Chapter Name from sheet "2. Reg Chapters"' },
    { header: 'Section Name',          key: 'sectionName',         width: 22, kind: 'ref', required: false, note: 'Optional. Must match a Section Name from sheet "3. Reg Sections"' },
  ], data.controlRegMap);

  // ── 7. Control-Family Map ────────────────────────────────────────────────
  buildSheet(wb, '7. Control-Family Map', [
    { header: 'Control Family Name', key: 'controlFamilyName', width: 36, kind: 'ref', required: true, note: 'Must match a Name from sheet "4. Control Families"' },
    { header: 'Control Title',       key: 'controlTitle',      width: 50, kind: 'ref', required: true, note: 'Must match a Title from sheet "5. Controls"' },
  ], data.controlFamilyMap);

  // ── 8. Predefined Actions ────────────────────────────────────────────────
  buildSheet(wb, '8. Predefined Actions', [
    { header: 'Control Title',  key: 'controlTitle',     width: 50, kind: 'ref',  required: true,  note: 'Must match a Title from sheet "5. Controls"' },
    { header: 'Action Title',   key: 'title',            width: 50, kind: 'req',  required: true,  note: 'Used as reference key in Action-Product Map' },
    { header: 'Description',    key: 'description',      width: 80, kind: 'req',  required: true  },
    { header: 'Evidence Types', key: 'evidenceTypes',    width: 50, kind: 'req',  required: true,  note: 'Comma-separated: FILE, SCREENSHOT, CONFIG, DOCUMENT, LINK, TEXT_NOTE, LOG' },
    { header: 'Due Days',       key: 'suggestedDueDays', width: 12, kind: 'req',  required: true,  note: 'Number of days from assignment to suggested completion' },
    { header: 'Priority',       key: 'priority',         width: 14, kind: 'enum', required: true,  dropdown: ['LOW','MEDIUM','HIGH','CRITICAL'] },
    { header: 'Order Index',    key: 'orderIndex',       width: 14, kind: 'opt',  required: false, note: 'Display order within the control (start from 1)' },
  ], data.predefinedActions);

  // ── 9. Product Families ──────────────────────────────────────────────────
  buildSheet(wb, '9. Product Families', [
    { header: 'Name',        key: 'name',        width: 36, kind: 'req', required: true,  note: 'Used as reference key in Products sheet' },
    { header: 'Description', key: 'description', width: 60, kind: 'opt', required: false },
    { header: 'Category',    key: 'category',    width: 30, kind: 'opt', required: false, note: 'e.g. IAM, Data Protection, Monitoring, SIEM, Legal, GRC' },
  ], data.productFamilies);

  // ── 10. Products ─────────────────────────────────────────────────────────
  buildSheet(wb, '10. Products', [
    { header: 'Name',                key: 'name',              width: 36, kind: 'req', required: true,  note: 'Used as reference key in Action-Product Map' },
    { header: 'Description',         key: 'description',       width: 60, kind: 'opt', required: false },
    { header: 'Vendor',              key: 'vendor',            width: 24, kind: 'opt', required: false },
    { header: 'Website URL',         key: 'website',           width: 36, kind: 'opt', required: false },
    { header: 'Category',            key: 'category',          width: 24, kind: 'opt', required: false },
    { header: 'Product Family Name', key: 'productFamilyName', width: 36, kind: 'ref', required: false, note: 'Optional. Must match a Name from sheet "9. Product Families"' },
  ], data.products);

  // ── 11. Action-Product Map ───────────────────────────────────────────────
  buildSheet(wb, '11. Action-Product Map', [
    { header: 'Control Title',  key: 'controlTitle',  width: 50, kind: 'ref', required: true, note: 'Helps identify the action — must match a Title from sheet "5. Controls"' },
    { header: 'Action Title',   key: 'actionTitle',   width: 50, kind: 'ref', required: true, note: 'Must match an Action Title from sheet "8. Predefined Actions"' },
    { header: 'Product Name',   key: 'productName',   width: 36, kind: 'ref', required: true, note: 'Must match a Name from sheet "10. Products"' },
  ], data.actionProductMap);

  await wb.xlsx.writeFile(OUT_FILE);
  console.log(`\n✅  Workbook written → ${OUT_FILE}`);
  console.log(`   Total DB rows loaded : ${
    data.regulations.length + data.chapters.length + data.sections.length +
    data.controlFamilies.length + data.controls.length + data.controlRegMap.length +
    data.controlFamilyMap.length + data.predefinedActions.length +
    data.productFamilies.length + data.products.length + data.actionProductMap.length
  }`);
}

main().catch(err => { console.error(err); process.exit(1); });
