"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuCategory, MenuItem } from "@/types";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";

// ─── Schema ───────────────────────────────────────────────────────────────────

const variantSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Required"),
    price: z.number().min(0, "Required"),
    isDefault: z.boolean(),
    isAvailable: z.boolean(),
});

const modifierOptionSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Required"),
    priceAdjustment: z.number(),
    isDefault: z.boolean(),
    isAvailable: z.boolean(),
});

const modifierGroupSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Required"),
    isRequired: z.boolean(),
    minSelections: z.number().min(0),
    maxSelections: z.number().min(1),
    options: z.array(modifierOptionSchema).min(1, "Add at least one option"),
});

const itemSchema = z.object({
    categoryId: z.string().min(1, "Category is required"),
    name: z.string().min(1, "Name is required").max(100),
    basePrice: z.number().min(0, "Price is required"),
    status: z.enum(["available", "unavailable", "out_of_stock"]),
    variants: z.array(variantSchema),
    modifierGroups: z.array(modifierGroupSchema),
});

type ItemFormValues = z.infer<typeof itemSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface ItemFormModalProps {
    isOpen: boolean;
    item: MenuItem | null;
    categories: MenuCategory[];
    isLoading: boolean;
    onSubmit: (values: ItemFormValues) => void;
    onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass = "w-full h-9 px-3 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground";
const labelClass = "text-xs font-medium text-muted-foreground mb-1.5 block";

const STATUS_OPTIONS = ["available", "out_of_stock", "unavailable"] as const;

const DEFAULT_VALUES: ItemFormValues = {
    categoryId: "",
    name: "",
    basePrice: 0,
    status: "available",
    variants: [],
    modifierGroups: [],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
            {children}
        </h3>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemFormModal({
    isOpen,
    item,
    categories,
    isLoading,
    onSubmit,
    onClose,
}: ItemFormModalProps) {
    const isEdit = !!item;

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: DEFAULT_VALUES,
    });

    const {
        fields: variantFields,
        append: appendVariant,
        remove: removeVariant,
    } = useFieldArray({ control, name: "variants" });

    const {
        fields: modifierFields,
        append: appendModifier,
        remove: removeModifier,
    } = useFieldArray({ control, name: "modifierGroups" });

    useEffect(() => {
        if (!isOpen) return;
        if (item) {
            reset({
                categoryId: item.categoryId,
                name: item.name,
                basePrice: item.basePrice,
                status: item.status,
                variants: item.variants,
                modifierGroups: item.modifierGroups,
            });
        } else {
            reset(DEFAULT_VALUES);
        }
    }, [isOpen, item, reset]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-xl border mx-4 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold">{isEdit ? "Edit Item" : "Add Item"}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
                    <form id="item-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                        <SectionTitle>Basic Info</SectionTitle>

                        {/* Category */}
                        <div>
                            <label className={labelClass}>Category <span className="text-destructive">*</span></label>
                            <select {...register("categoryId")} className={cn(inputClass, errors.categoryId && "border-destructive")}>
                                <option value="">Select category...</option>
                                {categories.filter((c) => c.isActive).map((c) => (
                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                ))}
                            </select>
                            {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
                        </div>

                        {/* Name */}
                        <div>
                            <label className={labelClass}>Item Name <span className="text-destructive">*</span></label>
                            <input {...register("name")} placeholder="e.g. Chicken Tikka" className={cn(inputClass, errors.name && "border-destructive")} />
                            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                        </div>

                        {/* Price + Status */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Base Price (Rs.) <span className="text-destructive">*</span></label>
                                <input type="number" {...register("basePrice", { valueAsNumber: true })} placeholder="0" className={cn(inputClass, errors.basePrice && "border-destructive")} />
                                {errors.basePrice && <p className="text-xs text-destructive mt-1">{errors.basePrice.message}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Status</label>
                                <select {...register("status")} className={inputClass}>
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Variants */}
                        <SectionTitle>Variants</SectionTitle>
                        <div className="space-y-2">
                            {variantFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                                    <input
                                        {...register(`variants.${index}.name`)}
                                        placeholder="e.g. Half kg"
                                        className={cn(inputClass, "flex-2")}
                                    />
                                    <input
                                        type="number"
                                        {...register(`variants.${index}.price`, { valueAsNumber: true })}
                                        placeholder="Price"
                                        className={cn(inputClass, "flex-1")}
                                    />
                                    <label className="flex items-center gap-1.5 text-xs shrink-0">
                                        <input type="checkbox" {...register(`variants.${index}.isDefault`)} className="w-3.5 h-3.5 accent-primary" />
                                        Default
                                    </label>
                                    <button type="button" onClick={() => removeVariant(index)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => appendVariant({ name: "", price: 0, isDefault: false, isAvailable: true })}
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Variant
                            </button>
                        </div>

                        {/* Modifier Groups */}
                        <SectionTitle>Modifier Groups</SectionTitle>
                        <div className="space-y-3">
                            {modifierFields.map((field, groupIndex) => (
                                <div key={field.id} className="border rounded-xl p-4 space-y-3 bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <input
                                            {...register(`modifierGroups.${groupIndex}.name`)}
                                            placeholder="e.g. Oil Preference"
                                            className={cn(inputClass, "flex-1")}
                                        />
                                        {errors.modifierGroups?.[groupIndex]?.name && (
                                            <p className="text-xs text-destructive mt-1">
                                                {errors.modifierGroups[groupIndex]?.name?.message}
                                            </p>
                                        )}
                                        <label className="flex items-center gap-1.5 text-xs shrink-0">
                                            <input type="checkbox" {...register(`modifierGroups.${groupIndex}.isRequired`)} className="w-3.5 h-3.5 accent-primary" />
                                            Required
                                        </label>
                                        <button type="button" onClick={() => removeModifier(groupIndex)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className={labelClass}>Min Selections</label>
                                            <input type="number" {...register(`modifierGroups.${groupIndex}.minSelections`, { valueAsNumber: true })} className={inputClass} />
                                        </div>
                                        <div className="flex-1">
                                            <label className={labelClass}>Max Selections</label>
                                            <input type="number" {...register(`modifierGroups.${groupIndex}.maxSelections`, { valueAsNumber: true })} className={inputClass} />
                                        </div>
                                    </div>
                                    <ModifierOptions control={control} register={register} errors={errors} groupIndex={groupIndex} />
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => appendModifier({ name: "", isRequired: false, minSelections: 0, maxSelections: 1, options: [{ name: "", priceAdjustment: 0, isDefault: false, isAvailable: true }] })}
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Modifier Group
                            </button>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t bg-white">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="item-form"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isEdit ? "Save Changes" : "Add Item"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modifier Options ─────────────────────────────────────────────────────────

function ModifierOptions({
    control,
    register,
    errors,
    groupIndex,
}: {
    control: Control<ItemFormValues>;
    register: UseFormRegister<ItemFormValues>;
    errors: FieldErrors<ItemFormValues>;
    groupIndex: number;
}) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: `modifierGroups.${groupIndex}.options`,
    });

    return (
        <div className="space-y-2">
            <label className={labelClass}>Options</label>
            {fields.map((field, optIndex) => (
                <div key={field.id} className="flex items-center gap-2">
                    <input
                        {...register(`modifierGroups.${groupIndex}.options.${optIndex}.name`)}
                        placeholder="e.g. Desi Ghee"
                        className={cn(inputClass, "flex-2")}
                    />
                    {errors.modifierGroups?.[groupIndex]?.options?.[optIndex]?.name && (
                        <p className="text-xs text-destructive mt-1">
                            {errors.modifierGroups[groupIndex]?.options?.[optIndex]?.name?.message}
                        </p>
                    )}
                    <input
                        type="number"
                        {...register(`modifierGroups.${groupIndex}.options.${optIndex}.priceAdjustment`, { valueAsNumber: true })}
                        placeholder="+0"
                        className={cn(inputClass, "flex-1")}
                    />
                    <label className="flex items-center gap-1.5 text-xs shrink-0">
                        <input type="checkbox" {...register(`modifierGroups.${groupIndex}.options.${optIndex}.isDefault`)} className="w-3.5 h-3.5 accent-primary" />
                        Default
                    </label>
                    <button type="button" onClick={() => remove(optIndex)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
            <button
                type="button"
                onClick={() => append({ name: "", priceAdjustment: 0, isDefault: false, isAvailable: true })}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                <Plus className="w-3 h-3" />
                Add Option
            </button>
        </div>
    );
}