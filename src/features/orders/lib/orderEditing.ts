import { randomUUID } from "crypto";
import type { OrderItem, OrderRevision, OrderRevisionChanges, OrderRevisionLine } from "@/db/schema";
import { calculateCouponDiscount, type PricedOrderLine } from "@/features/orders/lib/orderPricing";

// Thrown for any user-facing reason an edit can't be applied. The action
// turns it into a plain `{ error }` result; anything else is an unexpected failure.
export class OrderEditError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OrderEditError";
    }
}

// Past out_for_delivery the food has left the building — no more edits.
const EDITABLE_STATUSES = new Set<string>(["pending", "confirmed", "ready_for_delivery"]);

export function isOrderEditable(status: string): boolean {
    return EDITABLE_STATUSES.has(status);
}

// Plain-JSON shape of one saved revision, safe to return from a server action.
export interface OrderRevisionDTO {
    revision: number;
    changes: OrderRevisionChanges;
    totalBefore: number;
    totalAfter: number;
    reason: string | null;
    editedByName: string | null;
    // True when the editor's staff row was permanently deleted (name snapshot only).
    editorDeleted: boolean;
    createdAt: string;
}

export function toOrderRevisionDTO(row: OrderRevision): OrderRevisionDTO {
    return {
        revision: row.revision,
        changes: row.changes,
        totalBefore: row.totalBefore,
        totalAfter: row.totalAfter,
        reason: row.reason,
        editedByName: row.editedByName,
        editorDeleted: row.editedBy === null && row.editedByName !== null,
        createdAt: row.createdAt.toISOString(),
    };
}

type RevisionSource = Pick<
    OrderItem,
    "id" | "menuItemName" | "selectedVariant" | "selectedModifiers" | "notes" | "quantity" | "unitPrice"
>;

function toRevisionLine(item: RevisionSource): OrderRevisionLine {
    return {
        itemId: item.id,
        menuItemName: item.menuItemName,
        variantName: item.selectedVariant?.variantName ?? null,
        modifiers: item.selectedModifiers.map((m) => m.optionName),
        notes: item.notes ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
    };
}

export interface NewOrderLine extends PricedOrderLine {
    id: string;
}

export interface OrderEditPlan {
    quantityUpdates: { id: string; quantity: number; itemTotal: number }[];
    cancelIds: string[];
    newLines: NewOrderLine[];
    // Every line that is still active after the edit — used for totals and
    // coupon eligibility.
    activeLines: { menuItemId: string; categoryId: string; itemTotal: number }[];
    subtotal: number;
    changes: OrderRevisionChanges;
}

// Pure: works out what an edit does to an order's lines. Existing lines keep
// their frozen unit price (only quantity changes); only newly added lines are
// priced from the current menu. Throws OrderEditError for any invalid edit.
export function planOrderEdit(params: {
    items: OrderItem[];
    add: PricedOrderLine[];
    setQuantity: { itemId: string; quantity: number }[];
    cancel: string[];
}): OrderEditPlan {
    const { items, add, setQuantity, cancel } = params;

    const activeById = new Map(items.filter((i) => i.status !== "cancelled").map((i) => [i.id, i]));

    const cancelSet = new Set(cancel);
    if (cancelSet.size !== cancel.length) {
        throw new OrderEditError("The same item was removed twice.");
    }
    const quantityById = new Map<string, number>();
    for (const change of setQuantity) {
        if (quantityById.has(change.itemId)) {
            throw new OrderEditError("The same item was changed twice.");
        }
        quantityById.set(change.itemId, change.quantity);
    }
    for (const id of [...cancelSet, ...quantityById.keys()]) {
        if (!activeById.has(id)) {
            throw new OrderEditError("One of the items is no longer part of this order. Reload it and try again.");
        }
    }
    for (const id of cancelSet) {
        if (quantityById.has(id)) {
            throw new OrderEditError("An item can't be both removed and changed.");
        }
    }

    const cancelled: OrderRevisionLine[] = [];
    const quantityChanged: (OrderRevisionLine & { fromQuantity: number })[] = [];
    const quantityUpdates: OrderEditPlan["quantityUpdates"] = [];
    const activeLines: OrderEditPlan["activeLines"] = [];
    let subtotal = 0;

    for (const item of activeById.values()) {
        if (cancelSet.has(item.id)) {
            cancelled.push(toRevisionLine(item));
            continue;
        }

        const newQuantity = quantityById.get(item.id);
        let itemTotal = item.itemTotal;
        if (newQuantity !== undefined && newQuantity !== item.quantity) {
            itemTotal = item.unitPrice * newQuantity;
            quantityUpdates.push({ id: item.id, quantity: newQuantity, itemTotal });
            quantityChanged.push({
                ...toRevisionLine({ ...item, quantity: newQuantity }),
                fromQuantity: item.quantity,
            });
        }

        activeLines.push({ menuItemId: item.menuItemId, categoryId: item.categoryId, itemTotal });
        subtotal += itemTotal;
    }

    const newLines: NewOrderLine[] = add.map((line) => ({ ...line, id: randomUUID() }));
    for (const line of newLines) {
        activeLines.push({ menuItemId: line.menuItemId, categoryId: line.categoryId, itemTotal: line.itemTotal });
        subtotal += line.itemTotal;
    }

    const added = newLines.map((line) => toRevisionLine(line));

    if (added.length === 0 && cancelled.length === 0 && quantityChanged.length === 0) {
        throw new OrderEditError("No changes to save.");
    }
    if (activeLines.length === 0) {
        throw new OrderEditError("An order needs at least one item. Use Cancel Order to cancel the whole order.");
    }

    return {
        quantityUpdates,
        cancelIds: [...cancelSet],
        newLines,
        activeLines,
        subtotal,
        changes: { added, cancelled, quantityChanged },
    };
}

// Pure: re-applies each discount on the order against the edited lines, using
// the discount's own frozen type/value. A coupon limited to certain items or
// categories only counts matching lines; if none remain it drops to 0. Whether
// a coupon is still valid (dates, usage) is deliberately NOT re-checked — it
// was valid when the order was placed.
export function recalculateDiscounts(
    discounts: { id: string; type: "percentage" | "fixed"; value: number; couponId: string | null }[],
    couponScopes: Map<string, { menuItemIds: string[] | null; categoryIds: string[] | null }>,
    lines: { menuItemId: string; categoryId: string; itemTotal: number }[],
    subtotal: number
): { perDiscount: { id: string; appliedAmount: number }[]; totalDiscount: number } {
    const perDiscount = discounts.map((d) => {
        const scope = d.couponId ? couponScopes.get(d.couponId) : undefined;
        const { amount } = calculateCouponDiscount(
            {
                discountType: d.type,
                discountValue: d.value,
                menuItemIds: scope?.menuItemIds ?? null,
                categoryIds: scope?.categoryIds ?? null,
            },
            lines,
            subtotal
        );
        return { id: d.id, appliedAmount: amount };
    });

    const totalDiscount = Math.min(
        perDiscount.reduce((sum, d) => sum + d.appliedAmount, 0),
        subtotal
    );
    return { perDiscount, totalDiscount };
}

export function derivePaymentStatus(total: number, totalPaid: number): "unpaid" | "partial" | "paid" {
    if (totalPaid <= 0) return "unpaid";
    return totalPaid >= total ? "paid" : "partial";
}