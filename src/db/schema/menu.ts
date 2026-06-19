import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { menuItemStatusEnum, spiceLevelEnum, dietaryTagEnum } from "./enums";

// Tenant-wide menu (shared across all branches), per current decision.
// A future branch-level override table (e.g. branch_menu_item_availability)
// can layer on top of this without changing these tables.

export const menuCategories = pgTable("menu_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  image: text("image"),
  icon: text("icon"), // emoji or icon name, matches existing MenuCategory.icon

  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => menuCategories.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  image: text("image"),

  basePrice: integer("base_price").notNull(), // smallest currency unit

  dietaryTags: dietaryTagEnum("dietary_tags").array().notNull().default([]),
  spiceLevel: spiceLevelEnum("spice_level").notNull().default("none"),
  preparationTimeMinutes: integer("preparation_time_minutes").notNull().default(15),
  calories: integer("calories"),

  status: menuItemStatusEnum("status").notNull().default("available"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPopular: boolean("is_popular").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors MenuItemVariant — e.g. "Half kg" / "Full kg"
export const menuItemVariants = pgTable("menu_item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  price: integer("price").notNull(), // absolute price for this variant, not an adjustment
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors ModifierGroup — e.g. "Oil Preference"
export const modifierGroups = pgTable("modifier_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  menuItemId: uuid("menu_item_id")
    .notNull()
    .references(() => menuItems.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  isRequired: boolean("is_required").notNull().default(false),
  minSelections: integer("min_selections").notNull().default(0),
  maxSelections: integer("max_selections").notNull().default(1),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Mirrors ModifierOption — e.g. "Desi Ghee" (+200)
export const modifierOptions = pgTable("modifier_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  modifierGroupId: uuid("modifier_group_id")
    .notNull()
    .references(() => modifierGroups.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  priceAdjustment: integer("price_adjustment").notNull().default(0), // can be negative
  isDefault: boolean("is_default").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type NewMenuCategory = typeof menuCategories.$inferInsert;
export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;
export type MenuItemVariant = typeof menuItemVariants.$inferSelect;
export type NewMenuItemVariant = typeof menuItemVariants.$inferInsert;
export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type NewModifierGroup = typeof modifierGroups.$inferInsert;
export type ModifierOption = typeof modifierOptions.$inferSelect;
export type NewModifierOption = typeof modifierOptions.$inferInsert;