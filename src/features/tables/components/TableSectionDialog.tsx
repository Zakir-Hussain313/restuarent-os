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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { createTableSectionAction, updateTableSectionAction } from "@/features/tables/actions";
import type { TableSection } from "@/db/schema";

interface TableSectionDialogProps {
    branchId?: string;
    section?: TableSection;
}

export function TableSectionDialog({ branchId, section: editTarget }: TableSectionDialogProps) {
    const router = useRouter();
    const isEditMode = !!editTarget;

    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState(editTarget?.name ?? "");
    const [description, setDescription] = useState(editTarget?.description ?? "");

    function resetForm() {
        setName(editTarget?.name ?? "");
        setDescription(editTarget?.description ?? "");
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const result = isEditMode
                ? await updateTableSectionAction(editTarget!.id, { name, description })
                : await createTableSectionAction({ name, description, branchId });

            if (result.error) {
                setError(result.error);
                return;
            }

            setOpen(false);
            resetForm();
            router.refresh();
        } catch {
            setError("Something went wrong. Please try again.");
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#8a8680] hover:text-[#1a1814]">
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Section
                        </Button>
                    )
                }
            />

            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? `Edit "${editTarget!.name}"` : "New section"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? "Update this section's details." : "e.g. Main Hall, Outdoor, VIP Room."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="sectionName">Name</Label>
                        <Input
                            id="sectionName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="sectionDescription">Description (optional)</Label>
                        <Input
                            id="sectionDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" className="w-full bg-[#e8570e] hover:bg-[#d44f0c] text-white" disabled={isLoading}>
                            {isLoading ? "Saving..." : isEditMode ? "Save changes" : "Create section"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}