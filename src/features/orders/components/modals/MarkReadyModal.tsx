"use client";

import { useEffect, useState } from "react";
import { Bike, Loader2, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRidersForBranchAction, type RiderOption } from "@/features/deliveries/actions";

interface MarkReadyModalProps {
  open: boolean;
  branchId: string;
  orderNumber: string;
  isSubmitting: boolean;
  onConfirm: (riderId: string | "auto") => void;
  onClose: () => void;
}

export function MarkReadyModal({
  open,
  branchId,
  orderNumber,
  isSubmitting,
  onConfirm,
  onClose,
}: MarkReadyModalProps) {
  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [isLoadingRiders, setIsLoadingRiders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadRiders() {
    setIsLoadingRiders(true);
    setError(null);
    const result = await getRidersForBranchAction(branchId);
    if (result.success) {
      setRiders(result.riders);
    } else {
      setError(result.error);
    }
    setIsLoadingRiders(false);
  }

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(loadRiders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branchId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bike className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Mark {orderNumber} Ready for Delivery
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

        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Select a rider</p>
            <button
              onClick={loadRiders}
              disabled={isLoadingRiders}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Refresh riders"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoadingRiders && "animate-spin")} />
            </button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {isLoadingRiders ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading riders...
            </div>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              <button
                onClick={() => onConfirm("auto")}
                disabled={isSubmitting}
                className="w-full flex items-center px-3 py-2 rounded-lg text-sm text-left transition-colors hover:bg-muted cursor-pointer disabled:opacity-50"
              >
                Automatic (pick a free rider)
              </button>
              {riders.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => onConfirm(rider.id)}
                  disabled={isSubmitting || rider.isBusy}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors",
                    rider.isBusy
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-muted cursor-pointer"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        rider.isAvailable ? "bg-emerald-500" : "bg-gray-300"
                      )}
                    />
                    {rider.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {rider.isBusy ? "On delivery" : rider.isAvailable ? "Online" : "Offline"}
                  </span>
                </button>
              ))}
              {riders.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  No riders found for this branch.
                </p>
              )}
            </div>
          )}
        </div>

        {isSubmitting && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-t text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Assigning...
          </div>
        )}
      </div>
    </div>
  );
}