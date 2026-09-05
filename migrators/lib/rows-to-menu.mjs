import { parseVariants } from "./parse-variants.mjs";
import { parseModifiers } from "./parse-modifiers.mjs";

// Converts flat row objects (one per menu item) into the common
// { categories: [{ name, items: [...] }] } shape used by the importer.
// Any new source format (Excel, SQLite, etc.) should convert its data
// into this same flat row shape, then reuse this function — no need to
// duplicate the grouping/validation logic per format.
export function rowsToMenu(rows) {
  const errors = [];
  const categoryMap = new Map();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2: 1-indexed + header row
    const category = (row.category || "").trim();
    const itemName = (row.item_name || "").trim();
    const priceRaw = (row.price || "").toString().trim();

    if (!category) {
      errors.push(`Row ${rowNum}: missing category — skipped`);
      return;
    }
    if (!itemName) {
      errors.push(`Row ${rowNum}: missing item_name — skipped`);
      return;
    }
    const price = Number(priceRaw);
    if (!priceRaw || Number.isNaN(price) || price < 0) {
      errors.push(`Row ${rowNum} ("${itemName}"): invalid price "${priceRaw}" — skipped`);
      return;
    }

    const { variants, errors: variantErrors } = parseVariants(row.variants);
    variantErrors.forEach((e) => errors.push(`Row ${rowNum} ("${itemName}"): ${e}`));

    const { modifierGroups, errors: modifierErrors } = parseModifiers(row.modifiers);
    modifierErrors.forEach((e) => errors.push(`Row ${rowNum} ("${itemName}"): ${e}`));

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { name: category, items: [] });
    }
    categoryMap.get(category).items.push({
      name: itemName,
      description: (row.description || "").trim(),
      basePrice: price,
      image: (row.image_url || "").trim() || null,
      variants,
      modifierGroups,
    });
  });

  return { categories: [...categoryMap.values()], errors };
}