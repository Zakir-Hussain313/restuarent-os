import { readFileSync } from "node:fs";
import { mapRawRowsToFlatRows } from "./config-mapped-rows.mjs";
import { rowsToMenu } from "./rows-to-menu.mjs";

// Parses raw `INSERT INTO <table> (...) VALUES (...), (...);` statements out
// of a SQL dump file and converts matching rows into the common menu shape.
// Config-driven (see migrators/config.example.json).
//
// Handles two INSERT forms:
//   INSERT INTO table (col1, col2, ...) VALUES (v1, v2), (v1, v2), ...;
//   INSERT INTO table VALUES (v1, v2), ...;   <- requires config.columnOrder
//
// Known limitation: this is a lightweight, character-scan based parser
// built for typical MySQL/SQLite dump syntax, NOT a full SQL parser.
// Unusual escaping or vendor-specific dialects may not parse perfectly -
// always review the dry-run preview before --commit.
export function readSqlDumpMenu(filePath, readerConfig) {
  if (!readerConfig?.table) {
    throw new Error("SQL dump reader requires a config with a \"table\" name.");
  }
  const content = readFileSync(filePath, "utf-8");
  const rawRows = extractInsertRows(content, readerConfig.table, readerConfig.columnOrder);
  const flatRows = mapRawRowsToFlatRows(rawRows, readerConfig.columns);
  return rowsToMenu(flatRows);
}

function extractInsertRows(sql, tableName, fallbackColumnOrder) {
  const rows = [];
  const insertRegex = new RegExp(
    `INSERT\\s+INTO\\s+[\`"\\[]?${escapeRegex(tableName)}[\`"\\]]?\\s*(\\(([^)]+)\\))?\\s*VALUES\\s*`,
    "gi"
  );

  let match;
  while ((match = insertRegex.exec(sql)) !== null) {
    const explicitColumns = match[2]
      ? match[2].split(",").map((c) => c.trim().replace(/[`"[\]]/g, ""))
      : null;
    const columns = explicitColumns || fallbackColumnOrder;
    if (!columns) {
      throw new Error(
        `INSERT INTO ${tableName} has no column list and config.columnOrder was not provided.`
      );
    }

    const valuesStart = insertRegex.lastIndex;
    const statementEnd = findStatementEnd(sql, valuesStart);
    const valuesBlock = sql.slice(valuesStart, statementEnd);

    for (const tuple of splitValueTuples(valuesBlock)) {
      const values = parseValueTuple(tuple);
      const row = {};
      columns.forEach((col, i) => {
        row[col] = values[i] ?? "";
      });
      rows.push(row);
    }

    insertRegex.lastIndex = statementEnd;
  }

  return rows;
}

// Scans from `start`, respecting quoted strings and paren depth (a value
// itself can legitimately contain a semicolon, e.g. a variant string like
// "Half:500;Full:900" - a naive indexOf(";") would cut the statement off
// early right there). Returns the index of the real statement-terminating
// ";" outside any string/parens, or sql.length if none found.
function findStatementEnd(sql, start) {
  let depth = 0;
  let inString = false;
  let stringChar = null;
  for (let i = start; i < sql.length; i++) {
    const ch = sql[i];
    const prev = sql[i - 1];
    if (inString) {
      if (ch === stringChar && prev !== "\\") inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === ";" && depth === 0) return i;
  }
  return sql.length;
}

// Splits "(...), (...), (...)" into individual "(...)" tuples, respecting
// nested parens and quoted strings so commas inside values don't split early.
function splitValueTuples(block) {
  const tuples = [];
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let current = "";

  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    const prev = block[i - 1];

    if (inString) {
      current += ch;
      if (ch === stringChar && prev !== "\\") inString = false;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (ch === "(") {
      depth++;
      if (depth === 1) {
        current = "";
        continue;
      }
    }
    if (ch === ")") {
      depth--;
      if (depth === 0) {
        tuples.push(current);
        continue;
      }
    }
    if (depth > 0) current += ch;
  }

  return tuples;
}

// Parses one "(v1, v2, 'v3', NULL)" tuple into an array of JS values.
function parseValueTuple(tuple) {
  const values = [];
  let current = "";
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i];
    const prev = tuple[i - 1];

    if (inString) {
      if (ch === stringChar && prev !== "\\") {
        inString = false;
        continue;
      }
      current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "," && !inString) {
      values.push(normalizeValue(current));
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(normalizeValue(current));
  return values;
}

function normalizeValue(raw) {
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === "NULL") return "";
  return trimmed.replace(/\\'/g, "'").replace(/\\"/g, '"');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}