"use client";

import { useState } from "react";
import { UtensilsCrossed, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosCart } from "../hooks/usePosCart";
import { MenuPanel } from "./MenuPanel/MenuPanel";
import { CartPanel } from "./CartPanel/CartPanel";

type MobileTab = "menu" | "cart";

interface PosLayoutProps {
  branchId?: string;
  autoConfirmOnPlace?: boolean;
}

export function PosLayout({ branchId, autoConfirmOnPlace }: PosLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("menu");
  const { itemCount } = usePosCart();

  return (
    <div className="flex flex-col h-full">
      {/* ── Desktop: two-panel split ─────────────────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left: Menu browser — 60% */}
        <div className="flex-3 overflow-hidden bg-[#f9f8f6]">
          <MenuPanel />
        </div>

        {/* Right: Cart — 40% */}
        <div className="flex-2 overflow-hidden min-w-75 max-w-105">
          <CartPanel branchId={branchId} autoConfirmOnPlace={autoConfirmOnPlace} />
        </div>
      </div>

      {/* ── Mobile: tab-based layout ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        <div className="flex-1 overflow-hidden">
          {mobileTab === "menu" ? (
            <div className="h-full bg-[#f9f8f6]">
              <MenuPanel />
            </div>
          ) : (
            <CartPanel branchId={branchId} autoConfirmOnPlace={autoConfirmOnPlace} />
          )}
        </div>

        {/* Mobile tab bar */}
        <div className="shrink-0 border-t border-[#ebe9e4] bg-white flex">
          <button
            type="button"
            onClick={() => setMobileTab("menu")}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors",
              mobileTab === "menu" ? "text-[#e8570e]" : "text-[#8a8680] hover:text-[#4a4744]"
            )}
          >
            <UtensilsCrossed size={18} />
            Menu
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors relative",
              mobileTab === "cart" ? "text-[#e8570e]" : "text-[#8a8680] hover:text-[#4a4744]"
            )}
          >
            <div className="relative">
              <ShoppingCart size={18} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#e8570e] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </div>
            Cart
          </button>
        </div>
      </div>
    </div>
  );
}