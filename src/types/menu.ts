export type MenuItemStatus = "available" | "unavailable" | "out_of_stock";
export type SpiceLevel = "none" | "mild" | "medium" | "hot" | "extra_hot";
export type DietaryTag =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "halal"
  | "contains_nuts"
  | "spicy";

export interface MenuCategory {
  id: string;
  branchId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string; // emoji or icon name
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceAdjustment: number; // can be 0, positive or negative
  isDefault: boolean;
  isAvailable: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string; // e.g. "Choose your size", "Extra toppings"
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
}

export interface MenuItemVariant {
  id: string;
  name: string; // e.g. "Regular", "Large", "Family"
  price: number;
  isDefault: boolean;
  isAvailable: boolean;
}

export interface MenuItem {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  image?: string;
  basePrice: number;
  variants: MenuItemVariant[];
  modifierGroups: ModifierGroup[];
  status: MenuItemStatus;
  sortOrder: number;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// What a customer actually selected when adding to cart/order
export interface SelectedVariant {
  variantId: string;
  variantName: string;
  priceAdjustment: number;
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceAdjustment: number;
}