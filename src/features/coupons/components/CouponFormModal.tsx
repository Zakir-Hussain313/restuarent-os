"use client";

import { useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker, toDateKey, fromDateKey } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const checkboxClass = "w-4 h-4 rounded border-input cursor-pointer";
const checkboxStyle = { accentColor: "var(--primary)" } as const;
const optionRowClass =
  "flex items-center gap-2 text-sm cursor-pointer rounded-lg px-2 py-1.5 transition-colors hover:bg-primary-light hover:text-primary";
const groupBoxClass =
  "space-y-1 rounded-xl border border-input bg-background p-2";

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
  const structuralFieldsLocked = false;

  const [applyToAllBranches, setApplyToAllBranches] = useState(entity ? entity.branchIds === null : true);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(entity?.branchIds ?? []);

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
  const validFromValue = useWatch({ control, name: "validFrom" });

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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-xl border border-border mx-4 max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Coupon" : "Add Coupon"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col min-h-0">
          <div className="overflow-y-auto themed-scrollbar px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name")}
                placeholder="e.g. Weekend Special"
                className={cn(errors.name && "border-destructive focus:ring-destructive/30")}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Description
              </label>
              <Input
                {...register("description")}
                placeholder="Shown to staff in the POS picker"
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
                  <Controller
                    control={control}
                    name="discountType"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type">
                            {(value: string) => (value === "percentage" ? "Percentage" : "Fixed Amount")}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Value {discountType === "percentage" ? "(%)" : ""} <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  step="1"
                  {...register("discountValue")}
                  className={cn(errors.discountValue && "border-destructive focus:ring-destructive/30")}
                />
                {errors.discountValue && (
                  <p className="text-xs text-destructive mt-1">{errors.discountValue.message}</p>
                )}
              </div>
            </div>

            {/* Max uses */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Max Uses
              </label>
              {structuralFieldsLocked ? (
                <p className="h-9 flex items-center text-sm text-muted-foreground">
                  {entity!.maxUses ?? "Unlimited"}
                </p>
              ) : (
                <Input
                  type="number"
                  step="1"
                  placeholder="Leave empty for unlimited"
                  {...register("maxUses")}
                />
              )}
            </div>

            {/* Valid from / to */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Valid From
              </label>
              <Controller
                control={control}
                name="validFrom"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? fromDateKey(field.value) : null}
                    onChange={(date) => field.onChange(date ? toDateKey(date) : "")}
                    min={new Date()}
                  />
                )}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Valid To
              </label>
              <Controller
                control={control}
                name="validTo"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? fromDateKey(field.value) : null}
                    onChange={(date) => field.onChange(date ? toDateKey(date) : "")}
                    min={validFromValue ? fromDateKey(validFromValue) : new Date()}
                  />
                )}
              />
            </div>

            {/* Branch scope */}
            {!structuralFieldsLocked && isSuperAdmin && branches && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Branches
                </label>
                <div className={groupBoxClass}>
                  <label className={optionRowClass}>
                    <input
                      type="checkbox"
                      checked={applyToAllBranches}
                      onChange={(e) => setApplyToAllBranches(e.target.checked)}
                      className={checkboxClass}
                      style={checkboxStyle}
                    />
                    All branches
                  </label>
                  {!applyToAllBranches && (
                    <div className="pl-3 space-y-1 pt-1 border-t border-border">
                      {branches.map((b) => (
                        <label key={b.id} className={optionRowClass}>
                          <input
                            type="checkbox"
                            checked={selectedBranchIds.includes(b.id)}
                            onChange={() => toggleBranch(b.id)}
                            className={checkboxClass}
                            style={checkboxStyle}
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

            {/* Dish scope */}
            {!structuralFieldsLocked && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Applies To
                </label>
                <div className={groupBoxClass}>
                  <label className={optionRowClass}>
                    <input
                      type="checkbox"
                      checked={applyToAllDishes}
                      onChange={(e) => setApplyToAllDishes(e.target.checked)}
                      className={checkboxClass}
                      style={checkboxStyle}
                    />
                    Whole order (all dishes)
                  </label>
                  {!applyToAllDishes && (
                    <div className="pl-3 space-y-2 pt-1 border-t border-border max-h-48 overflow-y-auto themed-scrollbar">
                      {isMenuLoading && (
                        <p className="text-xs text-muted-foreground px-2">Loading menu...</p>
                      )}
                      {categories.map((cat) => {
                        const catItems = itemsByCategory(cat.id);
                        if (catItems.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <p className="text-xs font-medium text-muted-foreground mb-1 px-2">{cat.name}</p>
                            <div className="space-y-0.5">
                              {catItems.map((item) => (
                                <label key={item.id} className={optionRowClass}>
                                  <input
                                    type="checkbox"
                                    checked={selectedMenuItemIds.includes(item.id)}
                                    onChange={() => toggleMenuItem(item.id)}
                                    className={checkboxClass}
                                    style={checkboxStyle}
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

            {/* Active toggle */}
            {isEdit && (
              <label className={optionRowClass}>
                <input type="checkbox" {...register("isActive")} className={checkboxClass} style={checkboxStyle} />
                Active
              </label>
            )}
          </div>

          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isEdit ? "Save Changes" : "Add Coupon"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}