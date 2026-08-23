"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  createStaffAction,
  updateStaffAction,
  sendStaffPasswordResetAction,
} from "@/features/staff/actions";
import { uploadEntityImage } from "@/features/uploads/actions";
import type { Branch, Staff } from "@/db/schema";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "STAFF" | "RIDER" | "";
  branchId: string;
  salary: string;
  status: "active" | "inactive" | "on_leave";
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  branchId: "",
  salary: "",
  status: "active",
};

function buildEditForm(target: Staff): FormState {
  return {
    firstName: target.firstName,
    lastName: target.lastName,
    email: target.email,
    phone: target.phone ?? "",
    role: target.role === "SUPER_ADMIN" ? "" : (target.role as "STAFF" | "RIDER"),
    branchId: target.branchId ?? "",
    salary: target.salary?.toString() ?? "",
    status: target.status as "active" | "inactive" | "on_leave",
  };
}

interface StaffDialogProps {
  branches: Branch[];
  staff?: Staff;
}

export function StaffDialog({ branches, staff: editTarget }: StaffDialogProps) {
  const router = useRouter();
  const isEditMode = !!editTarget;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
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
    setResetSuccess(false);
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
    fd.set("entityType", "staff");
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

    if (!form.role) {
      setError("Select a role.");
      return;
    }
    if (!form.branchId) {
      setError("Select a branch.");
      return;
    }

    setIsLoading(true);
    try {
      if (isEditMode) {
        let imageUrl: string | undefined;
        if (selectedFile) {
          imageUrl = (await uploadImageFor(editTarget!.id)) ?? undefined;
        }

        const result = await updateStaffAction(editTarget!.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          branchId: form.branchId,
          salary: form.salary ? Number(form.salary) : undefined,
          status: form.status,
          image: imageUrl,
        });

        if (result.error) {
          setError(result.error);
          return;
        }
      } else {
        const created = await createStaffAction({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          branchId: form.branchId,
          salary: form.salary ? Number(form.salary) : undefined,
        });

        if (created.error) {
          setError(created.error);
          return;
        }

        if (selectedFile && created.staff) {
          const imageUrl = await uploadImageFor(created.staff.id);
          if (imageUrl) {
            await updateStaffAction(created.staff.id, { image: imageUrl });
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

  async function handleSendPasswordReset() {
    if (!editTarget) return;
    setIsSendingReset(true);
    setError(null);
    setResetSuccess(false);

    try {
      const result = await sendStaffPasswordResetAction(editTarget.id);
      if (result.error) {
        setError(result.error);
      } else {
        setResetSuccess(true);
      }
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setIsSendingReset(false);
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
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Staff
            </Button>
          )
        }
      />

      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>
            {isEditMode
              ? `Edit ${editTarget.firstName} ${editTarget.lastName}`
              : "Add a staff member"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update this staff member's details."
              : "They'll receive an email invite to set their own password."}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overflow-x-hidden themed-scrollbar rounded-b-2xl px-5 pt-2 pb-2 space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {resetSuccess && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
              Password reset email sent successfully.
            </div>
          )}

          {/* ── Photo ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-primary-light border border-primary/20 flex items-center justify-center shrink-0">
                {previewUrl ? (
                  // Local blob preview or existing remote URL — plain img is
                  // correct here, next/image doesn't support blob: URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-medium text-primary">
                    {form.firstName?.[0]?.toUpperCase() ?? "?"}
                  </span>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => {
                  if (value === "STAFF" || value === "RIDER")
                    setField("role", value);
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="RIDER">Rider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              <Select
                value={form.branchId}
                onValueChange={(value) => setField("branchId", value ?? "")}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch">
                    {(value: string) =>
                      branches.find((b) => b.id === value)?.name ?? "Select branch"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">Salary (optional)</Label>
            <Input
              id="salary"
              type="number"
              min="0"
              value={form.salary}
              onChange={(e) => setField("salary", e.target.value)}
              disabled={isLoading}
            />
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value) => {
                  if (
                    value === "active" ||
                    value === "inactive" ||
                    value === "on_leave"
                  ) {
                    setField("status", value);
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col mx-5 mb-5 rounded-xl">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isLoading || isSendingReset}
                onClick={handleSendPasswordReset}
              >
                {isSendingReset ? "Sending..." : "Send password reset email"}
              </Button>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isSendingReset}
            >
              {isLoading
                ? isEditMode
                  ? "Saving..."
                  : "Sending invite..."
                : isEditMode
                  ? "Save changes"
                  : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}