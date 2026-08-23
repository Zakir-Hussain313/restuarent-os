"use client";

import { useEffect, useState } from "react";
import { usePosStore } from "@/store/usePosStore";
import { getRidersForBranchAction, type RiderOption } from "@/features/deliveries/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const availableRiders = riders.filter((r) => r.isAvailable && !r.isBusy);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Rider
      </label>
      <Select
        value={selectedRiderId ?? "later"}
        onValueChange={(value) =>
          setSelectedRiderId(!value || value === "later" ? undefined : value)
        }
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Assign later">
            {(value: string) =>
              value === "later"
                ? "Assign later"
                : value === "auto"
                  ? "Automatic"
                  : availableRiders.find((r) => r.id === value)?.name ?? "Assign later"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="later">Assign later</SelectItem>
          <SelectItem value="auto">Automatic</SelectItem>
          {availableRiders.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!isLoading && availableRiders.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No riders online and free right now.
        </p>
      )}
    </div>
  );
}