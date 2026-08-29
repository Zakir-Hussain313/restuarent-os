"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminDialog } from "./AdminDialog";
import { deactivateAdminAction, reactivateAdminAction, deleteAdminAction } from "@/features/admins/actions";
import type { Staff, Branch } from "@/db/schema";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-primary-light text-primary",
  ADMIN: "bg-blue-50 text-blue-700",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-secondary text-muted-foreground",
  on_leave: "bg-amber-50 text-amber-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

interface AdminCardsProps {
  admins: Staff[];
  branches: Branch[];
  currentUserId: string;
}

export function AdminCards({ admins, branches, currentUserId }: AdminCardsProps) {
  const { showConfirm } = useAlertModal();
  const hasSuperAdmin = admins.some((a) => a.role === "SUPER_ADMIN");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleStatus(member: Staff) {
    setLoadingId(member.id);
    setError(null);

    try {
      const result =
        member.status === "inactive"
          ? await reactivateAdminAction(member.id)
          : await deactivateAdminAction(member.id);

      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(member: Staff) {
    setDeletingId(member.id);
    setError(null);

    try {
      const result = await deleteAdminAction(member.id);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (admins.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No admins yet. Add your first admin to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {admins.map((member) => {
          const isSelf = member.id === currentUserId;
          const isSuperAdmin = member.role === "SUPER_ADMIN";
          const isInactive = member.status === "inactive";
          const isLoading = loadingId === member.id;
          const branchName = branches.find((b) => b.id === member.branchId)?.name;

          return (
            <div
              key={member.id}
              className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col"
            >
              <div className="relative h-36 w-full bg-secondary">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={`${member.firstName} ${member.lastName}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-semibold">
                      {initials(member.firstName, member.lastName)}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <p className="font-medium text-foreground truncate">
                    {member.firstName} {member.lastName}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#4a4744] truncate">{member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.phone ?? "—"}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    label={ROLE_LABELS[member.role] ?? member.role}
                    className={ROLE_STYLES[member.role] ?? ""}
                  />
                  <Badge
                    label={member.status.replace("_", " ")}
                    className={STATUS_STYLES[member.status] ?? ""}
                  />
                  {!isSuperAdmin && branchName && (
                    <Badge label={branchName} className="bg-secondary text-foreground" />
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-border">
                  <AdminDialog branches={branches} admin={member} currentUserId={currentUserId} hasSuperAdmin={hasSuperAdmin} />

                  {!isSelf && !isSuperAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 text-xs px-2 ${isInactive
                            ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          }`}
                        disabled={isLoading}
                        onClick={() => handleToggleStatus(member)}
                      >
                        {isLoading
                          ? "..."
                          : isInactive
                            ? "Reactivate"
                            : "Deactivate"}
                      </Button>

                      <button
                        type="button"
                        disabled={deletingId === member.id}
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            `This permanently deletes ${member.firstName} ${member.lastName}'s account. Their name will still show on past orders/attendance, but this cannot be undone.`,
                            {
                              title: "Permanently delete admin?",
                              confirmLabel: "Delete permanently",
                              destructive: true,
                            }
                          );
                          if (confirmed) handleDelete(member);
                        }}
                        title="Delete permanently"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        {deletingId === member.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}