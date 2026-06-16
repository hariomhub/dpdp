const ExcelJS = (() => { try { return require('exceljs'); } catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); } })();
const path = require('path');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'super-admin-master-data.xlsx'));

  // Read controls sheet
  const ws5 = wb.getWorksheet('5. Controls');
  const controlTitles = new Set();
  if (ws5) {
    ws5.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      const action = String(row.getCell(1).value || '').trim().toUpperCase();
      let title = String(row.getCell(2).value || '').trim();
      if (title) controlTitles.add(title);
    });
  }
  console.log('\n=== Controls in Sheet 5 ===');
  [...controlTitles].sort().forEach(t => console.log(`  "${t}"`));
  console.log(`Total: ${controlTitles.size}`);

  // Read control-reg map and check which titles DON'T match controls
  const ws6 = wb.getWorksheet('6. Control-Reg Map');
  const missing = [];
  const matched = [];
  if (ws6) {
    ws6.eachRow((row, rowNum) => {
      if (rowNum <= 2) return;
      const action = String(row.getCell(1).value || '').trim().toUpperCase();
      let title = String(row.getCell(2).value || '').trim();
      let reg   = String(row.getCell(3).value || '').trim();
      let ch    = String(row.getCell(4).value || '').trim();
      if (!title) return;
      if (controlTitles.has(title)) {
        matched.push({ title, reg, ch });
      } else {
        missing.push({ title, reg });
      }
    });
  }

  console.log('\n=== Titles in Control-Reg Map that DO NOT match any control ===');
  missing.forEach(m => console.log(`  MISSING: "${m.title}" (reg: ${m.reg})`));
  console.log(`  Total missing: ${missing.length}`);

  console.log('\n=== Titles in Control-Reg Map that MATCH a control ===');
  matched.forEach(m => console.log(`  OK: "${m.title}" → ${m.reg} / ${m.ch}`));
  console.log(`  Total matched: ${matched.length}`);
}

main().catch(console.error);
