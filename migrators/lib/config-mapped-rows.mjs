// Maps raw source rows (arbitrary column names, from SQLite or a SQL dump)
// into the flat row shape rowsToMenu() expects: category, item_name,
// description, price, variants, modifiers, image_url. `columnMap` is the
// "columns" section of the reader's config file - keys are our standard
// field names, values are the source's actual column names.
export function mapRawRowsToFlatRows(rawRows, columnMap) {
  if (!columnMap?.category || !columnMap?.item_name || !columnMap?.price) {
    throw new Error(
      "Config \"columns\" must at minimum map category, item_name, and price."
    );
  }

  return rawRows.map((raw) => ({
    category: valueAt(raw, columnMap.category),
    item_name: valueAt(raw, columnMap.item_name),
    description: valueAt(raw, columnMap.description),
    price: valueAt(raw, columnMap.price),
    variants: valueAt(raw, columnMap.variants),
    modifiers: valueAt(raw, columnMap.modifiers),
    image_url: valueAt(raw, columnMap.image_url),
  }));
}

function valueAt(row, key) {
  if (!key) return "";
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}