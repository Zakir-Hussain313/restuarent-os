"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Coupon } from "@/db/schema/orders";
import type { CreateCouponInput, UpdateCouponInput } from "@/features/coupons/hooks/useCouponActions";
import { useMenu } from "@/features/menu/hooks/useMenu";

// ─── Schema ───────────────────────────────────────────────────────────────

const couponFormSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(300).optional(),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().positive("Must be greater than 0"),
    maxUses: z.string().optional(), // empty string = unlimited, parsed at submit
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.discountType !== "percentage" || data.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

type CouponFormInput = z.input<typeof couponFormSchema>;
type CouponFormValues = z.output<typeof couponFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────

interface CouponFormModalProps {
  isOpen: boolean;
  entity: Coupon | null; // null = create mode
  isSuperAdmin: boolean;
  branches: { id: string; name: string }[] | null; // null for ADMIN
  isLoading: boolean;
  onSubmit: (input: CreateCouponInput | UpdateCouponInput) => void;
  onClose: () => void;
}

const inputClass = "w-full h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground";

// ─── Component ────────────────────────────────────────────────────────────

export function CouponFormModal({
  isOpen,
  entity,
  isSuperAdmin,
  branches,
  isLoading,
  onSubmit,
  onClose,
}: CouponFormModalProps) {
  const isEdit = !!entity;
  // Structural fields (discountType, maxUses, branch/dish scope) are only
  // safely editable before the coupon has ever been used — see
  // updateCouponAction for the matching server-side guard.
  const structuralFieldsLocked = false;

  // Branch selection — kept outside RHF since the checkbox list is dynamic.
  // Create-only; branch scope is fixed at creation and never edited later.
  const [applyToAllBranches, setApplyToAllBranches] = useState(entity ? entity.branchIds === null : true);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(entity?.branchIds ?? []);

  // Dish scope — create-only, same reasoning as branch scope: fixed at
  // creation, never edited later (structural field, see updateCouponAction).
  const [applyToAllDishes, setApplyToAllDishes] = useState(entity ? entity.menuItemIds === null : true);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<string[]>(entity?.menuItemIds ?? []);
  const { categories, itemsByCategory, isLoading: isMenuLoading } = useMenu();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CouponFormInput, unknown, CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: entity
      ? {
        name: entity.name,
        description: entity.description ?? "",
        discountType: entity.discountType,
        discountValue: entity.discountValue,
        maxUses: entity.maxUses ? String(entity.maxUses) : "",
        validFrom: entity.validFrom ? new Date(entity.validFrom).toISOString().slice(0, 10) : "",
        validTo: entity.validTo ? new Date(entity.validTo).toISOString().slice(0, 10) : "",
        isActive: entity.isActive,
      }
      : {
        name: "",
        description: "",
        discountType: "percentage",
        discountValue: 0,
        maxUses: "",
        validFrom: "",
        validTo: "",
        isActive: true,
      },
  });

  const discountType = useWatch({ control, name: "discountType" });

  if (!isOpen) return null;

  const submit = (values: CouponFormValues) => {
    if (isEdit) {
      onSubmit({
        name: values.name,
        description: values.description,
        discountValue: values.discountValue,
        validFrom: values.validFrom ? new Date(values.validFrom) : null,
        validTo: values.validTo ? new Date(values.validTo) : null,
        isActive: values.isActive,
        ...(!structuralFieldsLocked
          ? {
            discountType: values.discountType,
            maxUses: values.maxUses ? Number(values.maxUses) : null,
            branchIds: isSuperAdmin ? (!applyToAllBranches ? selectedBranchIds : null) : entity!.branchIds,
            menuItemIds: !applyToAllDishes && selectedMenuItemIds.length > 0 ? selectedMenuItemIds : null,
          }
          : {}),
      } satisfies UpdateCouponInput);
    } else {
      onSubmit({
        name: values.name,
        description: values.description,
        discountType: values.discountType,
        discountValue: values.discountValue,
        validFrom: values.validFrom ? new Date(values.validFrom) : undefined,
        validTo: values.validTo ? new Date(values.validTo) : undefined,
        maxUses: values.maxUses ? Number(values.maxUses) : undefined,
        branchIds: isSuperAdmin && !applyToAllBranches ? selectedBranchIds : undefined,
        menuItemIds: !applyToAllDishes && selectedMenuItemIds.length > 0 ? selectedMenuItemIds : undefined,
      } satisfies CreateCouponInput);
    }
  };

  const toggleBranch = (branchId: string) => {
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  const toggleMenuItem = (itemId: string) => {
    setSelectedMenuItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-background rounded-2xl shadow-xl border p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-red-600">
            {isEdit ? "Edit Coupon" : "Add Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name <span className="text-destructive">*</span>
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Weekend Special"
              className={cn(inputClass, errors.name && "border-destructive focus:ring-destructive/30")}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <input
              {...register("description")}
              placeholder="Shown to staff in the POS picker"
              className={inputClass}
            />
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Discount Type <span className="text-destructive">*</span>
              </label>
              {structuralFieldsLocked ? (
                <p className="h-9 flex items-center text-sm text-muted-foreground">
                  {entity!.discountType === "percentage" ? "Percentage" : "Fixed Amount"}
                </p>
              ) : (
                <select {...register("discountType")} className={inputClass}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Value {discountType === "percentage" ? "(%)" : ""} <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="1"
                {...register("discountValue")}
                className={cn(inputClass, errors.discountValue && "border-destructive focus:ring-destructive/30")}
              />
              {errors.discountValue && (
                <p className="text-xs text-destructive mt-1">{errors.discountValue.message}</p>
              )}
            </div>
          </div>

          {/* Max uses — create only, structural/locked after creation */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Max Uses
            </label>
            {structuralFieldsLocked ? (
              <p className="h-9 flex items-center text-sm text-muted-foreground">
                {entity!.maxUses ?? "Unlimited"}
              </p>
            ) : (
              <input
                type="number"
                step="1"
                placeholder="Leave empty for unlimited"
                {...register("maxUses")}
                className={inputClass}
              />
            )}
          </div>

          {/* Valid from / to */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Valid From
              </label>
              <input type="date" {...register("validFrom")} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Valid To
              </label>
              <input type="date" {...register("validTo")} className={inputClass} />
            </div>
          </div>

          {/* Branch scope — editable only while structural fields are
              unlocked (never used yet), SUPER_ADMIN only */}
          {!structuralFieldsLocked && isSuperAdmin && branches && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Branches
              </label>
              <div className="space-y-2 border rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyToAllBranches}
                    onChange={(e) => setApplyToAllBranches(e.target.checked)}
                  />
                  All branches
                </label>
                {!applyToAllBranches && (
                  <div className="pl-5 space-y-1.5 pt-1 border-t">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedBranchIds.includes(b.id)}
                          onChange={() => toggleBranch(b.id)}
                        />
                        {b.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {structuralFieldsLocked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Branches
              </label>
              <p className="text-sm text-muted-foreground">
                {entity!.branchIds === null
                  ? "All branches"
                  : `${entity!.branchIds.length} branch${entity!.branchIds.length === 1 ? "" : "es"}`}
              </p>
            </div>
          )}

          {/* Dish scope — editable only while structural fields are
              unlocked, same pattern as branch scope above */}
          {!structuralFieldsLocked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Applies To
              </label>
              <div className="space-y-2 border rounded-lg p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyToAllDishes}
                    onChange={(e) => setApplyToAllDishes(e.target.checked)}
                  />
                  Whole order (all dishes)
                </label>
                {!applyToAllDishes && (
                  <div className="pl-5 space-y-3 pt-1 border-t max-h-48 overflow-y-auto">
                    {isMenuLoading && (
                      <p className="text-xs text-muted-foreground">Loading menu...</p>
                    )}
                    {categories.map((cat) => {
                      const catItems = itemsByCategory(cat.id);
                      if (catItems.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{cat.name}</p>
                          <div className="space-y-1.5">
                            {catItems.map((item) => (
                              <label key={item.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedMenuItemIds.includes(item.id)}
                                  onChange={() => toggleMenuItem(item.id)}
                                />
                                {item.name}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {structuralFieldsLocked && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Applies To
              </label>
              <p className="text-sm text-muted-foreground">
                {entity!.menuItemIds === null
                  ? "Whole order"
                  : `${entity!.menuItemIds.length} dish${entity!.menuItemIds.length === 1 ? "" : "es"}`}
              </p>
            </div>
          )}

          {/* Active toggle — edit only */}
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("isActive")} />
              Active
            </label>
          )}

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
              {isEdit ? "Save Changes" : "Add Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}