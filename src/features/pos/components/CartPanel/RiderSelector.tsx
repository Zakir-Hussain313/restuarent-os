"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePosStore } from "@/store/usePosStore";
import { getRidersForBranchAction } from "@/features/deliveries/actions";
import { useBranchChannel } from "@/lib/realtime/useBranchChannel";
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
  const queryClient = useQueryClient();

  const { data: riders = [], isLoading } = useQuery({
    queryKey: ["riders-for-branch", branchId],
    queryFn: async () => {
      const res = await getRidersForBranchAction(branchId);
      if (!res.success) throw new Error(res.error);
      return res.riders;
    },
  });

  const onRealtimeEvent = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["riders-for-branch", branchId] });
  }, [queryClient, branchId]);

  useBranchChannel(branchId, "riders", onRealtimeEvent);

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