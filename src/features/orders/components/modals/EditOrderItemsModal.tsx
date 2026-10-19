"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Minus, Plus, Trash2, Undo2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { queryKeys } from "@/hooks/useMockQuery";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import type { MenuItem, Order, SelectedModifier, SelectedVariant } from "@/types";
import type { UpdateItemsDraft, UpdateItemsSuccess } from "@/features/orders/hooks/useOrderDetail";
import { printOrderUpdateTicket } from "@/features/orders/lib/printOrderUpdateTicket";
import {
  activeLineCount,
  addItemToDraft,
  buildEditPayload,
  createDraft,
  draftSubtotal,
  hasDraftChanges,
  hasReductions,
  quantitiesByMenuItem,
  restoreExisting,
  stepAdded,
  stepExisting,
  type DraftAddedLine,
  type DraftExistingLine,
  type EditDraft,
} from "@/features/orders/lib/editDraft";
import { EditOrderMenuPicker } from "./EditOrderMenuPicker";

const REASONS = ["Customer request", "Wrong item", "Out of stock"] as const;

interface EditOrderItemsModalProps {
  open: boolean;
  order: Order;
  isSaving: boolean;
  onSave: (draft: UpdateItemsDraft) => Promise<UpdateItemsSuccess>;
  // Rebuilds the draft from the latest order (parent remounts this modal).
  onReload: () => void;
  onClose: () => void;
}

function Stepper({
  quantity,
  onMinus,
  onPlus,
}: {
  quantity: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onMinus}
        aria-label={quantity <= 1 ? "Remove item" : "Decrease quantity"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-input transition-colors",
          quantity <= 1 ? "text-destructive hover:bg-destructive/10" : "hover:bg-primary-light hover:text-primary"
        )}
      >
        {quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
      <button
        type="button"
        onClick={onPlus}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-input transition-colors hover:bg-primary-light hover:text-primary"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function LineDetails({
  variantName,
  modifiers,
  notes,
}: {
  variantName?: string;
  modifiers: string[];
  notes?: string;
}) {
  const parts = [variantName, ...modifiers].filter(Boolean);
  return (
    <>
      {parts.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">{parts.join(" · ")}</p>}
      {notes && <p className="mt-0.5 text-xs italic text-muted-foreground">{notes}</p>}
    </>
  );
}

function ExistingRow({
  line,
  onStep,
  onRestore,
}: {
  line: DraftExistingLine;
  onStep: (delta: 1 | -1) => void;
  onRestore: () => void;
}) {
  const { item, quantity, removed } = line;
  const quantityChanged = !removed && quantity !== item.quantity;
  return (
    <div className={cn("rounded-xl border px-3 py-2.5", removed ? "border-dashed bg-muted/40" : "bg-card")}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium leading-tight", removed && "text-muted-foreground line-through")}>
            {item.menuItemName}
          </p>
          <LineDetails
            variantName={item.selectedVariant?.variantName}
            modifiers={item.selectedModifiers.map((m) => m.optionName)}
            notes={item.notes}
          />
          {quantityChanged && <p className="mt-0.5 text-[11px] text-amber-600">was {item.quantity}</p>}
          {removed && <p className="mt-0.5 text-[11px] text-destructive">Will be removed</p>}
        </div>
        {removed ? (
          <button
            type="button"
            onClick={onRestore}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-input px-3 text-xs font-medium hover:bg-primary-light hover:text-primary"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
        ) : (
          <Stepper quantity={quantity} onMinus={() => onStep(-1)} onPlus={() => onStep(1)} />
        )}
      </div>
      {!removed && (
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
          {formatCurrency(item.unitPrice * quantity)}
        </p>
      )}
    </div>
  );
}

function AddedRow({ line, onStep }: { line: DraftAddedLine; onStep: (delta: 1 | -1) => void }) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium leading-tight">
            {line.menuItem.name}
            <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              NEW
            </span>
          </p>
          <LineDetails
            variantName={line.selectedVariant?.variantName}
            modifiers={line.selectedModifiers.map((m) => m.optionName)}
          />
        </div>
        <Stepper quantity={line.quantity} onMinus={() => onStep(-1)} onPlus={() => onStep(1)} />
      </div>
      <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
        {formatCurrency(line.unitPrice * line.quantity)}
      </p>
    </div>
  );
}

