import { z } from "zod";

export const modifierOptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Option name is required"),
  priceAdjustment: z.number().default(0),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

export const modifierGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Group name is required"),
  isRequired: z.boolean().default(false),
  minSelections: z.number().min(0).default(0),
  maxSelections: z.number().min(1).default(1),
  options: z.array(modifierOptionSchema).min(1, "At least one option required"),
});

export const menuItemVariantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Variant name is required"),
  price: z.number().min(0, "Price must be positive"),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  name: z.string().min(1, "Item name is required").max(100),
  description: z.string().max(500).default(""),
  categoryId: z.string().min(1, "Category is required"),
  basePrice: z.number().min(0, "Price must be positive"),
  variants: z.array(menuItemVariantSchema).default([]),
  modifierGroups: z.array(modifierGroupSchema).default([]),
  dietaryTags: z
    .array(
      z.enum([
        "vegetarian",
        "vegan",
        "gluten_free",
        "dairy_free",
        "halal",
        "contains_nuts",
        "spicy",
      ])
    )
    .default([]),
  status: z.enum(["available", "unavailable", "out_of_stock"]).default("available"),
});

export const menuCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50),
  description: z.string().max(200).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;
export type MenuCategoryFormValues = z.infer<typeof menuCategorySchema>;