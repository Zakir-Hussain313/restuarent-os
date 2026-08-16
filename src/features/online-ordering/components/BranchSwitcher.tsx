"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { useLocationStore } from "@/store/useLocationStore";
import { useCustomerCartStore } from "@/store/useCustomerCartStore";
import { usePublicBranchesByCity } from "@/features/online-ordering/hooks/useOnlineOrdering";

interface BranchSwitcherProps {
  mode: "delivery" | "dineIn";
}

export function BranchSwitcher({ mode }: BranchSwitcherProps) {
  const location = useLocationStore((s) => s.location);
  const setLocation = useLocationStore((s) => s.setLocation);
  const items = useCustomerCartStore((s) => s.items);
  const clearCart = useCustomerCartStore((s) => s.clearCart);

  const [isOpen, setIsOpen] = useState(false);
  const [pendingBranch, setPendingBranch] = useState<{ id: string; name: string } | null>(null);

  const { branches } = usePublicBranchesByCity(location?.city ?? null);

  // Single-branch tenants never have a saved location — nothing to switch.
  if (!location) return null;

  const currentBranchName =
    branches.find((b) => b.id === location.branchId)?.name ?? "your branch";

  function handleBranchPick(branchId: string, name: string) {
    if (branchId === location!.branchId) {
      setIsOpen(false);
      return;
    }

    if (mode === "delivery" && items.length > 0) {
      setPendingBranch({ id: branchId, name });
      return;
    }

    setLocation({ branchId, city: location!.city, area: undefined });
    setIsOpen(false);
  }

  function confirmSwitch() {
    if (!pendingBranch) return;
    clearCart();
    setLocation({ branchId: pendingBranch.id, city: location!.city, area: undefined });
    setPendingBranch(null);
    setIsOpen(false);
  }

  const label = mode === "delivery" ? "Ordering from" : "Booking at";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 relative">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4a4744] bg-white border border-[#ebe9e4] rounded-full px-3 py-1.5 hover:border-[#e8570e] transition-colors"
      >
        <MapPin className="w-3.5 h-3.5 text-[#e8570e]" />
        {label}: <span className="font-semibold text-[#1a1815]">{currentBranchName}</span>
        <span className="text-[#e8570e]">· Change</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 bg-white rounded-xl border border-[#ebe9e4] shadow-lg p-2">
          <p className="text-xs font-medium text-[#8a8680] uppercase tracking-wide px-2 py-1">
            Branches in {location.city}
          </p>
          <div className="space-y-1">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => handleBranchPick(b.id, b.name)}
                className="w-full flex flex-col items-start px-3 py-2 rounded-lg hover:bg-[#faf9f7] text-left"
              >
                <span className="text-sm font-medium text-[#1a1815]">{b.name}</span>
                {b.address && (
                  <span className="text-xs text-[#8a8680]">{b.address}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {pendingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm text-[#1a1815]">
              Switching branches will clear your cart. Complete your order from
              this branch first, then switch your branch to order from there.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingBranch(null)}
                className="text-sm font-medium text-[#4a4744] px-4 py-2 rounded-xl hover:bg-[#faf9f7]"
              >
                Cancel
              </button>
              <button
                onClick={confirmSwitch}
                className="text-sm font-semibold text-white bg-[#e8570e] hover:bg-[#c44a0c] px-4 py-2 rounded-xl"
              >
                Switch anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}