export function EditOrderItemsModal({
  open,
  order,
  isSaving,
  onSave,
  onReload,
  onClose,
}: EditOrderItemsModalProps) {
  const queryClient = useQueryClient();
  const { showAlert } = useAlertModal();

  // Lazy initializers — the parent remounts this component (changing `key`)
  // every time the dialog opens or is reloaded, so no reset effect is needed.
  const [draft, setDraft] = useState<EditDraft>(() => createDraft(order));
  const [baseRevision] = useState(() => order.revision);
  const [reason, setReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"items" | "menu">("items");

  // Make sure we're editing the latest version of the order.
  useEffect(() => {
    if (!open) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) });
  }, [open, order.id, queryClient]);

  // If the order moved on (another terminal edited/paid it) while this draft
  // was open, the draft is out of date — saving is blocked until reload.
  const isStale = order.revision !== baseRevision;
  const changed = hasDraftChanges(draft);
  const keepsItems = activeLineCount(draft) > 0;
  const canSave = changed && keepsItems && !isStale && !isSaving;

  const newSubtotal = draftSubtotal(draft);
  const delta = newSubtotal - order.subtotal;

  function handleAdd(item: MenuItem, variant?: SelectedVariant, modifiers?: SelectedModifier[]) {
    const newLineKey = crypto.randomUUID();
    setDraft((d) => addItemToDraft(d, newLineKey, item, variant, modifiers));
    setError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      const result = await onSave(buildEditPayload(draft, reason ?? undefined));

      // Pending = the original kitchen ticket hasn't been printed yet, so
      // there is nothing to "update" — it will print with the new items.
      if (order.status !== "pending") {
        void printOrderUpdateTicket({ order: result.order, revision: result.revision });
      }
      if (order.billPrintedAt && result.revision.totalAfter !== result.revision.totalBefore) {
        showAlert(
          "The bill was already printed. Print it again so the customer gets the updated total.",
          "Reprint the bill"
        );
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isSaving) onClose();
      }}
    >
      <DialogContent className="flex h-[85dvh] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border px-5 pb-3 pt-5">
          <DialogTitle>Edit items · {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          {/* Menu picker */}
          <div className={cn("min-h-0 min-w-0 flex-1 flex-col", mobilePane === "menu" ? "flex" : "hidden md:flex")}>
            <div className="shrink-0 px-3 pt-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobilePane("items")}
                className="flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to order
              </button>
            </div>
            <EditOrderMenuPicker
              branchId={order.branchId}
              quantityByMenuItem={quantitiesByMenuItem(draft)}
              onAdd={handleAdd}
            />
          </div>

          {/* Current items */}
          <div
            className={cn(
              "min-h-0 flex-col border-l border-border md:w-96 md:flex-none",
              mobilePane === "items" ? "flex flex-1" : "hidden md:flex"
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order items</p>
              <button
                type="button"
                onClick={() => setMobilePane("menu")}
                className="flex items-center gap-1 text-xs font-medium text-primary md:hidden"
              >
                <Plus className="h-3.5 w-3.5" />
                Add items
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
              {draft.existing.map((line) => (
                <ExistingRow
                  key={line.item.id}
                  line={line}
                  onStep={(d) => setDraft((cur) => stepExisting(cur, line.item.id, d))}
                  onRestore={() => setDraft((cur) => restoreExisting(cur, line.item.id))}
                />
              ))}
              {draft.added.map((line) => (
                <AddedRow
                  key={line.key}
                  line={line}
                  onStep={(d) => setDraft((cur) => stepAdded(cur, line.key, d))}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 space-y-2 border-t border-border px-5 py-3">
          {isStale && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span>This order was changed on another terminal.</span>
              <button type="button" onClick={onReload} className="font-semibold underline">
                Reload
              </button>
            </div>
          )}

          {!keepsItems && (
            <p className="text-xs text-destructive">
              An order needs at least one item. To cancel everything, close this and use Cancel Order.
            </p>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {hasReductions(draft) && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Reason:</span>
              {REASONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setReason((r) => (r === label ? null : label))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    reason === label
                      ? "border-primary bg-primary-light font-medium text-primary"
                      : "border-input hover:bg-primary-light hover:text-primary"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0 text-xs">
              <p className="tabular-nums">
                <span className="text-muted-foreground">Items subtotal </span>
                {formatCurrency(order.subtotal)} → <span className="font-semibold">{formatCurrency(newSubtotal)}</span>{" "}
                {delta !== 0 && (
                  <span className={cn("font-semibold", delta > 0 ? "text-primary" : "text-destructive")}>
                    ({delta > 0 ? "+" : "−"}
                    {formatCurrency(Math.abs(delta))})
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Discounts and the final total are recalculated when you save.
              </p>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <Button variant="outline" size="lg" className="flex-1 sm:flex-none" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button size="lg" className="flex-1 sm:flex-none" onClick={handleSave} disabled={!canSave}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}