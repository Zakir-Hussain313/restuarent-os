"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/store/usePosStore";
import { getRidersForBranchAction, type RiderOption } from "@/features/deliveries/actions";

interface RiderSelectorProps {
  branchId: string;
}

export function RiderSelector({ branchId }: RiderSelectorProps) {
  const selectedRiderId = usePosStore((s) => s.selectedRiderId);
  const setSelectedRiderId = usePosStore((s) => s.setSelectedRiderId);

  const [riders, setRiders] = useState<RiderOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getRidersForBranchAction(branchId).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setRiders(res.riders);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Rider
      </label>
      <select
        value={selectedRiderId ?? ""}
        onChange={(e) => setSelectedRiderId(e.target.value || undefined)}
        disabled={isLoading}
        className="w-full px-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">Assign later</option>
        <option value="auto">Automatic</option>
        {riders
          .filter((r) => r.isAvailable && !r.isBusy)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
      </select>
      {!isLoading && riders.filter((r) => r.isAvailable && !r.isBusy).length === 0 && (
        <p className="text-xs text-muted-foreground">
          No riders online and free right now.
        </p>
      )}
    </div>
  );
}