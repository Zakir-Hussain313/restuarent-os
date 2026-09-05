// Parses "Half:500;Full:900" into [{name, price}]
export function parseVariants(str) {
  if (!str || !str.trim()) return { variants: [], errors: [] };
  const errors = [];
  const variants = [];
  for (const part of str.split(";").map((s) => s.trim()).filter(Boolean)) {
    const [name, priceStr] = part.split(":").map((s) => s?.trim());
    const price = Number(priceStr);
    if (!name || !priceStr || Number.isNaN(price)) {
      errors.push(`Invalid variant "${part}" — expected format Name:Price`);
      continue;
    }
    variants.push({ name, price });
  }
  return { variants, errors };
}