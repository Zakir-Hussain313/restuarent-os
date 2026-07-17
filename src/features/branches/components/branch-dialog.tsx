"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Upload, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranchAction, updateBranchAction } from "@/features/branches/actions";
import { uploadEntityImage } from "@/features/uploads/actions";
import type { Branch } from "@/db/schema";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type FormState = {
  name: string;
  phone: string;
  email: string;
  address: string;
  isMainBranch: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  isMainBranch: false,
};

function buildEditForm(target: Branch): FormState {
  return {
    name: target.name,
    phone: target.phone ?? "",
    email: target.email ?? "",
    address: target.address ?? "",
    isMainBranch: target.isMainBranch,
  };
}

interface BranchDialogProps {
  branch?: Branch;
}

export function BranchDialog({ branch: editTarget }: BranchDialogProps) {
  const router = useRouter();
  const isEditMode = !!editTarget;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(
    isEditMode ? () => buildEditForm(editTarget) : EMPTY_FORM
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    isEditMode ? editTarget!.image ?? null : null
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function resetForm() {
    setForm(isEditMode ? buildEditForm(editTarget!) : EMPTY_FORM);
    setError(null);
    setSelectedFile(null);
    setPreviewUrl(isEditMode ? editTarget!.image ?? null : null);
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
    setPreviewUrl(isEditMode ? editTarget!.image ?? null : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImageFor(entityId: string): Promise<string | null> {
    if (!selectedFile) return null;

    const fd = new FormData();
    fd.set("entityType", "branch");
    fd.set("entityId", entityId);
    fd.set("file", selectedFile);

    const result = await uploadEntityImage(fd);
    if (result.error || !result.url) {
      throw new Error(result.error ?? "Image upload failed.");
    }
    return result.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Branch name is required.");
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode) {
        let imageUrl: string | undefined;
        if (selectedFile) {
          imageUrl = (await uploadImageFor(editTarget!.id)) ?? undefined;
        }

        const result = await updateBranchAction(editTarget!.id, {
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          isMainBranch: form.isMainBranch,
          image: imageUrl,
        });

        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const created = await createBranchAction({
          name: form.name,
          phone: form.phone || undefined,
          email: form.email || undefined,
          address: form.address || undefined,
          isMainBranch: form.isMainBranch,
        });

        if (created.error) {
          setError(created.error);
          return;
        }

        if (selectedFile && created.branch) {
          const imageUrl = await uploadImageFor(created.branch.id);
          if (imageUrl) {
            await updateBranchAction(created.branch.id, { image: imageUrl });
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[#8a8680] hover:text-[#1a1814]"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button className="bg-[#e8570e] hover:bg-[#d44f0c] text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Branch
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit ${editTarget.name}` : "Add a branch"}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update this branch's details."
              : "Create a new branch location for this tenant."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* ── Photo ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-lg overflow-hidden bg-[#f4f3f0] border border-[#ebe9e4] flex items-center justify-center shrink-0">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-[#8a8680]" />
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

          <div className="space-y-2">
            <Label htmlFor="name">Branch name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder="Street, city, state, country"
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-[#ebe9e4] px-4 py-3">
            <div>
              <Label htmlFor="isMainBranch">Main branch</Label>
              <p className="text-xs text-[#8a8680] mt-0.5">
                Only one branch can be the main branch at a time.
              </p>
            </div>
            <Switch
              id="isMainBranch"
              checked={form.isMainBranch}
              onCheckedChange={(checked) => setField("isMainBranch", checked)}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white"
              disabled={isLoading}
            >
              {isLoading
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save changes"
                  : "Create branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}