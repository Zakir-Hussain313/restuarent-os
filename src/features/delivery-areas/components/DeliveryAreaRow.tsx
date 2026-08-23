// src/features/delivery-areas/components/DeliveryAreaRow.tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { branchDeliveryAreas } from "@/db/schema";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

type DeliveryArea = typeof branchDeliveryAreas.$inferSelect;

interface DeliveryAreaRowProps {
  area: DeliveryArea;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeliveryAreaRow({ area, onEdit, onDelete }: DeliveryAreaRowProps) {
  const { showConfirm } = useAlertModal();
  
  return (
    <div className="flex items-center justify-between px-4 py-3 border rounded-lg bg-background">
      <div>
        <p className="text-sm font-medium">{area.area}</p>
        <p className="text-xs text-muted-foreground">{area.city}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Edit delivery area"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={async () => {
            const confirmed = await showConfirm(
              `Delete "${area.area}, ${area.city}"?`,
              { title: "Delete delivery area?", confirmLabel: "Delete", destructive: true }
            );
            if (confirmed) onDelete();
          }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Delete delivery area"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}