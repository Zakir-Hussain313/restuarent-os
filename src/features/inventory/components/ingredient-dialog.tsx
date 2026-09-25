"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Upload, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createIngredientAction,
  updateIngredientAction,
} from "@/features/inventory/actions";
import { uploadEntityImage } from "@/features/uploads/actions";
import type { IngredientWithStatus } from "@/features/inventory/actions";
import type { Ingredient } from "@/db/schema";

const UNITS: Ingredient["unit"][] = ["kg", "g", "l", "ml", "pcs"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface IngredientDialogProps {
  ingredient?: IngredientWithStatus;
  branchId: string;
}

export function IngredientDialog({ ingredient: editTarget, branchId }: IngredientDialogProps) {
  const router = useRouter();
  const isEditMode = !!editTarget;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(editTarget?.name ?? "");
  const [unit, setUnit] = useState<Ingredient["unit"]>(editTarget?.unit ?? "kg");
  const [threshold, setThreshold] = useState(
    editTarget?.lowStockThreshold != null ? String(editTarget.lowStockThreshold) : ""
  );
  const [isActive, setIsActive] = useState(editTarget?.isActive ?? true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(editTarget?.image ?? null);

  function resetForm() {
    setName(editTarget?.name ?? "");
    setUnit(editTarget?.unit ?? "kg");
    setThreshold(editTarget?.lowStockThreshold != null ? String(editTarget.lowStockThreshold) : "");
    setIsActive(editTarget?.isActive ?? true);
    setError(null);
    setSelectedFile(null);
    setPreviewUrl(editTarget?.image ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearSelectedImage() {
    setSelectedFile(null);
    setPreviewUrl(editTarget?.image ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImageFor(entityId: string): Promise<string | null> {
    if (!selectedFile) return null;
    const fd = new FormData();
    fd.set("entityType", "ingredient");
    fd.set("entityId", entityId);
    fd.set("file", selectedFile);

    const result = await uploadEntityImage(fd);
    if (result.error || !result.url) {
      throw new Error(result.error ?? "Image upload failed.");
    }
    return result.url;
  }

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);

    const lowStockThreshold = threshold.trim() === "" ? null : Number(threshold);

    try {
      if (isEditMode) {
        let imageUrl: string | undefined;
        if (selectedFile) {
          imageUrl = (await uploadImageFor(editTarget!.id)) ?? undefined;
        }

        const result = await updateIngredientAction(editTarget!.id, {
          name,
          unit,
          lowStockThreshold,
          isActive,
          ...(imageUrl ? { image: imageUrl } : {}),
        });

        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const created = await createIngredientAction({ name, unit, lowStockThreshold, branchId });

        if (created.error) {
          setError(created.error);
          return;
        }

        if (selectedFile && created.data) {
          const imageUrl = await uploadImageFor(created.data.id);
          if (imageUrl) {
            await updateIngredientAction(created.data.id, { image: imageUrl });
          }
        }
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          isEditMode ? (
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Pencil className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Ingredient
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Ingredient" : "Add Ingredient"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-secondary border border-border flex items-center justify-center shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {previewUrl ? "Change" : "Upload"}
                </Button>
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={clearSelectedImage}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Breast" />
          </div>

          <div className="space-y-1.5">
            <Label>Unit</Label>
            <Select
              value={unit}
              onValueChange={(v) => v && setUnit(v as Ingredient["unit"])}
              disabled={isEditMode && editTarget!.currentStock !== 0 /* unit locks once stock moves */}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{() => unit}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Low-Stock Threshold (optional)</Label>
            <Input
              type="number"
              min={0}
              step="0.001"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>

          {isEditMode && (
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}