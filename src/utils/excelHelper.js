const ExcelJS = require("exceljs");
const { toHijriISO, formatGregorianDateTime } = require("./hijri");

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

/**
 * Give every date column a Hijri twin placed right after it.
 * Row values may be "YYYY-MM-DD" strings (date-only fields) or Date objects
 * (timestamps, written out as Riyadh local time). Rows are updated in place.
 * @returns {Array} the new column list
 */
const withHijriColumns = (columns, rows, dateKeys) => {
  const keys = new Set(dateKeys);

  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      row[`${key}_hijri`] = toHijriISO(value);
      if (value instanceof Date) row[key] = formatGregorianDateTime(value);
    }
  }

  return columns.flatMap((col) =>
    keys.has(col.key)
      ? [
          { ...col, header: `${col.header} (ميلادي)` },
          { ...col, header: `${col.header} (هجري)`, key: `${col.key}_hijri` },
        ]
      : [col]
  );
};

module.exports = { createExcelBuffer, withHijriColumns };
