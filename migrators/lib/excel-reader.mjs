import ExcelJS from "exceljs";
import { rowsToMenu } from "./rows-to-menu.mjs";

// Reads an Excel file with the same columns as the CSV format: category,
// item_name, description, price, variants, modifiers, image_url. Uses the
// first worksheet only. Converts into the common menu shape via the same
// rowsToMenu() the CSV reader uses — no duplicated grouping/validation logic.
export async function readExcelMenu(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("No worksheet found in the Excel file.");
  }

  const headers = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header row

    const rowObj = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber];
      if (!key) return;
      rowObj[key] = cellValueToString(cell.value);
    });

    const hasContent = Object.values(rowObj).some((v) => v.trim() !== "");
    if (hasContent) rows.push(rowObj);
  });

  return rowsToMenu(rows);
}

// ExcelJS cell values can be a plain value, a formula result object
// ({ formula, result }), rich text ({ richText: [...] }), or a Date.
// Normalize all of these down to the plain string rows-to-menu.mjs expects.
function cellValueToString(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value) {
      return value.richText.map((t) => t.text).join("");
    }
    return "";
  }
  return String(value);
}