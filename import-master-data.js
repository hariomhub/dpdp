/**
 * Super Admin Master Data Importer
 *
 * Reads super-admin-master-data.xlsx and syncs to the database.
 *
 * Usage:
 *   node import-master-data.js              → local DB (localhost:5433)
 *   node import-master-data.js --db=azure   → Azure DB (reads from .env.azure)
 *
 * Action column rules (first column in every sheet):
 *   blank   → INSERT if new row, UPDATE if existing row
 *   DELETE  → remove from DB
 */

const ExcelJS  = (() => { try { return require('exceljs'); } catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); } })();
const { Pool } = require('pg');
const { randomUUID } = require('crypto');
const path = require('path');
const fs   = require('fs');

// ─── Config ───────────────────────────────────────────────────────────────────
const EXCEL_FILE = path.join(__dirname, 'super-admin-master-data.xlsx');

function getAzureUrl() {
  const envFile = path.join(__dirname, '.env.azure');
  if (fs.existsSync(envFile)) {
    const line = fs.readFileSync(envFile, 'utf8')
      .split('\n')
      .find(l => l.startsWith('AZURE_SUPER_ADMIN_DATABASE_URL='));
    if (line) return line.split('=').slice(1).join('=').replace(/^"|"$/g, '').trim();
  }
  return process.env.AZURE_SUPER_ADMIN_DATABASE_URL;
}

const DB_URLS = {
  local: 'postgresql://postgres:hariom@localhost:5433/dpdp_super_admin',
  azure: getAzureUrl(),
};

const dbFlag = (process.argv.find(a => a.startsWith('--db='))?.split('=')[1] || 'local');
const DB_URL = DB_URLS[dbFlag];

if (!DB_URL) {
  console.error(`\n❌  No connection string found for --db=${dbFlag}`);
  console.error(`   For Azure: create .env.azure in project root with:`);
  console.error(`   AZURE_SUPER_ADMIN_DATABASE_URL=postgresql://...`);
  process.exit(1);
}

// ─── Summary tracker ──────────────────────────────────────────────────────────
const summary = {};
function track(table, op) {
  if (!summary[table]) summary[table] = { inserted: 0, updated: 0, deleted: 0, skipped: 0 };
  summary[table][op]++;
}

// ─── Read a sheet → array of { action, cols[] } ───────────────────────────────
// Skips row 1 (legend), row 2 (headers), and fully empty rows
function readSheet(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) {
    console.warn(`   ⚠️  Sheet "${sheetName}" not found — skipping`);
    return [];
  }
  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const action = String(row.getCell(1).value || '').trim().toUpperCase();
    const cols = [];
    let hasData = false;
    for (let c = 2; c <= Math.max(row.cellCount, 12); c++) {
      let v = row.getCell(c).value;
      if (v && typeof v === 'object' && v.text)   v = v.text;    // rich text
      if (v && typeof v === 'object' && v.result) v = v.result;  // formula
      const str = v == null ? '' : String(v).trim();
      if (str) hasData = true;
      cols.push(str);
    }
    if (!hasData && action !== 'DELETE') return; // skip fully empty rows
    rows.push({ action, cols });
  });
  return rows;
}

