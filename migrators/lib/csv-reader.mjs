import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { rowsToMenu } from "./rows-to-menu.mjs";

// Reads a CSV with columns: category, item_name, description, price,
// variants, modifiers, image_url — converts it into the common menu shape.
export function readCsvMenu(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const rows = parse(content, {
    columns: (header) => header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_")),
    skip_empty_lines: true,
    trim: true,
  });
  return rowsToMenu(rows);
}