const ExcelJS = (() => { try { return require('exceljs'); } catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); } })();
const path = require('path');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'super-admin-master-data.xlsx'));

  const ws = wb.getWorksheet('3. Reg Sections');
  if (!ws) { console.log('Sheet not found'); return; }

  // Pre-build chapter keys from sheet 2
  const chaptersSheet = wb.getWorksheet('2. Reg Chapters');
  const chapterKeys = new Set();
  chaptersSheet.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const action = String(row.getCell(1).value || '').trim().toUpperCase();
    if (action === 'DELETE') return;
    const regSC  = String(row.getCell(2).value || '').trim();
    const chName = String(row.getCell(3).value || '').trim();
    if (regSC && chName) chapterKeys.add(`${regSC}||${chName}`);
  });
  console.log('\nValid chapter keys:', [...chapterKeys]);

  console.log('\n=== Sections Analysis ===');
  let imported = 0, skipped = 0;
  const skippedRows = [];

  ws.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const action   = String(row.getCell(1).value || '').trim().toUpperCase();
    const regSC    = String(row.getCell(2).value || '').trim();
    const chName   = String(row.getCell(3).value || '').trim();
    const secName  = String(row.getCell(4).value || '').trim();
    const secTitle = String(row.getCell(5).value || '').trim();

    if (!secName && action !== 'DELETE') return; // empty row

    const chapterKey = `${regSC}||${chName}`;
    const chapterId  = chapterKeys.has(chapterKey);

    if (!chapterId || !secName) {
      skipped++;
      skippedRows.push({ rowNum, action, regSC: regSC || '(empty)', chName, secName, secTitle });
    } else {
      imported++;
      console.log(`  ✅ Row ${rowNum}: ${regSC}||${chName}||${secName} [${action || 'UPSERT'}]`);
    }
  });

  console.log(`\n  Total IMPORTED: ${imported}`);
  console.log(`  Total SKIPPED:  ${skipped}`);

  console.log('\n=== SKIPPED Rows (need fixing) ===');
  skippedRows.forEach(r => {
    const reason = !r.regSC || r.regSC === '(empty)' ? 'MISSING regShortCode' :
                   !chapterKeys.has(`${r.regSC}||${r.chName}`) ? `Chapter "${r.chName}" not found for "${r.regSC}"` :
                   'missing section name';
    console.log(`  Row ${r.rowNum} [${r.action || 'UPSERT'}]: ${r.regSC}||${r.chName}||${r.secName} → ${reason}`);
  });

  // Also check Control-Reg Map: how many controls have missing sections?
  const mapsections = {};
  // Build simulated maps.sections from what WOULD be imported
  ws.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const action   = String(row.getCell(1).value || '').trim().toUpperCase();
    if (action === 'DELETE') return;
    const regSC    = String(row.getCell(2).value || '').trim();
    const chName   = String(row.getCell(3).value || '').trim();
    const secName  = String(row.getCell(4).value || '').trim();
    const chapterKey = `${regSC}||${chName}`;
    if (chapterKeys.has(chapterKey) && secName) {
      mapsections[`${regSC}||${chName}||${secName}`] = 'UUID';
    }
  });

  const mapSheet6 = wb.getWorksheet('6. Control-Reg Map');
  let ctrlMissingSection = 0, ctrlHasSection = 0;
  mapSheet6.eachRow((row, rowNum) => {
    if (rowNum <= 2) return;
    const ctrlTitle = String(row.getCell(2).value || '').trim();
    const regSC     = String(row.getCell(3).value || '').trim();
    const chName    = String(row.getCell(4).value || '').trim();
    const secName   = String(row.getCell(5).value || '').trim();
    if (!ctrlTitle) return;
    if (!secName) return; // no section requested
    const key = `${regSC}||${chName}||${secName}`;
    if (mapsections[key]) {
      ctrlHasSection++;
    } else {
      ctrlMissingSection++;
      console.log(`  ⚠️  Control "${ctrlTitle}": section key "${key}" NOT in DB`);
    }
  });
  console.log(`\n=== Control-Reg Map section resolution ===`);
  console.log(`  Controls with valid section: ${ctrlHasSection}`);
  console.log(`  Controls with missing section: ${ctrlMissingSection}`);
}

main().catch(console.error);
