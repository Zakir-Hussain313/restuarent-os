"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createSupplierAction,
  updateSupplierAction,
} from "@/features/inventory/actions";
import type { Supplier } from "@/db/schema";

interface SupplierDialogProps {
  supplier?: Supplier;
}

export function SupplierDialog({ supplier: editTarget }: SupplierDialogProps) {
  const router = useRouter();
  const isEditMode = !!editTarget;

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(editTarget?.name ?? "");
  const [phone, setPhone] = useState(editTarget?.contactPhone ?? "");
  const [email, setEmail] = useState(editTarget?.contactEmail ?? "");
  const [notes, setNotes] = useState(editTarget?.notes ?? "");

  function resetForm() {
    setName(editTarget?.name ?? "");
    setPhone(editTarget?.contactPhone ?? "");
    setEmail(editTarget?.contactEmail ?? "");
    setNotes(editTarget?.notes ?? "");
    setError(null);
  }

  async function handleSubmit() {
    setIsLoading(true);
    setError(null);

    const result = isEditMode
      ? await updateSupplierAction(editTarget!.id, {
          name,
          contactPhone: phone.trim() || null,
          contactEmail: email.trim() || null,
          notes: notes.trim() || null,
        })
      : await createSupplierAction({
          name,
          contactPhone: phone.trim() || undefined,
          contactEmail: email.trim() || undefined,
          notes: notes.trim() || undefined,
        });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    resetForm();
    router.refresh();
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
              <Plus className="w-4 h-4 mr-1" /> Add Supplier
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Supplier name" />
          </div>

          <div className="space-y-1.5">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03xx-xxxxxxx" />
          </div>

          <div className="space-y-1.5">
            <Label>Email (optional)</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="supplier@example.com" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes" />
          </div>
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