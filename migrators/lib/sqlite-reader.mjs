import Database from "better-sqlite3";
import { mapRawRowsToFlatRows } from "./config-mapped-rows.mjs";
import { rowsToMenu } from "./rows-to-menu.mjs";

// Reads menu rows out of an arbitrary old-POS SQLite database file.
// Config-driven (see migrators/config.example.json) since the source
// table/column names are unknown ahead of time.
export function readSqliteMenu(filePath, readerConfig) {
  if (!readerConfig?.table) {
    throw new Error("SQLite reader requires a config with a \"table\" name.");
  }
  const db = new Database(filePath, { readonly: true, fileMustExist: true });
  try {
    const rawRows = db.prepare(`SELECT * FROM "${readerConfig.table}"`).all();
    const flatRows = mapRawRowsToFlatRows(rawRows, readerConfig.columns);
    return rowsToMenu(flatRows);
  } finally {
    db.close();
  }
}