function c(cols, i) { return (cols[i] || '').trim(); }

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log(`  DPDP Super Admin — Master Data Importer`);
  console.log(`  Target : ${dbFlag.toUpperCase()} DB`);
  console.log(`  File   : ${path.basename(EXCEL_FILE)}`);
  console.log('═'.repeat(60) + '\n');

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌  Excel file not found: ${EXCEL_FILE}`);
    process.exit(1);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_FILE);
  console.log('✅  Excel file loaded\n');

  const db = new Pool({ connectionString: DB_URL });

  // ── Pre-load existing IDs from DB into maps ────────────────────────────────
  // Maps resolve human-readable references (name/shortCode) → UUID
  console.log('🔄  Loading existing IDs from DB...');
  const maps = {
    regulations:     {},  // shortCode → id
    chapters:        {},  // `${shortCode}||${name}` → id
    sections:        {},  // `${shortCode}||${chapter}||${name}` → id
    controlFamilies: {},  // name → id
    controls:        {},  // title → id
    predActions:     {},  // `${controlId}||${title}` → id
    productFamilies: {},  // name → id
    products:        {},  // name → id
  };

  (await db.query('SELECT id, "shortCode" FROM regulations')).rows
    .forEach(r => { maps.regulations[r.shortCode] = r.id; });

  (await db.query(`SELECT rc.id, r."shortCode", rc.name FROM regulation_chapters rc
                   JOIN regulations r ON r.id = rc."regulationId"`)).rows
    .forEach(r => { maps.chapters[`${r.shortCode}||${r.name}`] = r.id; });

  (await db.query(`SELECT rs.id, r."shortCode", rc.name AS chapter, rs.name FROM regulation_sections rs
                   JOIN regulation_chapters rc ON rc.id = rs."chapterId"
                   JOIN regulations r ON r.id = rc."regulationId"`)).rows
    .forEach(r => { maps.sections[`${r.shortCode}||${r.chapter}||${r.name}`] = r.id; });

  (await db.query('SELECT id, name FROM control_families')).rows
    .forEach(r => { maps.controlFamilies[r.name] = r.id; });

  (await db.query('SELECT id, title FROM controls WHERE "isCustom" = false AND "tenantId" IS NULL')).rows
    .forEach(r => { maps.controls[r.title] = r.id; });

  (await db.query(`SELECT cpa.id, cpa."controlId", cpa.title FROM control_predefined_actions cpa`)).rows
    .forEach(r => { maps.predActions[`${r.controlId}||${r.title}`] = r.id; });

  (await db.query('SELECT id, name FROM product_families')).rows
    .forEach(r => { maps.productFamilies[r.name] = r.id; });

  (await db.query('SELECT id, name FROM products')).rows
    .forEach(r => { maps.products[r.name] = r.id; });

  console.log('✅  ID maps loaded\n');

  // ── 1. Regulations ─────────────────────────────────────────────────────────
  console.log('📋  [1/11] Regulations...');
  for (const { action, cols } of readSheet(wb, '1. Regulations')) {
    const [name, shortCode, issuingAuthority, description, jurisdiction, effectiveDate, status] = cols;
    if (!shortCode) { track('regulations', 'skipped'); continue; }

    if (action === 'DELETE') {
      const id = maps.regulations[shortCode];
      if (id) { await db.query('DELETE FROM regulations WHERE id=$1', [id]); delete maps.regulations[shortCode]; }
      track('regulations', 'deleted'); continue;
    }

    const existing = maps.regulations[shortCode];
    if (existing) {
      await db.query(
        `UPDATE regulations SET name=$1,"issuingAuthority"=$2,description=$3,jurisdiction=$4,"effectiveDate"=$5,status=$6,"updatedAt"=NOW() WHERE id=$7`,
        [name, issuingAuthority, description, jurisdiction || 'India', effectiveDate || null, status || 'DRAFT', existing]
      );
      track('regulations', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO regulations (id,name,"shortCode","issuingAuthority",description,jurisdiction,"effectiveDate",status,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
        [id, name, shortCode, issuingAuthority, description, jurisdiction || 'India', effectiveDate || null, status || 'DRAFT']
      );
      maps.regulations[shortCode] = id;
      track('regulations', 'inserted');
    }
  }

  // ── 2. Regulation Chapters ─────────────────────────────────────────────────
  console.log('📋  [2/11] Regulation Chapters...');
  for (const { action, cols } of readSheet(wb, '2. Reg Chapters')) {
    const [regShortCode, name, title, orderIndexStr] = cols;
    const regulationId = maps.regulations[regShortCode];
    if (!regulationId || !name) { track('regulation_chapters', 'skipped'); continue; }

    const key = `${regShortCode}||${name}`;
    if (action === 'DELETE') {
      const id = maps.chapters[key];
      if (id) { await db.query('DELETE FROM regulation_chapters WHERE id=$1', [id]); delete maps.chapters[key]; }
      track('regulation_chapters', 'deleted'); continue;
    }

    const orderIndex = parseInt(orderIndexStr) || 0;
    const existing = maps.chapters[key];
    if (existing) {
      await db.query(
        `UPDATE regulation_chapters SET title=$1,"orderIndex"=$2,"updatedAt"=NOW() WHERE id=$3`,
        [title || null, orderIndex, existing]
      );
      track('regulation_chapters', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO regulation_chapters (id,"regulationId",name,title,"orderIndex","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [id, regulationId, name, title || null, orderIndex]
      );
      maps.chapters[key] = id;
      track('regulation_chapters', 'inserted');
    }
  }

  // ── 3. Regulation Sections ─────────────────────────────────────────────────
  console.log('📋  [3/11] Regulation Sections...');
  for (const { action, cols } of readSheet(wb, '3. Reg Sections')) {
    const [regShortCode, chapterName, name, title, orderIndexStr] = cols;
    const chapterId = maps.chapters[`${regShortCode}||${chapterName}`];
    if (!chapterId || !name) { track('regulation_sections', 'skipped'); continue; }

    const key = `${regShortCode}||${chapterName}||${name}`;
    if (action === 'DELETE') {
      const id = maps.sections[key];
      if (id) { await db.query('DELETE FROM regulation_sections WHERE id=$1', [id]); delete maps.sections[key]; }
      track('regulation_sections', 'deleted'); continue;
    }

    const orderIndex = parseInt(orderIndexStr) || 0;
    const existing = maps.sections[key];
    if (existing) {
      await db.query(
        `UPDATE regulation_sections SET title=$1,"orderIndex"=$2,"updatedAt"=NOW() WHERE id=$3`,
        [title || null, orderIndex, existing]
      );
      track('regulation_sections', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO regulation_sections (id,"chapterId",name,title,"orderIndex","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
        [id, chapterId, name, title || null, orderIndex]
      );
      maps.sections[key] = id;
      track('regulation_sections', 'inserted');
    }
  }

  // ── 4. Control Families ────────────────────────────────────────────────────
  console.log('📋  [4/11] Control Families...');
  for (const { action, cols } of readSheet(wb, '4. Control Families')) {
    const [name, description, icon, color, status] = cols;
    if (!name) { track('control_families', 'skipped'); continue; }

    if (action === 'DELETE') {
      const id = maps.controlFamilies[name];
      if (id) { await db.query('DELETE FROM control_families WHERE id=$1', [id]); delete maps.controlFamilies[name]; }
      track('control_families', 'deleted'); continue;
    }

    const existing = maps.controlFamilies[name];
    if (existing) {
      await db.query(
        `UPDATE control_families SET description=$1,icon=$2,color=$3,status=$4,"updatedAt"=NOW() WHERE id=$5`,
        [description || null, icon || null, color || null, status || 'ACTIVE', existing]
      );
      track('control_families', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO control_families (id,name,description,icon,color,status,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
        [id, name, description || null, icon || null, color || null, status || 'ACTIVE']
      );
      maps.controlFamilies[name] = id;
      track('control_families', 'inserted');
    }
  }

  // ── 5. Controls ────────────────────────────────────────────────────────────
  console.log('📋  [5/11] Controls...');
  for (const { action, cols } of readSheet(wb, '5. Controls')) {
    const [title, description, applicableTo, status] = cols;
    if (!title) { track('controls', 'skipped'); continue; }

    if (action === 'DELETE') {
      const id = maps.controls[title];
      if (id) { await db.query('DELETE FROM controls WHERE id=$1', [id]); delete maps.controls[title]; }
      track('controls', 'deleted'); continue;
    }

    const existing = maps.controls[title];
    if (existing) {
      await db.query(
        `UPDATE controls SET description=$1,"applicableTo"=$2::\"ApplicableTo\",status=$3::\"ControlStatus\","updatedAt"=NOW() WHERE id=$4`,
        [description, applicableTo || 'BOTH', status || 'DRAFT', existing]
      );
      track('controls', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO controls (id,title,description,"applicableTo","status","isCustom","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4::\"ApplicableTo\",$5::\"ControlStatus\",false,NOW(),NOW())`,
        [id, title, description, applicableTo || 'BOTH', status || 'DRAFT']
      );
      maps.controls[title] = id;
      track('controls', 'inserted');
    }
  }

  // ── 6. Control-Regulation Map ──────────────────────────────────────────────
  console.log('📋  [6/11] Control-Regulation Map...');
  for (const { action, cols } of readSheet(wb, '6. Control-Reg Map')) {
    try {
      const [controlTitle, regShortCode, chapterName, sectionName] = cols;
      const controlId    = maps.controls[controlTitle];
      const regulationId = maps.regulations[regShortCode];
      if (!controlId || !regulationId) { track('control_regulations', 'skipped'); continue; }

      const chapterId = (chapterName && maps.chapters[`${regShortCode}||${chapterName}`]) || null;
      const sectionId = (sectionName && maps.sections[`${regShortCode}||${chapterName}||${sectionName}`]) || null;

      if (action === 'DELETE') {
        await db.query(
          'DELETE FROM control_regulations WHERE "controlId"=$1 AND "regulationId"=$2',
          [controlId, regulationId]
        );
        track('control_regulations', 'deleted'); continue;
      }

      await db.query(
        `INSERT INTO control_regulations ("controlId","regulationId","chapterId","sectionId")
         VALUES ($1,$2,$3,$4)
         ON CONFLICT ("controlId","regulationId") DO UPDATE SET "chapterId"=$3,"sectionId"=$4`,
        [controlId, regulationId, chapterId, sectionId]
      );
      track('control_regulations', 'inserted');
    } catch (err) {
      console.warn(`   ⚠️  Skipped row in Control-Reg Map: ${err.message}`);
      track('control_regulations', 'skipped');
    }
  }

  // ── 7. Control-Family Map ──────────────────────────────────────────────────
  console.log('📋  [7/11] Control-Family Map...');
  for (const { action, cols } of readSheet(wb, '7. Control-Family Map')) {
    const [familyName, controlTitle] = cols;
    const controlFamilyId = maps.controlFamilies[familyName];
    const controlId       = maps.controls[controlTitle];
    if (!controlFamilyId || !controlId) { track('control_family_members', 'skipped'); continue; }

    if (action === 'DELETE') {
      await db.query(
        'DELETE FROM control_family_members WHERE "controlFamilyId"=$1 AND "controlId"=$2',
        [controlFamilyId, controlId]
      );
      track('control_family_members', 'deleted'); continue;
    }

    await db.query(
      `INSERT INTO control_family_members ("controlFamilyId","controlId","addedAt")
       VALUES ($1,$2,NOW()) ON CONFLICT ("controlFamilyId","controlId") DO NOTHING`,
      [controlFamilyId, controlId]
    );
    track('control_family_members', 'inserted');
  }

  // ── 8. Predefined Actions ──────────────────────────────────────────────────
  console.log('📋  [8/11] Predefined Actions...');
  for (const { action, cols } of readSheet(wb, '8. Predefined Actions')) {
    const [controlTitle, title, description, evidenceTypesStr, dueDaysStr, priority, orderIndexStr] = cols;
    const controlId = maps.controls[controlTitle];
    if (!controlId || !title) { track('control_predefined_actions', 'skipped'); continue; }

    const mapKey = `${controlId}||${title}`;
    // Build PostgreSQL array literal string — pg can't auto-cast JS arrays to custom enum arrays
    // Strip any existing {} braces the Excel may already contain, then re-wrap once
    const rawTypes = evidenceTypesStr ? evidenceTypesStr.trim().replace(/^\{/, '').replace(/\}$/, '') : '';
    const evidenceTypes = rawTypes
      ? `{${rawTypes.split(',').map(s => s.trim()).filter(Boolean).join(',')}}`
      : '{}';
    const suggestedDueDays = parseInt(dueDaysStr) || 30;
    const orderIndex       = parseInt(orderIndexStr) || 0;

    if (action === 'DELETE') {
      const id = maps.predActions[mapKey];
      if (id) { await db.query('DELETE FROM control_predefined_actions WHERE id=$1', [id]); delete maps.predActions[mapKey]; }
      track('control_predefined_actions', 'deleted'); continue;
    }

    const existing = maps.predActions[mapKey];
    if (existing) {
      await db.query(
        `UPDATE control_predefined_actions SET description=$1,"evidenceTypes"=$2::"EvidenceType"[],"suggestedDueDays"=$3,priority=$4::\"Priority\","orderIndex"=$5,"updatedAt"=NOW() WHERE id=$6`,
        [description, evidenceTypes, suggestedDueDays, priority || 'HIGH', orderIndex, existing]
      );
      track('control_predefined_actions', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO control_predefined_actions (id,"controlId",title,description,"evidenceTypes","suggestedDueDays",priority,"orderIndex","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5::"EvidenceType"[],$6,$7::\"Priority\",$8,NOW(),NOW())`,
        [id, controlId, title, description, evidenceTypes, suggestedDueDays, priority || 'HIGH', orderIndex]
      );
      maps.predActions[mapKey] = id;
      track('control_predefined_actions', 'inserted');
    }
  }

  // ── 9. Product Families ────────────────────────────────────────────────────
  console.log('📋  [9/11] Product Families...');
  for (const { action, cols } of readSheet(wb, '9. Product Families')) {
    const [name, description, category] = cols;
    if (!name) { track('product_families', 'skipped'); continue; }

    if (action === 'DELETE') {
      const id = maps.productFamilies[name];
      if (id) { await db.query('DELETE FROM product_families WHERE id=$1', [id]); delete maps.productFamilies[name]; }
      track('product_families', 'deleted'); continue;
    }

    const existing = maps.productFamilies[name];
    if (existing) {
      await db.query(
        `UPDATE product_families SET description=$1,category=$2,"updatedAt"=NOW() WHERE id=$3`,
        [description || null, category || null, existing]
      );
      track('product_families', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO product_families (id,name,description,category,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,NOW(),NOW())`,
        [id, name, description || null, category || null]
      );
      maps.productFamilies[name] = id;
      track('product_families', 'inserted');
    }
  }

  // ── 10. Products ───────────────────────────────────────────────────────────
  console.log('📋  [10/11] Products...');
  for (const { action, cols } of readSheet(wb, '10. Products')) {
    const [name, description, vendor, website, category, productFamilyName] = cols;
    if (!name) { track('products', 'skipped'); continue; }

    const productFamilyId = productFamilyName ? maps.productFamilies[productFamilyName] : null;

    if (action === 'DELETE') {
      const id = maps.products[name];
      if (id) { await db.query('DELETE FROM products WHERE id=$1', [id]); delete maps.products[name]; }
      track('products', 'deleted'); continue;
    }

    const existing = maps.products[name];
    if (existing) {
      await db.query(
        `UPDATE products SET description=$1,vendor=$2,website=$3,category=$4,"productFamilyId"=$5,"updatedAt"=NOW() WHERE id=$6`,
        [description || null, vendor || null, website || null, category || null, productFamilyId || null, existing]
      );
      track('products', 'updated');
    } else {
      const id = randomUUID();
      await db.query(
        `INSERT INTO products (id,name,description,vendor,website,category,"productFamilyId","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())`,
        [id, name, description || null, vendor || null, website || null, category || null, productFamilyId || null]
      );
      maps.products[name] = id;
      track('products', 'inserted');
    }
  }

  // ── 11. Action-Product Map ─────────────────────────────────────────────────
  console.log('📋  [11/11] Action-Product Map...');
  for (const { action, cols } of readSheet(wb, '11. Action-Product Map')) {
    const [controlTitle, actionTitle, productName] = cols;
    const controlId    = maps.controls[controlTitle];
    const predActionId = controlId ? maps.predActions[`${controlId}||${actionTitle}`] : null;
    const productId    = maps.products[productName];
    if (!predActionId || !productId) { track('action_products', 'skipped'); continue; }

    if (action === 'DELETE') {
      await db.query(
        'DELETE FROM action_products WHERE "predefinedActionId"=$1 AND "productId"=$2',
        [predActionId, productId]
      );
      track('action_products', 'deleted'); continue;
    }

    await db.query(
      `INSERT INTO action_products ("predefinedActionId","productId","addedAt")
       VALUES ($1,$2,NOW()) ON CONFLICT ("predefinedActionId","productId") DO NOTHING`,
      [predActionId, productId]
    );
    track('action_products', 'inserted');
  }

  await db.end();

  // ── Summary ────────────────────────────────────────────────────────────────
  const W = 28;
  console.log('\n' + '═'.repeat(72));
  console.log('  IMPORT COMPLETE\n');
  console.log(`  ${'Table'.padEnd(W)} ${'Inserted'.padStart(8)} ${'Updated'.padStart(8)} ${'Deleted'.padStart(8)} ${'Skipped'.padStart(8)}`);
  console.log('  ' + '─'.repeat(68));
  let totIns = 0, totUpd = 0, totDel = 0, totSkp = 0;
  for (const [table, cnt] of Object.entries(summary)) {
    console.log(`  ${table.padEnd(W)} ${String(cnt.inserted).padStart(8)} ${String(cnt.updated).padStart(8)} ${String(cnt.deleted).padStart(8)} ${String(cnt.skipped).padStart(8)}`);
    totIns += cnt.inserted; totUpd += cnt.updated; totDel += cnt.deleted; totSkp += cnt.skipped;
  }
  console.log('  ' + '─'.repeat(68));
  console.log(`  ${'TOTAL'.padEnd(W)} ${String(totIns).padStart(8)} ${String(totUpd).padStart(8)} ${String(totDel).padStart(8)} ${String(totSkp).padStart(8)}`);
  console.log('═'.repeat(72) + '\n');
}

main().catch(err => {
  console.error('\n❌  Import failed:', err.message);
  console.error(err);
  process.exit(1);
});
