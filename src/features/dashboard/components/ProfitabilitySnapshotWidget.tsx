"use client";

import { Wallet, AlertTriangle } from "lucide-react";
import { ChartSkeleton } from "@/components/data-display/LoadingSkeleton";
import { formatCurrency } from "@/lib/utils";
import type { ProfitabilitySnapshot } from "@/types/analytics";

interface Row {
  label: string;
  getValue: (s: ProfitabilitySnapshot) => string;
  emphasis?: boolean;
}

const ROWS: Row[] = [
  { label: "Revenue", getValue: (s) => formatCurrency(s.revenue) },
  { label: "Ingredient Cost", getValue: (s) => `-${formatCurrency(s.cogs)}` },
  { label: "Gross Profit", getValue: (s) => formatCurrency(s.grossProfit) },
  { label: "Wastage Loss", getValue: (s) => `-${formatCurrency(s.wastageLoss)}` },
  { label: "Correction Loss", getValue: (s) => `-${formatCurrency(s.correctionLoss)}` },
  { label: "Net Profit", getValue: (s) => formatCurrency(s.netProfit), emphasis: true },
];

interface ProfitabilitySnapshotWidgetProps {
  profitability: ProfitabilitySnapshot | undefined;
  isLoading: boolean;
}

export function ProfitabilitySnapshotWidget({ profitability, isLoading }: ProfitabilitySnapshotWidgetProps) {
  return (
    <div className="bg-card rounded-2xl border border-border flex flex-col xl:h-full">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-full bg-primary-light flex items-center justify-center">
          <Wallet className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Profitability</h3>
      </div>

      {isLoading || !profitability ? (
        <div className="p-5"><ChartSkeleton /></div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {ROWS.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
                <span className={`text-sm ${row.emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                  {row.label}
                </span>
                <span className={`text-sm ${row.emphasis ? "font-bold text-primary" : "font-medium text-foreground"}`}>
                  {row.getValue(profitability)}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 px-5 py-4 border-t border-border">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Profit Margin</span>
              <span className="text-lg font-heading font-bold text-foreground">{profitability.profitMarginPct}%</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Food Cost %</span>
              <span className="text-lg font-heading font-bold text-foreground">{profitability.foodCostPct}%</span>
            </div>
          </div>

          {profitability.lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-amber-50 rounded-b-2xl">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-amber-700">
                {profitability.lowStockCount} ingredient{profitability.lowStockCount === 1 ? "" : "s"} low on stock
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}