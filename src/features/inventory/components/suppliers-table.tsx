"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, Search, X } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SupplierDialog } from "./supplier-dialog";
import { deleteSupplierAction } from "@/features/inventory/actions";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import type { Supplier } from "@/db/schema";

interface SuppliersTableProps {
  suppliers: Supplier[];
}

export function SuppliersTable({ suppliers }: SuppliersTableProps) {
  const { showConfirm, showAlert } = useAlertModal();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function handleDelete(supplier: Supplier) {
    const confirmed = await showConfirm(
      `This permanently deletes "${supplier.name}". Past receipts keep their history.`,
      { title: "Delete supplier?", confirmLabel: "Delete", destructive: true }
    );
    if (!confirmed) return;

    setDeletingId(supplier.id);
    const result = await deleteSupplierAction(supplier.id);
    setDeletingId(null);
    if (result.error) {
      showAlert(result.error, "Couldn't delete supplier");
      return;
    }
    router.refresh();
  }

  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No suppliers yet. Add your first supplier to get started.
        </p>
      </div>
    );
  }

  const isFiltered = search.trim() !== "";
  const query = search.trim().toLowerCase();

  const filtered = suppliers.filter((s) => {
    if (!query) return true;
    return (
      s.name.toLowerCase().includes(query) ||
      (s.contactPhone ?? "").toLowerCase().includes(query) ||
      (s.contactEmail ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, email..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        {isFiltered && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center">
          <p className="text-sm text-muted-foreground">No suppliers match your search.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.contactPhone ?? "—"}</TableCell>
                  <TableCell>{s.contactEmail ?? "—"}</TableCell>
                  <TableCell className="max-w-60 truncate">{s.notes ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <SupplierDialog supplier={s} />
                      <button
                        type="button"
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s)}
                        title="Delete"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 text-red-700" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}