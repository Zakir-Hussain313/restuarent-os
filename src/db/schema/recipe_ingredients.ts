import { pgTable, uuid, numeric, timestamp, index, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { menuItems, menuItemVariants } from "./menu";
import { ingredients } from "./ingredients";

// The BOM: how much of an ingredient a menu item uses per unit sold.
export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    menuItemId: uuid("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    // Null = applies regardless of variant. Set = this usage only applies
    // when this specific variant is ordered (e.g. "1kg" uses more rice
    // than "half kg").
    menuItemVariantId: uuid("menu_item_variant_id").references(() => menuItemVariants.id, {
      onDelete: "cascade",
    }),
    ingredientId: uuid("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    quantityPerUnit: numeric("quantity_per_unit", { precision: 12, scale: 3, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recipe_ingredients_tenant_id_idx").on(table.tenantId),
    index("recipe_ingredients_menu_item_id_idx").on(table.menuItemId),
    index("recipe_ingredients_ingredient_id_idx").on(table.ingredientId),
    unique("recipe_ingredients_item_variant_ingredient_unique").on(
      table.menuItemId,
      table.menuItemVariantId,
      table.ingredientId
    ),
  ]
);

export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type NewRecipeIngredient = typeof recipeIngredients.$inferInsert;