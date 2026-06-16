const ExcelJS = (() => { try { return require('exceljs'); } catch { return require('C:/Users/HARIOM KUMAR/AppData/Roaming/npm/node_modules/exceljs'); } })();
const path = require('path');

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.join(__dirname, 'super-admin-master-data.xlsx'));

  const sheets = ['1. Regulations', '2. Reg Chapters', '3. Reg Sections', '6. Control-Reg Map'];

  for (const sheetName of sheets) {
    const ws = wb.getWorksheet(sheetName);
    if (!ws) { console.log(`\n[${sheetName}] NOT FOUND`); continue; }

    console.log(`\n${'='.repeat(70)}`);
    console.log(`Sheet: ${sheetName}`);
    console.log('='.repeat(70));

    let count = 0;
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip legend
      const cells = [];
      for (let c = 1; c <= Math.min(row.cellCount, 8); c++) {
        let v = row.getCell(c).value;
        if (v && typeof v === 'object' && v.text)   v = v.text;
        if (v && typeof v === 'object' && v.result) v = v.result;
        cells.push(v == null ? '' : String(v).trim());
      }
      // Skip fully empty data rows (not header)
      if (rowNum > 2 && cells.slice(1).every(c => !c)) return;
      count++;
      if (rowNum === 2) {
        console.log('HEADERS:', cells.join(' | '));
        console.log('-'.repeat(70));
      } else {
        console.log(`  Row ${rowNum}: ${cells.join(' | ')}`);
      }
    });
    console.log(`  Total data rows: ${count - 1}`);
  }
}

main().catch(console.error);
