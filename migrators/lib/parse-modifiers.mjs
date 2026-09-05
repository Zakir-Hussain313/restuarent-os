// Parses "Oil Preference(1-1): Regular:+0, Extra Oil:+50 | Toppings(0-3): Extra Cheese:+150"
export function parseModifiers(str) {
  if (!str || !str.trim()) return { modifierGroups: [], errors: [] };
  const errors = [];
  const groups = [];

  for (const groupStr of str.split("|").map((s) => s.trim()).filter(Boolean)) {
    const match = groupStr.match(/^(.+?)\((\d+)-(\d+)\)\s*:\s*(.+)$/);
    if (!match) {
      errors.push(`Invalid modifier group "${groupStr}" — expected format Name(min-max): Option:+adj, ...`);
      continue;
    }
    const [, rawName, minStr, maxStr, optionsStr] = match;
    const name = rawName.trim();
    const minSelections = Number(minStr);
    const maxSelections = Number(maxStr);
    const options = [];

    for (const optStr of optionsStr.split(",").map((s) => s.trim()).filter(Boolean)) {
      const optMatch = optStr.match(/^(.+?):\s*([+-]?\d+)$/);
      if (!optMatch) {
        errors.push(`Invalid option "${optStr}" in group "${name}" — expected format Name:+adj`);
        continue;
      }
      const [, optName, adjStr] = optMatch;
      options.push({ name: optName.trim(), priceAdjustment: Number(adjStr) });
    }

    if (options.length === 0) {
      errors.push(`Modifier group "${name}" has no valid options — skipped`);
      continue;
    }

    groups.push({
      name,
      isRequired: minSelections > 0,
      minSelections,
      maxSelections,
      options,
    });
  }

  return { modifierGroups: groups, errors };
}