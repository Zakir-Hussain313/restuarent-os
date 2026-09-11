/**
 * General-purpose menu migrator — entry point.
 *
 * Usage:
 *   node migrate-menu.mjs <file> --branch=<branchId>            (preview only, no writes)
 *   node migrate-menu.mjs <file> --branch=<branchId> --commit   (actually writes)
 *
 * Supported formats right now: .csv, .xlsx, .sqlite/.db/.sqlite3, .sql (dump)
 *
 * SQLite and SQL dump formats need a --config=<path.json> flag, since their
 * table/column names are unknown ahead of time. See
 * migrators/config.example.json for the shape.
 *
 * Setup: npm i -D csv-parse
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import { readFileSync } from "node:fs";
import postgres from "postgres";
import readline from "node:readline/promises";
import { readCsvMenu } from "./migrators/lib/csv-reader.mjs";
import { readExcelMenu } from "./migrators/lib/excel-reader.mjs";
import { readSqliteMenu } from "./migrators/lib/sqlite-reader.mjs";
import { readSqlDumpMenu } from "./migrators/lib/sql-dump-reader.mjs";
import { buildPreview, importMenu } from "./migrators/lib/importer.mjs";

const [, , filePath, ...flags] = process.argv;
const branchId = flags.find((f) => f.startsWith("--branch="))?.split("=")[1];
const configPath = flags.find((f) => f.startsWith("--config="))?.split("=")[1];
const commit = flags.includes("--commit");

if (!filePath || !branchId) {
  console.error("Usage: node migrate-menu.mjs <file> --branch=<branchId> [--config=<path.json>] [--commit]");
  process.exit(1);
}

function loadReaderConfig(path) {
  if (!path) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function readMenu(path, readerConfig) {
  if (path.endsWith(".csv")) return readCsvMenu(path);
  if (path.endsWith(".xlsx")) return readExcelMenu(path);
  if (/\.(sqlite3?|db)$/i.test(path)) {
    if (!readerConfig) throw new Error("SQLite files require --config=<path.json>. See migrators/config.example.json.");
    return readSqliteMenu(path, readerConfig);
  }
  if (path.endsWith(".sql")) {
    if (!readerConfig) throw new Error("SQL dump files require --config=<path.json>. See migrators/config.example.json.");
    return readSqlDumpMenu(path, readerConfig);
  }
  throw new Error(`Unsupported file type: ${path}.`);
}

async function main() {
  const sql = postgres(process.env.DATABASE_POOL_URL, { prepare: false });

  const [branch] = await sql`SELECT tenant_id, name FROM branches WHERE id = ${branchId}`;
  if (!branch) {
    console.error(`Branch ${branchId} not found.`);
    await sql.end();
    process.exit(1);
  }
  const tenantId = branch.tenant_id;
  console.log(`Target branch: ${branch.name}\n`);

  const readerConfig = loadReaderConfig(configPath);
  const { categories, errors: rowErrors } = await readMenu(filePath, readerConfig);

  if (rowErrors.length) {
    console.log(`⚠ ${rowErrors.length} row issue(s):`);
    rowErrors.forEach((e) => console.log(`  - ${e}`));
    console.log("");
  }

  if (categories.length === 0) {
    console.log("No valid items found. Nothing to import.");
    await sql.end();
    return;
  }

  const existingCategories = await sql`
    SELECT name FROM menu_categories WHERE branch_id = ${branchId}
  `;
  const preview = buildPreview({ categories }, existingCategories.map((c) => c.name));

  console.log("Preview:");
  console.log(`  New categories to create: ${preview.newCategories}`);
  console.log(`  Existing categories reused: ${preview.existingCategoriesReused}`);
  console.log(`  Items: ${preview.totalItems}`);
  console.log(`  Variants: ${preview.totalVariants}`);
  console.log(`  Modifier groups: ${preview.totalModifierGroups}\n`);

  if (!commit) {
    console.log("Dry run only — nothing written. Re-run with --commit to actually import.");
    await sql.end();
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Type 'yes' to write this to the database: ");
  rl.close();

  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Cancelled — nothing written.");
    await sql.end();
    return;
  }

  const result = await importMenu(sql, { tenantId, branchId, menu: { categories } });

  console.log("\nDone.");
  console.log(`  Categories created: ${result.categoriesCreated}`);
  console.log(`  Items created: ${result.itemsCreated}`);
  if (result.skippedItems.length) {
    console.log(`  Skipped (already existed): ${result.skippedItems.length}`);
    result.skippedItems.forEach((s) => console.log(`    - ${s}`));
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});