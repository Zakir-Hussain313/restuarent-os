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

  // Auto-sized per column instead of a fixed 4-column layout — different
  // tables in the same sheet have different column counts (4 to 8+), so a
  // hardcoded width array left later columns at Excel's tiny default width.
  const columnMaxLen: number[] = [];
  function trackWidth(colIndex: number, text: string) {
    columnMaxLen[colIndex] = Math.max(columnMaxLen[colIndex] ?? 0, String(text).length);
  }

  let row = 1;

  const titleCell = sheet.getCell(row, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16 };
  row += 1;

  sheet.getCell(row, 1).value = "Period";
  sheet.getCell(row, 1).font = MUTED_FONT;
  sheet.getCell(row, 2).value = formatReportDateRange(rangeStart, rangeEnd);
  trackWidth(0, "Period");
  trackWidth(1, formatReportDateRange(rangeStart, rangeEnd));
  row += 1;

  sheet.getCell(row, 1).value = "Generated";
  sheet.getCell(row, 1).font = MUTED_FONT;
  sheet.getCell(row, 2).value = formatReportTimestamp();
  trackWidth(0, "Generated");
  trackWidth(1, formatReportTimestamp());
  row += 2;

  function addKeyValueSection(heading: string, rows: { label: string; value: string }[]) {
    const headingCell = sheet.getCell(row, 1);
    headingCell.value = heading;
    headingCell.font = { bold: true, size: 13 };
    trackWidth(0, heading);
    row += 1;

    for (const r of rows) {
      sheet.getCell(row, 1).value = r.label;
      sheet.getCell(row, 1).font = MUTED_FONT;
      sheet.getCell(row, 2).value = r.value;
      sheet.getCell(row, 2).font = { bold: true };
      trackWidth(0, r.label);
      trackWidth(1, r.value);
      row += 1;
    }
    row += 1;
  }

  function addTable(heading: string, headers: string[], rows: (string | number)[][], opts: XlsxTableOptions = {}) {
    const headingCell = sheet.getCell(row, 1);
    headingCell.value = heading;
    headingCell.font = { bold: true, size: 13 };
    trackWidth(0, heading);
    row += 1;

    headers.forEach((h, i) => {
      const cell = sheet.getCell(row, i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = HEADER_FILL;
      cell.alignment = { horizontal: opts.rightAlignCols?.includes(i) ? "right" : "left" };
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      trackWidth(i, h);
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
        trackWidth(i, String(value));
      });
      row += 1;
    });

    row += 1;
  }

  return {
    addKeyValueSection,
    addTable,
    async toBase64(): Promise<string> {
      columnMaxLen.forEach((len, i) => {
        sheet.getColumn(i + 1).width = Math.min(Math.max(len + 4, 12), 40);
      });
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer).toString("base64");
    },
  };
}