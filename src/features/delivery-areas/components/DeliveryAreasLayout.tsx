"use client";

import { useEffect, useState } from "react";
import { getBranchCountAction } from "@/features/delivery-areas/actions";
import { useDeliveryAreas } from "@/features/delivery-areas/hooks/useDeliveryAreas";
import { useDeliveryAreaActions } from "@/features/delivery-areas/hooks/useDeliveryAreaActions";
import { DeliveryAreaFormModal } from "./DeliveryAreaFormModal";
import { DeliveryAreaRow } from "./DeliveryAreaRow";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { branchDeliveryAreas } from "@/db/schema";

type DeliveryArea = typeof branchDeliveryAreas.$inferSelect;

interface DeliveryAreasLayoutProps {
  branchId: string;
}

export function DeliveryAreasLayout({ branchId }: DeliveryAreasLayoutProps) {
  const [branchCount, setBranchCount] = useState<number | null>(null);
  const [modal, setModal] = useState<{ isOpen: boolean; entity: DeliveryArea | null }>({
    isOpen: false,
    entity: null,
  });

  useEffect(() => {
    getBranchCountAction().then((res) => {
      setBranchCount(res.data ?? 0);
    });
  }, []);

  const { areas, isLoading, error } = useDeliveryAreas(branchId);
  const { addArea, isAddingArea, editArea, isEditingArea, deleteArea } =
    useDeliveryAreaActions(branchId);

  if (branchCount === null) return null;
  if (branchCount === 1) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setModal({ isOpen: true, entity: null })}>
          <Plus className="w-4 h-4 mr-2" />
          Add Delivery Area
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive py-8 text-center">{error}</p>
      ) : areas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No delivery areas added yet for this branch.
        </p>
      ) : (
        <div className="space-y-2">
          {areas.map((area) => (
            <DeliveryAreaRow
              key={area.id}
              area={area}
              onEdit={() => setModal({ isOpen: true, entity: area })}
              onDelete={() => deleteArea(area.id)}
            />
          ))}
        </div>
      )}

      <DeliveryAreaFormModal
        isOpen={modal.isOpen}
        entity={modal.entity}
        branchId={branchId}
        isLoading={modal.entity ? isEditingArea : isAddingArea}
        onSubmit={(input) => {
          if (modal.entity) {
            editArea(
              { id: modal.entity.id, input },
              { onSuccess: () => setModal({ isOpen: false, entity: null }) }
            );
          } else {
            addArea(input, { onSuccess: () => setModal({ isOpen: false, entity: null }) });
          }
        }}
        onClose={() => setModal({ isOpen: false, entity: null })}
      />
    </div>
  );
}