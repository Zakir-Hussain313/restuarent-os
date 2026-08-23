"use client";

import { formatCurrency } from "@/lib/utils";
import { usePosCart } from "../../hooks/usePosCart";

// ─── Row component ────────────────────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  value: string;
  muted?: boolean;
  negative?: boolean;
}

function SummaryRow({ label, value, muted, negative }: SummaryRowProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-muted-foreground" : "text-foreground/80"}>{label}</span>
      <span className={negative ? "text-green-600" : muted ? "text-muted-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrderSummary() {
  const totals = usePosCart();

  if (totals.uniqueItemCount === 0) return null;

  return (
    <div className="space-y-2 pt-3 border-t border-border">
      <SummaryRow
        label="Subtotal"
        value={formatCurrency(totals.subtotal)}
        muted
      />

      {totals.discountAmount > 0 && (
        <SummaryRow
          label="Discount"
          value={`− ${formatCurrency(totals.discountAmount)}`}
          negative
        />
      )}

      {/* Grand total */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary tabular-nums">
          {formatCurrency(totals.grandTotal)}
        </span>
      </div>
    </div>
  );
}