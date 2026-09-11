"use client";

import { useState } from "react";
import { Receipt, X, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { Order, PaymentMethod } from "@/types";
import type { SplitPaymentLine } from "@/features/orders/actions";

interface SplitPaymentModalProps {
  open: boolean;
  orderNumber: string;
  balance: number;
  existingPayments: Order["payments"];
  isSubmitting: boolean;
  onConfirm: (lines: SplitPaymentLine[]) => void;
  onClose: () => void;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "complimentary", label: "Complimentary" },
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank_transfer: "Bank Transfer",
  complimentary: "Complimentary",
};

interface DraftLine {
  key: string;
  method: PaymentMethod;
  amount: string;
}

let nextKey = 0;
function makeLine(): DraftLine {
  nextKey += 1;
  return { key: `line-${nextKey}`, method: "cash", amount: "" };
}

export function SplitPaymentModal({
  open,
  orderNumber,
  balance,
  existingPayments,
  isSubmitting,
  onConfirm,
  onClose,
}: SplitPaymentModalProps) {
  // Lazy initializer — no reset effect needed. The parent remounts this
  // component (via a changing `key`) each time it's opened, so this
  // initial state naturally runs fresh every time, with no setState-in-
  // effect cascading-render warning.
  const [lines, setLines] = useState<DraftLine[]>(() => [makeLine()]);

  if (!open) return null;

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const parsedLines = lines.map((l) => ({ ...l, parsedAmount: Number(l.amount) }));
  const runningTotal = parsedLines.reduce(
    (sum, l) => sum + (Number.isFinite(l.parsedAmount) && l.parsedAmount > 0 ? l.parsedAmount : 0),
    0
  );
  const remainingAfter = balance - runningTotal;

  const allLinesValid =
    parsedLines.length > 0 &&
    parsedLines.every((l) => l.amount.trim() !== "" && Number.isFinite(l.parsedAmount) && l.parsedAmount > 0);
  const isValid = allLinesValid && runningTotal > 0 && runningTotal <= balance;

  function handleConfirm() {
    if (!isValid) return;
    onConfirm(
      parsedLines.map((l) => ({ method: l.method, amount: l.parsedAmount }))
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Split Payment — {orderNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Balance due: <span className="font-medium text-foreground">Rs. {balance.toLocaleString()}</span>
          </p>

          {existingPayments.length > 0 && (
            <div className="rounded-lg border border-input bg-muted/30 px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Already recorded
              </p>
              {existingPayments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs">
                  <span>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</span>
                  <span className="font-medium tabular-nums">Rs. {p.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-2">
                <Select
                  value={line.method}
                  onValueChange={(v) => updateLine(line.key, { method: v as PaymentMethod })}
                >
                  <SelectTrigger className="h-9 w-32 text-xs font-medium shrink-0" aria-label="Payment method">
                    <SelectValue>
                      {(value: string) =>
                        PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === value)?.label ?? value
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(line.key, { amount: e.target.value })}
                  placeholder="Amount"
                  className="h-9 flex-1 min-w-0 rounded-lg border border-input bg-background px-2 text-xs"
                />

                <button
                  onClick={() => removeLine(line.key)}
                  disabled={lines.length === 1}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  aria-label="Remove line"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setLines((prev) => [...prev, makeLine()])}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Add another payment method
          </button>

          <div className="rounded-lg border border-input bg-muted/30 px-3 py-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Entered</span>
              <span className="font-medium">Rs. {runningTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {remainingAfter > 0 ? "Still due after this" : remainingAfter < 0 ? "Over the balance by" : "Order will be"}
              </span>
              <span
                className={cn(
                  "font-medium",
                  remainingAfter > 0 && "text-amber-600",
                  remainingAfter < 0 && "text-destructive",
                  remainingAfter === 0 && "text-emerald-600"
                )}
              >
                {remainingAfter === 0
                  ? "Rs. 0 - fully paid"
                  : `Rs. ${Math.abs(remainingAfter).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !isValid}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Receipt className="w-3.5 h-3.5" />
            )}
            Record Payment{lines.length > 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}