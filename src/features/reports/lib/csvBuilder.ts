// src/features/reports/lib/csvBuilder.ts

import { formatReportDateRange, formatReportTimestamp } from "./formatReportDate";

export type CsvRow = (string | number)[];

export interface CsvSection {
  heading: string;
  rows: CsvRow[];
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvLines(rows: CsvRow[]): string[] {
  return rows.map((row) => row.map(csvEscape).join(","));
}

export function buildReportCsv(
  title: string,
  rangeStart: string,
  rangeEnd: string,
  sections: CsvSection[]
): string {
  const lines: string[] = [];

  lines.push(...toCsvLines([[title]]));
  lines.push(...toCsvLines([["Period", formatReportDateRange(rangeStart, rangeEnd)]]));
  lines.push(...toCsvLines([["Generated", formatReportTimestamp()]]));
  lines.push("");

  for (const section of sections) {
    lines.push(...toCsvLines([[section.heading]]));
    lines.push(...toCsvLines(section.rows));
    lines.push("");
  }

  return lines.join("\n");
}

export function csvToBase64(csv: string): string {
  return Buffer.from(csv, "utf-8").toString("base64");
}