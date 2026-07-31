// src/features/delivery-areas/components/DeliveryAreaFormModal.tsx
"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { branchDeliveryAreas } from "@/db/schema";
import type { DeliveryAreaInput } from "@/features/delivery-areas/actions";

type DeliveryArea = typeof branchDeliveryAreas.$inferSelect;

// ─── Schema ───────────────────────────────────────────────────────────────────

const deliveryAreaSchema = z.object({
  city: z.string().min(1, "City is required").max(50),
  area: z.string().min(1, "Area is required").max(80),
});

type DeliveryAreaFormValues = z.infer<typeof deliveryAreaSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeliveryAreaFormModalProps {
  isOpen: boolean;
  entity: DeliveryArea | null; // null = add mode
  branchId: string;
  isLoading: boolean;
  onSubmit: (values: DeliveryAreaInput) => void;
  onClose: () => void;
}

// ─── Common input class ───────────────────────────────────────────────────────

const inputClass = "w-full h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground";

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliveryAreaFormModal({
  isOpen,
  entity,
  branchId,
  isLoading,
  onSubmit,
  onClose,
}: DeliveryAreaFormModalProps) {
  const isEdit = !!entity;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DeliveryAreaFormValues>({
    resolver: zodResolver(deliveryAreaSchema),
    defaultValues: { city: "", area: "" },
  });

  // Populate form when editing
  useEffect(() => {
    if (!isOpen) return;
    if (entity) {
      reset({ city: entity.city, area: entity.area });
    } else {
      reset({ city: "", area: "" });
    }
  }, [isOpen, entity, reset]);

  if (!isOpen) return null;

  const submit = (values: DeliveryAreaFormValues) => {
    onSubmit({ branchId, city: values.city, area: values.area });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-xl border p-6 mx-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Delivery Area" : "Add Delivery Area"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(submit)} className="space-y-4">

          {/* City */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              City <span className="text-destructive">*</span>
            </label>
            <input
              {...register("city")}
              placeholder="e.g. Quetta"
              className={cn(inputClass, errors.city && "border-destructive focus:ring-destructive/30")}
            />
            {errors.city && (
              <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
            )}
          </div>

          {/* Area */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Area <span className="text-destructive">*</span>
            </label>
            <input
              {...register("area")}
              placeholder="e.g. Jinnah Town"
              className={cn(inputClass, errors.area && "border-destructive focus:ring-destructive/30")}
            />
            {errors.area && (
              <p className="text-xs text-destructive mt-1">{errors.area.message}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Area"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}