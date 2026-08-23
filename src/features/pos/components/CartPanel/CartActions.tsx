"use client";

import { Loader2, PauseCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosStore } from "@/store/usePosStore";
import { usePosCart } from "../../hooks/usePosCart";
import { usePosOrder } from "../../hooks/usePosOrder";

// ─── Component ────────────────────────────────────────────────────────────────

interface CartActionsProps {
  autoConfirmOnPlace?: boolean;
}

export function CartActions({ autoConfirmOnPlace }: CartActionsProps) {
  const cartItems = usePosStore((s) => s.cartItems);
  const { itemCount } = usePosCart();
  const { placeOrder, holdOrder, isSubmitting } = usePosOrder(autoConfirmOnPlace);

  const hasItems = cartItems.length > 0;

  return (
    <div className="flex gap-2 pt-3">
      {/* Hold Order */}
      <button
        type="button"
        onClick={holdOrder}
        disabled={!hasItems || isSubmitting}
        className={cn(
          "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl",
          "border border-border bg-white text-sm font-medium",
          "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          hasItems && !isSubmitting
            ? "text-foreground/80 hover:border-primary/40 hover:text-primary"
            : "text-muted-foreground cursor-not-allowed opacity-50"
        )}
      >
        <PauseCircle size={15} />
        Hold
      </button>

      {/* Place Order */}
      <button
        type="button"
        onClick={placeOrder}
        disabled={!hasItems || isSubmitting}
          className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl",
          "text-sm font-semibold text-primary-foreground transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          hasItems && !isSubmitting
            ? "bg-primary hover:bg-primary/90 shadow-sm active:scale-[0.98]"
            : "bg-primary/40 cursor-not-allowed"
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={15} className="animate-spin" />
            Placing…
          </>
        ) : (
          <>
            <CheckCircle size={15} />
            Place Order
            {itemCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs tabular-nums">
                {itemCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}