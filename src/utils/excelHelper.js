const ExcelJS = require("exceljs");

/**
 * Create an Excel workbook with RTL sheets.
 * @param {Array<{name: string, columns: Array<{header: string, key: string, width?: number}>, rows: Array<Object>}>} sheets
 * @returns {Promise<Buffer>} xlsx buffer
 */
const createExcelBuffer = async (sheets) => {
  const workbook = new ExcelJS.Workbook();
  workbook.views = [{ rightToLeft: true }];

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name, {
      views: [{ rightToLeft: true }],
    });

    ws.columns = sheet.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 18,
    }));

    // Style header row
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: "center" };

    for (const row of sheet.rows) {
      ws.addRow(row);
    }
  }

  return workbook.xlsx.writeBuffer();
};

module.exports = { createExcelBuffer };
