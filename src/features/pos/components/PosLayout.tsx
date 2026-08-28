"use client";

import { useState } from "react";
import { UtensilsCrossed, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePosCart } from "../hooks/usePosCart";
import { usePosMenu } from "../hooks/usePosMenu";
import { MenuPanel } from "./MenuPanel/MenuPanel";
import { CategoryPills } from "./MenuPanel/CategoryPills";
import { CartPanel } from "./CartPanel/CartPanel";

type MobileTab = "menu" | "cart";

interface PosLayoutProps {
  branchId?: string;
  autoConfirmOnPlace?: boolean;
  showClockButton?: boolean;
  initialIsClockedIn?: boolean;
}

export function PosLayout({ branchId, autoConfirmOnPlace, showClockButton, initialIsClockedIn }: PosLayoutProps) {
  const [mobileTab, setMobileTab] = useState<MobileTab>("menu");
  const { itemCount } = usePosCart();
  const menu = usePosMenu();

  return (
    <div className="flex flex-col h-full">
      {/* ── ≥1000px: two-panel split, sidebar categories ──────────────────── */}
      <div className="hidden min-[1000px]:flex flex-1 overflow-hidden">
        <div className="flex-3 overflow-hidden bg-background">
          <MenuPanel menu={menu} showSidebar showPills={false} />
        </div>
        <div className="flex-2 overflow-hidden min-w-75 max-w-105">
          <CartPanel
            branchId={branchId}
            autoConfirmOnPlace={autoConfirmOnPlace}
            showClockButton={showClockButton}
            initialIsClockedIn={initialIsClockedIn}
          />
        </div>
      </div>

      {/* â”€â”€ 760pxâ€“999px: full-width pills on top, menu + cart split below â”€â”€ */}
      <div className="hidden min-[760px]:flex min-[1000px]:hidden flex-col flex-1 overflow-hidden">
        <div className="shrink-0 border-b border-border overflow-x-auto bg-background">
          <CategoryPills
            categories={menu.categories}
            selectedCategoryId={menu.selectedCategoryId}
            onSelect={menu.setSelectedCategoryId}
            isLoading={menu.isLoading}
          />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-3 overflow-hidden bg-background">
            <MenuPanel menu={menu} showSidebar={false} showPills={false} />
          </div>
          <div className="flex-2 overflow-hidden min-w-75 max-w-105">
            <CartPanel
              branchId={branchId}
              autoConfirmOnPlace={autoConfirmOnPlace}
              showClockButton={showClockButton}
              initialIsClockedIn={initialIsClockedIn}
            />
          </div>
        </div>
      </div>
      {/* ── <760px: tab-based layout ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-[760px]:hidden">
        <div className="flex-1 overflow-hidden">
          {mobileTab === "menu" ? (
            <div className="h-full bg-background">
              <MenuPanel menu={menu} showSidebar={false} showPills />
            </div>
          ) : (
            <CartPanel
              branchId={branchId}
              autoConfirmOnPlace={autoConfirmOnPlace}
              showClockButton={showClockButton}
              initialIsClockedIn={initialIsClockedIn}
            />
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-white flex">
          <button
            type="button"
            onClick={() => setMobileTab("menu")}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-4 text-sm font-medium transition-colors",
              mobileTab === "menu" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UtensilsCrossed size={24} />
            Menu
          </button>

          <button
            type="button"
            onClick={() => setMobileTab("cart")}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-4 text-sm font-medium transition-colors relative",
              mobileTab === "cart" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="relative">
              <ShoppingCart size={24} />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-coral text-coral-foreground text-[9px] font-bold flex items-center justify-center tabular-nums">
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