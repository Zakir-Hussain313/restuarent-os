// src/features/reports/lib/pdfBuilder.ts

import fs from "fs";
import path from "path";
import { RESTAURANT_CONFIG } from "@/config/restaurant";
import { formatReportDateRange, formatReportTimestamp } from "./formatReportDate";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const ROW_HEIGHT = 22;
const HEADER_ROW_HEIGHT = 24;

const COLOR_TEXT = { r: 0.1, g: 0.09, b: 0.08 };
const COLOR_MUTED = { r: 0.54, g: 0.52, b: 0.5 };
const COLOR_HEADER_BG = { r: 0.1, g: 0.09, b: 0.08 };
const COLOR_HEADER_TEXT = { r: 1, g: 1, b: 1 };
const COLOR_ROW_ALT_BG = { r: 0.96, g: 0.96, b: 0.95 };
const COLOR_BORDER = { r: 0.85, g: 0.84, b: 0.82 };

export interface PdfTableOptions {
  colWidths?: number[];
  rightAlignCols?: number[];
}

export async function createReportPdf(title: string, rangeStart: string, rangeEnd: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  const logoFilename = process.env.RESTAURANT_LOGO_FILENAME || "logo.png";
  try {
    const logoPath = path.join(process.cwd(), "public", logoFilename);
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = logoFilename.toLowerCase().endsWith(".jpg") || logoFilename.toLowerCase().endsWith(".jpeg")
      ? await pdfDoc.embedJpg(logoBytes)
      : await pdfDoc.embedPng(logoBytes);
  } catch {
    logoImage = null;
  }

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function toRgb(c: { r: number; g: number; b: number }) {
    return rgb(c.r, c.g, c.b);
  }

  function drawHeader() {
    const logoSize = 32;
    let textX = MARGIN;

    if (logoImage) {
      const dims = logoImage.scale(1);
      const scale = logoSize / Math.max(dims.width, dims.height);
      page.drawImage(logoImage, {
        x: MARGIN,
        y: y - logoSize,
        width: dims.width * scale,
        height: dims.height * scale,
      });
      textX = MARGIN + logoSize + 10;
    }

    page.drawText(RESTAURANT_CONFIG.name || "Restaurant", {
      x: textX,
      y: y - 12,
      size: 14,
      font: boldFont,
      color: toRgb(COLOR_TEXT),
    });
    page.drawText(RESTAURANT_CONFIG.tagline, {
      x: textX,
      y: y - 26,
      size: 9,
      font,
      color: toRgb(COLOR_MUTED),
    });

    y -= logoSize + 20;

    page.drawText(title, {
      x: MARGIN,
      y,
      size: 18,
      font: boldFont,
      color: toRgb(COLOR_TEXT),
    });
    y -= 20;

    page.drawText(`Period: ${formatReportDateRange(rangeStart, rangeEnd)}`, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: toRgb(COLOR_MUTED),
    });
    y -= 25;
  }

  function drawFooters() {
    const pages = pdfDoc.getPages();
    const generatedAt = formatReportTimestamp();
    pages.forEach((p, idx) => {
      p.drawText(`Generated on ${generatedAt}`, {
        x: MARGIN,
        y: MARGIN - 20,
        size: 8,
        font,
        color: toRgb(COLOR_MUTED),
      });
      p.drawText(`Page ${idx + 1} of ${pages.length}`, {
        x: PAGE_WIDTH - MARGIN - 60,
        y: MARGIN - 20,
        size: 8,
        font,
        color: toRgb(COLOR_MUTED),
      });
    });
  }

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawSectionHeading(heading: string) {
    ensureSpace(30);
    page.drawText(heading, {
      x: MARGIN,
      y,
      size: 13,
      font: boldFont,
      color: toRgb(COLOR_TEXT),
    });
    y -= 20;
  }

  function drawKeyValueSection(heading: string, rows: { label: string; value: string }[]) {
    drawSectionHeading(heading);
    for (const row of rows) {
      ensureSpace(ROW_HEIGHT);
      page.drawText(row.label, {
        x: MARGIN,
        y,
        size: 10,
        font,
        color: toRgb(COLOR_MUTED),
      });
      page.drawText(row.value, {
        x: MARGIN + 220,
        y,
        size: 10,
        font: boldFont,
        color: toRgb(COLOR_TEXT),
      });
      y -= ROW_HEIGHT;
    }
    y -= 10;
  }

  function drawTable(heading: string, headers: string[], rows: string[][], opts: PdfTableOptions = {}) {
    drawSectionHeading(heading);

    const tableWidth = PAGE_WIDTH - MARGIN * 2;
    const colWidths = opts.colWidths ?? headers.map(() => tableWidth / headers.length);
    const rightAlign = new Set(opts.rightAlignCols ?? []);

    function drawHeaderRow() {
      ensureSpace(HEADER_ROW_HEIGHT);
      page.drawRectangle({
        x: MARGIN,
        y: y - HEADER_ROW_HEIGHT,
        width: tableWidth,
        height: HEADER_ROW_HEIGHT,
        color: toRgb(COLOR_HEADER_BG),
      });
      let colX = MARGIN;
      headers.forEach((h, i) => {
        const w = colWidths[i];
        const textWidth = boldFont.widthOfTextAtSize(h, 9);
        const tx = rightAlign.has(i) ? colX + w - textWidth - 8 : colX + 8;
        page.drawText(h, {
          x: tx,
          y: y - HEADER_ROW_HEIGHT + 8,
          size: 9,
          font: boldFont,
          color: toRgb(COLOR_HEADER_TEXT),
        });
        colX += w;
      });
      y -= HEADER_ROW_HEIGHT;
    }

    drawHeaderRow();

    rows.forEach((row, rowIdx) => {
      if (y - ROW_HEIGHT < MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
        drawHeaderRow();
      }

      if (rowIdx % 2 === 1) {
        page.drawRectangle({
          x: MARGIN,
          y: y - ROW_HEIGHT,
          width: tableWidth,
          height: ROW_HEIGHT,
          color: toRgb(COLOR_ROW_ALT_BG),
        });
      }

      let colX = MARGIN;
      row.forEach((cell, i) => {
        const w = colWidths[i];
        const textWidth = font.widthOfTextAtSize(cell, 9);
        const tx = rightAlign.has(i) ? colX + w - textWidth - 8 : colX + 8;
        page.drawText(cell, {
          x: tx,
          y: y - ROW_HEIGHT + 7,
          size: 9,
          font,
          color: toRgb(COLOR_TEXT),
        });
        colX += w;
      });

      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_HEIGHT,
        width: tableWidth,
        height: ROW_HEIGHT,
        borderColor: toRgb(COLOR_BORDER),
        borderWidth: 0.5,
      });

      y -= ROW_HEIGHT;
    });

    y -= 15;
  }

  drawHeader();

  return {
    drawKeyValueSection,
    drawTable,
    drawSectionHeading,
    async save(): Promise<Uint8Array> {
      drawFooters();
      return pdfDoc.save();
    },
  };
}

export function pdfBytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}