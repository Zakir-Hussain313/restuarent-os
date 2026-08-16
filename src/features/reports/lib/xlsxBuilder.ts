// src/features/reports/lib/xlsxBuilder.ts

import ExcelJS from "exceljs";
import { formatReportDateRange, formatReportTimestamp } from "./formatReportDate";

const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF1A1814" } };
const ALT_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF5F5F4" } };
const BORDER = { style: "thin" as const, color: { argb: "FFE0DFDD" } };
const MUTED_FONT = { color: { argb: "FF8A8680" } };

export interface XlsxTableOptions {
  rightAlignCols?: number[];
}

export async function createReportWorkbook(title: string, rangeStart: string, rangeEnd: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31) || "Report");
  sheet.columns = [{ width: 26 }, { width: 18 }, { width: 18 }, { width: 18 }];

  let row = 1;

  const titleCell = sheet.getCell(row, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16 };
  row += 1;

  sheet.getCell(row, 1).value = "Period";
  sheet.getCell(row, 1).font = MUTED_FONT;
  sheet.getCell(row, 2).value = formatReportDateRange(rangeStart, rangeEnd);
  row += 1;

  sheet.getCell(row, 1).value = "Generated";
  sheet.getCell(row, 1).font = MUTED_FONT;
  sheet.getCell(row, 2).value = formatReportTimestamp();
  row += 2;

  function addKeyValueSection(heading: string, rows: { label: string; value: string }[]) {
    const headingCell = sheet.getCell(row, 1);
    headingCell.value = heading;
    headingCell.font = { bold: true, size: 13 };
    row += 1;

    for (const r of rows) {
      sheet.getCell(row, 1).value = r.label;
      sheet.getCell(row, 1).font = MUTED_FONT;
      sheet.getCell(row, 2).value = r.value;
      sheet.getCell(row, 2).font = { bold: true };
      row += 1;
    }
    row += 1;
  }

  function addTable(heading: string, headers: string[], rows: (string | number)[][], opts: XlsxTableOptions = {}) {
    const headingCell = sheet.getCell(row, 1);
    headingCell.value = heading;
    headingCell.font = { bold: true, size: 13 };
    row += 1;

    headers.forEach((h, i) => {
      const cell = sheet.getCell(row, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: opts.rightAlignCols?.includes(i) ? "right" : "left" };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
    });
    row += 1;

    rows.forEach((dataRow, rowIdx) => {
      dataRow.forEach((value, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = value;
        cell.alignment = { horizontal: opts.rightAlignCols?.includes(i) ? "right" : "left" };
        cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
        if (rowIdx % 2 === 1) {
          cell.fill = ALT_FILL;
        }
      });
      row += 1;
    });

    row += 1;
  }

  return {
    addKeyValueSection,
    addTable,
    async toBase64(): Promise<string> {
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer).toString("base64");
    },
  };
}