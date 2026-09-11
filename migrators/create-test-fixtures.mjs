// One-off helper: generates a small test fixture for every supported
// migrator format (CSV, Excel, SQLite, SQL dump), all describing the same
// tiny menu, plus a matching reader config for the SQLite/SQL formats.
// Run once: node migrators/create-test-fixtures.mjs
// Then test each format through migrate-menu.mjs (dry run first).

import { writeFileSync } from "node:fs";
import ExcelJS from "exceljs";
import Database from "better-sqlite3";

const ROWS = [
  // Valid rows — exercise variants + modifiers + normal item
  {
    category: "Burgers",
    item_name: "Zinger Burger",
    description: "Crispy chicken burger",
    price: "650",
    variants: "Regular:650;Large:850",
    modifiers: "Extras(0-3): Cheese:+100, Fries:+150 | Spice(1-1): Mild:+0, Hot:+0",
    image_url: "",
  },
  {
    category: "Burgers",
    item_name: "Beef Burger",
    description: "Classic beef patty",
    price: "700",
    variants: "",
    modifiers: "",
    image_url: "",
  },
  {
    category: "Drinks",
    item_name: "Coke",
    description: "330ml can",
    price: "150",
    variants: "",
    modifiers: "",
    image_url: "",
  },
  // Deliberately broken rows — should show up as errors in the preview,
  // not crash the import.
  {
    category: "",
    item_name: "Missing Category Item",
    description: "",
    price: "100",
    variants: "",
    modifiers: "",
    image_url: "",
  },
  {
    category: "Drinks",
    item_name: "Bad Price Item",
    description: "",
    price: "not-a-number",
    variants: "",
    modifiers: "",
    image_url: "",
  },
];

// --- CSV ---
const csvHeader = "category,item_name,description,price,variants,modifiers,image_url";
const csvLines = ROWS.map((r) =>
  [r.category, r.item_name, r.description, r.price, r.variants, r.modifiers, r.image_url]
    .map((v) => `"${v.replace(/"/g, '""')}"`)
    .join(",")
);
writeFileSync("test-menu.csv", [csvHeader, ...csvLines].join("\n"));
console.log("Wrote test-menu.csv");

// --- Excel ---
await (async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Menu");
  sheet.addRow(["category", "item_name", "description", "price", "variants", "modifiers", "image_url"]);
  ROWS.forEach((r) =>
    sheet.addRow([r.category, r.item_name, r.description, r.price, r.variants, r.modifiers, r.image_url])
  );
  await workbook.xlsx.writeFile("test-menu.xlsx");
  console.log("Wrote test-menu.xlsx");
})();

// --- SQLite (deliberately different column names to prove config-mapping works) ---
const db = new Database("test-menu.sqlite");
db.exec(`
  CREATE TABLE old_menu (
    cat TEXT, name TEXT, notes TEXT, cost TEXT, variant_str TEXT, modifier_str TEXT, img TEXT
  );
`);
const insert = db.prepare(
  "INSERT INTO old_menu (cat, name, notes, cost, variant_str, modifier_str, img) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
ROWS.forEach((r) => insert.run(r.category, r.item_name, r.description, r.price, r.variants, r.modifiers, r.image_url));
db.close();
console.log("Wrote test-menu.sqlite");

// --- SQL dump (explicit-columns form) ---
const dumpLines = ROWS.map((r) => {
  const esc = (v) => `'${v.replace(/'/g, "\\'")}'`;
  return `(${esc(r.category)}, ${esc(r.item_name)}, ${esc(r.description)}, ${esc(r.price)}, ${esc(r.variants)}, ${esc(r.modifiers)}, ${esc(r.image_url)})`;
});
const dumpSql = `INSERT INTO old_menu (cat, name, notes, cost, variant_str, modifier_str, img) VALUES\n${dumpLines.join(",\n")};\n`;
writeFileSync("test-menu.sql", dumpSql);
console.log("Wrote test-menu.sql");

// --- Matching config for SQLite/SQL dump (same column names either way) ---
writeFileSync(
  "test-config.json",
  JSON.stringify(
    {
      table: "old_menu",
      columns: {
        category: "cat",
        item_name: "name",
        description: "notes",
        price: "cost",
        variants: "variant_str",
        modifiers: "modifier_str",
        image_url: "img",
      },
    },
    null,
    2
  )
);
console.log("Wrote test-config.json");