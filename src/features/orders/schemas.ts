import { z } from "zod";

const MAX_LINE_QUANTITY = 99;
const lineQuantity = z.number().int().min(1).max(MAX_LINE_QUANTITY);

// One saved edit of an existing order: lines to add, quantities to change,
// lines to remove. Sent as a single draft so the whole edit is one round trip.
export const updateOrderItemsSchema = z.object({
    orderId: z.string().uuid(),
    // The revision the client's draft was based on — the edit is rejected
    // if the order has been edited again since.
    expectedRevision: z.number().int().min(0),
    add: z
        .array(
            z.object({
                menuItemId: z.string().uuid(),
                variantId: z.string().uuid().optional(),
                modifierOptionIds: z.array(z.string().uuid()).max(30),
                quantity: lineQuantity,
                notes: z.string().trim().max(200).optional(),
            })
        )
        .max(50),
    setQuantity: z
        .array(z.object({ itemId: z.string().uuid(), quantity: lineQuantity }))
        .max(100),
    cancel: z.array(z.string().uuid()).max(100),
    reason: z.string().trim().max(200).optional(),
});

export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsSchema>;