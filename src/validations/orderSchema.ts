import { z } from "zod";

export const selectedVariantSchema = z.object({
  variantId: z.string(),
  variantName: z.string(),
  priceAdjustment: z.number(),
});

export const selectedModifierSchema = z.object({
  groupId: z.string(),
  groupName: z.string(),
  optionId: z.string(),
  optionName: z.string(),
  priceAdjustment: z.number(),
});

export const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  menuItemName: z.string(),
  quantity: z.number().min(1).max(99),
  unitPrice: z.number().min(0),
  selectedVariant: selectedVariantSchema.optional(),
  selectedModifiers: z.array(selectedModifierSchema).default([]),
  notes: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  orderType: z.enum(["dine_in", "takeaway", "delivery", "walk_in"]),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  customerPhone: z
    .string()
    .regex(/^[0-9+\-\s]{10,15}$/, "Invalid phone number")
    .optional(),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  notes: z.string().max(500).optional(),
  deliveryAddress: z.string().optional(),
}).refine(
  (data) => {
    if (data.orderType === "dine_in" && !data.tableId) {
      return false;
    }
    return true;
  },
  { message: "Table is required for dine-in orders", path: ["tableId"] }
);

export const applyDiscountSchema = z.object({
  type: z.enum(["percentage", "fixed"]),
  value: z
    .number()
    .min(0)
    .refine((v) => v > 0, "Discount must be greater than 0"),
  name: z.string().min(1, "Discount name is required"),
});

export const processPaymentSchema = z.object({
  method: z.enum([
    "cash",
    "card",
    "jazzcash",
    "easypaisa",
    "bank_transfer",
    "complimentary",
  ]),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  reference: z.string().optional(),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
export type ApplyDiscountFormValues = z.infer<typeof applyDiscountSchema>;
export type ProcessPaymentFormValues = z.infer<typeof processPaymentSchema>;