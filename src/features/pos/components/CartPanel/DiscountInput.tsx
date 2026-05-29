"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import type { DiscountType } from "@/types";

export function DiscountInput() {
  const discountValue = usePosStore((s) => s.discountValue);
  const setDiscount = usePosStore((s) => s.setDiscount);
  const clearDiscount = usePosStore((s) => s.clearDiscount);

  const [mode, setMode] = useState<DiscountType>("percentage");
  const [inputVal, setInputVal] = useState(discountValue > 0 ? String(discountValue) : "");

  function handleModeSwitch(newMode: DiscountType) {
    setMode(newMode);
    setInputVal("");
    clearDiscount();
  }

  function handleChange(val: string) {
    setInputVal(val);
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      clearDiscount();
      return;
    }
    const clamped = mode === "percentage" ? Math.min(num, 100) : num;
    setDiscount(mode, clamped);
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Discount
      </label>
      <div className="flex gap-1">
        {/* Mode toggle */}
        <div className="flex rounded-md border overflow-hidden">
          <button
            onClick={() => handleModeSwitch("percentage")}
            className={cn(
              "px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === "percentage"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            %
          </button>
          <button
            onClick={() => handleModeSwitch("fixed")}
            className={cn(
              "px-2.5 py-1.5 text-xs font-medium transition-colors",
              mode === "fixed"
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            Rs.
          </button>
        </div>

        {/* Input */}
        <input
          type="number"
          min={0}
          max={mode === "percentage" ? 100 : undefined}
          placeholder={mode === "percentage" ? "0 – 100" : "Amount"}
          value={inputVal}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Clear */}
        {discountValue > 0 && (
          <button
            onClick={() => { setInputVal(""); clearDiscount(); }}
            className="px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}