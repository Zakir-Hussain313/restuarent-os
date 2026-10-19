import type { MenuItem, Order, OrderItem, SelectedModifier, SelectedVariant } from "@/types";
import type { UpdateOrderItemsInput } from "@/features/orders/schemas";

export const MAX_LINE_QUANTITY = 99;

// What the edit dialog sends to the server (orderId + expectedRevision are
// added by useOrderDetail).
export type EditPayload = Omit<UpdateOrderItemsInput, "orderId" | "expectedRevision">;

// A line that is already on the order. Never mutated in place — removing it
// just flags it, so Undo is instant and nothing is lost until Save.
export interface DraftExistingLine {
  item: OrderItem;
  quantity: number;
  removed: boolean;
}

// A line the operator is adding in this edit. The price shown is only a
// preview — the server re-prices every added line from the database.
export interface DraftAddedLine {
  key: string;
  menuItem: MenuItem;
  selectedVariant?: SelectedVariant;
  selectedModifiers: SelectedModifier[];
  quantity: number;
  unitPrice: number;
}

export interface EditDraft {
  existing: DraftExistingLine[];
  added: DraftAddedLine[];
}

export function createDraft(order: Order): EditDraft {
  return {
    existing: order.items
      .filter((item) => item.status !== "cancelled")
      .map((item) => ({ item, quantity: item.quantity, removed: false })),
    added: [],
  };
}

// Same variant + same modifiers = same dish, so tapping it again raises the
// quantity instead of creating a duplicate line.
function selectionKey(variant: SelectedVariant | undefined, modifiers: SelectedModifier[]): string {
  return `${variant?.variantId ?? ""}|${modifiers
    .map((m) => m.optionId)
    .sort()
    .join(",")}`;
}

export function addItemToDraft(
  draft: EditDraft,
  newLineKey: string,
  menuItem: MenuItem,
  selectedVariant?: SelectedVariant,
  selectedModifiers: SelectedModifier[] = []
): EditDraft {
  const key = selectionKey(selectedVariant, selectedModifiers);

  // 1. An identical line already on the order (without notes) — bump it, or
  //    bring it back if it was marked removed.
  const existingIndex = draft.existing.findIndex(
    (l) =>
      l.item.menuItemId === menuItem.id &&
      !l.item.notes &&
      selectionKey(l.item.selectedVariant, l.item.selectedModifiers) === key
  );
  if (existingIndex !== -1) {
    return {
      ...draft,
      existing: draft.existing.map((l, i) => {
        if (i !== existingIndex) return l;
        if (l.removed) return { ...l, removed: false, quantity: 1 };
        return { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) };
      }),
    };
  }

  // 2. An identical line already added in this edit — bump it.
  const addedIndex = draft.added.findIndex(
    (l) => l.menuItem.id === menuItem.id && selectionKey(l.selectedVariant, l.selectedModifiers) === key
  );
  if (addedIndex !== -1) {
    return {
      ...draft,
      added: draft.added.map((l, i) =>
        i === addedIndex ? { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) } : l
      ),
    };
  }

  // 3. A genuinely new line.
  const unitPrice =
    menuItem.basePrice +
    (selectedVariant?.priceAdjustment ?? 0) +
    selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);

  return {
    ...draft,
    added: [
      ...draft.added,
      { key: newLineKey, menuItem, selectedVariant, selectedModifiers, quantity: 1, unitPrice },
    ],
  };
}

// − on a quantity of 1 marks the line removed (Undo brings it back).
export function stepExisting(draft: EditDraft, itemId: string, delta: 1 | -1): EditDraft {
  return {
    ...draft,
    existing: draft.existing.map((l) => {
      if (l.item.id !== itemId) return l;
      if (delta === 1) return { ...l, quantity: Math.min(l.quantity + 1, MAX_LINE_QUANTITY) };
      return l.quantity <= 1 ? { ...l, removed: true } : { ...l, quantity: l.quantity - 1 };
    }),
  };
}

export function restoreExisting(draft: EditDraft, itemId: string): EditDraft {
  return {
    ...draft,
    existing: draft.existing.map((l) => (l.item.id === itemId ? { ...l, removed: false } : l)),
  };
}

// − on a quantity of 1 simply drops the not-yet-saved line.
export function stepAdded(draft: EditDraft, key: string, delta: 1 | -1): EditDraft {
  return {
    ...draft,
    added: draft.added
      .map((l) =>
        l.key === key
          ? { ...l, quantity: Math.min(Math.max(l.quantity + delta, 0), MAX_LINE_QUANTITY) }
          : l
      )
      .filter((l) => l.quantity > 0),
  };
}

export function draftSubtotal(draft: EditDraft): number {
  const existing = draft.existing
    .filter((l) => !l.removed)
    .reduce((sum, l) => sum + l.item.unitPrice * l.quantity, 0);
  const added = draft.added.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  return existing + added;
}

export function activeLineCount(draft: EditDraft): number {
  return draft.existing.filter((l) => !l.removed).length + draft.added.length;
}

export function hasDraftChanges(draft: EditDraft): boolean {
  return (
    draft.added.length > 0 ||
    draft.existing.some((l) => l.removed || l.quantity !== l.item.quantity)
  );
}

// Something is being taken away — used to decide whether to offer a reason.
export function hasReductions(draft: EditDraft): boolean {
  return draft.existing.some((l) => l.removed || l.quantity < l.item.quantity);
}

// menuItemId -> total quantity currently in the draft (for badges in the picker).
export function quantitiesByMenuItem(draft: EditDraft): Map<string, number> {
  const totals = new Map<string, number>();
  for (const l of draft.existing) {
    if (l.removed) continue;
    totals.set(l.item.menuItemId, (totals.get(l.item.menuItemId) ?? 0) + l.quantity);
  }
  for (const l of draft.added) {
    totals.set(l.menuItem.id, (totals.get(l.menuItem.id) ?? 0) + l.quantity);
  }
  return totals;
}

export function buildEditPayload(draft: EditDraft, reason?: string): EditPayload {
  return {
    add: draft.added.map((l) => ({
      menuItemId: l.menuItem.id,
      variantId: l.selectedVariant?.variantId,
      modifierOptionIds: l.selectedModifiers.map((m) => m.optionId),
      quantity: l.quantity,
    })),
    setQuantity: draft.existing
      .filter((l) => !l.removed && l.quantity !== l.item.quantity)
      .map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
    cancel: draft.existing.filter((l) => l.removed).map((l) => l.item.id),
    reason: reason || undefined,
  };
}