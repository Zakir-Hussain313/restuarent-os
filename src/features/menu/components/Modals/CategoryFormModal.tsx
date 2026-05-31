"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuCategory } from "@/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name:        z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional(),
  icon:        z.string().max(10).optional(),
  isActive:    z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CategoryFormModalProps {
  isOpen: boolean;
  category: MenuCategory | null; // null = add mode
  isLoading: boolean;
  onSubmit: (values: CategoryFormValues) => void;
  onClose: () => void;
}

// ─── Common input class ───────────────────────────────────────────────────────

const inputClass = "w-full h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground";

// ─── Component ────────────────────────────────────────────────────────────────

export function CategoryFormModal({
  isOpen,
  category,
  isLoading,
  onSubmit,
  onClose,
}: CategoryFormModalProps) {
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "", icon: "", isActive: true },
  });

  // Populate form when editing
  useEffect(() => {
    if (category) {
      reset({
        name:        category.name,
        description: category.description ?? "",
        icon:        category.icon ?? "",
        isActive:    category.isActive,
      });
    } else {
      reset({ name: "", description: "", icon: "", isActive: true });
    }
  }, [category, reset]);

  if (!isOpen) return null;

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
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Category Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. BBQ & Grill"
              className={cn(inputClass, errors.name && "border-destructive focus:ring-destructive/30")}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Icon + Active row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Icon (emoji)
              </label>
              <input
                {...register("icon")}
                placeholder="🔥"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Active
              </label>
              <div className="h-9 flex items-center">
                <input
                  type="checkbox"
                  {...register("isActive")}
                  className="w-4 h-4 accent-primary"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <textarea
              {...register("description")}
              placeholder="Short description of this category..."
              rows={3}
              className={cn(inputClass, "h-auto py-2 resize-none")}
            />
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
              {isEdit ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}