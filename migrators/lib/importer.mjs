// Takes the common menu shape and writes it into the DB inside one
// transaction — everything commits, or nothing does.
function slugify(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function buildPreview(menu, existingCategoryNames) {
  const existing = new Set(existingCategoryNames.map((n) => n.toLowerCase()));
  let newCategories = 0;
  let totalItems = 0;
  let totalVariants = 0;
  let totalModifierGroups = 0;

  for (const cat of menu.categories) {
    if (!existing.has(cat.name.toLowerCase())) newCategories++;
    for (const item of cat.items) {
      totalItems++;
      totalVariants += item.variants.length;
      totalModifierGroups += item.modifierGroups.length;
    }
  }

  return {
    newCategories,
    existingCategoriesReused: menu.categories.length - newCategories,
    totalItems,
    totalVariants,
    totalModifierGroups,
  };
}

export async function importMenu(sql, { tenantId, branchId, menu }) {
  const result = { categoriesCreated: 0, itemsCreated: 0, skippedItems: [] };

  await sql.begin(async (tx) => {
    for (const cat of menu.categories) {
      const [existingCat] = await tx`
        SELECT id FROM menu_categories
        WHERE branch_id = ${branchId} AND lower(name) = ${cat.name.toLowerCase()}
      `;

      let categoryId;
      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const [created] = await tx`
          INSERT INTO menu_categories (tenant_id, branch_id, name, slug, sort_order, is_active)
          VALUES (${tenantId}, ${branchId}, ${cat.name}, ${slugify(cat.name)}, 0, true)
          RETURNING id
        `;
        categoryId = created.id;
        result.categoriesCreated++;
      }

      for (const item of cat.items) {
        const [existingItem] = await tx`
          SELECT id FROM menu_items
          WHERE branch_id = ${branchId} AND lower(name) = ${item.name.toLowerCase()}
        `;
        if (existingItem) {
          result.skippedItems.push(`${item.name} — already exists in this branch`);
          continue;
        }

        const [createdItem] = await tx`
          INSERT INTO menu_items (tenant_id, branch_id, category_id, name, slug, description, base_price, status, sort_order, is_featured)
          VALUES (${tenantId}, ${branchId}, ${categoryId}, ${item.name}, ${slugify(item.name)}, ${item.description}, ${item.basePrice}, 'available', 0, false)
          RETURNING id
        `;
        result.itemsCreated++;

        for (const v of item.variants) {
          await tx`
            INSERT INTO menu_item_variants (tenant_id, menu_item_id, name, price, is_default, is_available)
            VALUES (${tenantId}, ${createdItem.id}, ${v.name}, ${v.price}, false, true)
          `;
        }

        for (const g of item.modifierGroups) {
          const [createdGroup] = await tx`
            INSERT INTO modifier_groups (tenant_id, menu_item_id, name, is_required, min_selections, max_selections)
            VALUES (${tenantId}, ${createdItem.id}, ${g.name}, ${g.isRequired}, ${g.minSelections}, ${g.maxSelections})
            RETURNING id
          `;
          for (const o of g.options) {
            await tx`
              INSERT INTO modifier_options (tenant_id, modifier_group_id, name, price_adjustment, is_default, is_available)
              VALUES (${tenantId}, ${createdGroup.id}, ${o.name}, ${o.priceAdjustment}, false, true)
            `;
          }
        }
      }
    }
  });

  return result;
}