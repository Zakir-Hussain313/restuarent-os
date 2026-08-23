"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Power, Loader2 } from "lucide-react";
import { StaffDialog } from "./add-staff-dialog";
import { deactivateStaffAction, reactivateStaffAction } from "@/features/staff/actions";
import type { Staff, Branch } from "@/db/schema";
import { useAlertModal } from "@/components/providers/AlertModalProvider";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  STAFF: "Staff",
  RIDER: "Rider",
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-coral/10 text-coral",
  STAFF: "bg-blue-50 text-blue-700",
  RIDER: "bg-purple-50 text-purple-700",
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-emerald-500",
  inactive: "bg-muted-foreground/50",
  on_leave: "bg-amber-500",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On leave",
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

interface StaffTableProps {
  staff: Staff[];
  branches: Branch[];
  currentUserId: string;
}

export function StaffTable({ staff, branches, currentUserId }: StaffTableProps) {
    const { showConfirm } = useAlertModal();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggleStatus(member: Staff) {
    setLoadingId(member.id);
    setError(null);

    try {
      const result =
        member.status === "inactive"
          ? await reactivateStaffAction(member.id)
          : await deactivateStaffAction(member.id);

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

  if (staff.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No staff yet. Add your first team member to get started.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {staff.map((member) => {
          const isSelf = member.id === currentUserId;
          const isSuperAdmin = member.role === "SUPER_ADMIN";
          const isInactive = member.status === "inactive";
          const isLoading = loadingId === member.id;

          return (
            <div
              key={member.id}
              className="group relative rounded-2xl border border-border bg-card pt-10 pb-5 px-5 flex flex-col items-center text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {/* Edit action — top right, icon only, appears on hover for a cleaner default state */}
              <div className="absolute top-3 right-3">
                <StaffDialog branches={branches} staff={member} />
              </div>

              {/* Avatar */}
              <div className="relative h-24 w-24 rounded-full overflow-hidden shrink-0">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={`${member.firstName} ${member.lastName}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary-light">
                    <span className="text-xl font-semibold text-primary">
                      {initials(member.firstName, member.lastName)}
                    </span>
                  </div>
                )}
                <span
                  className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${STATUS_DOT[member.status] ?? "bg-muted-foreground/50"}`}
                  title={STATUS_LABEL[member.status] ?? member.status}
                />
              </div>

              {/* Identity */}
              <div className="mt-3 min-w-0 w-full">
                <p className="font-semibold text-foreground truncate">
                  {member.firstName} {member.lastName}
                  {isSelf && <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{member.email}</p>
              </div>

              {/* Role badge */}
              <span
                className={`mt-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_STYLES[member.role] ?? ""}`}
              >
                {ROLE_LABELS[member.role] ?? member.role}
              </span>

              {/* Footer meta + action */}
              <div className="mt-4 pt-4 border-t border-border w-full flex items-center justify-between gap-2">
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-xs text-muted-foreground truncate">
                    {member.phone ?? "No phone on file"}
                  </span>
                  {member.salary != null && (
                    <span className="text-xs font-medium text-foreground">
                      Rs. {Number(member.salary).toLocaleString()}
                    </span>
                  )}
                </div>

                {!isSelf && !isSuperAdmin && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        isInactive
                          ? `${member.firstName} ${member.lastName} will regain access to their account.`
                          : `${member.firstName} ${member.lastName} will lose access to their account. You can reactivate them later.`,
                        {
                          title: isInactive ? "Reactivate staff member?" : "Deactivate staff member?",
                          confirmLabel: isInactive ? "Reactivate" : "Deactivate",
                          destructive: !isInactive,
                        }
                      );
                      if (confirmed) handleToggleStatus(member);
                    }}
                    title={isInactive ? "Reactivate" : "Deactivate"}
                    className={`inline-flex items-center justify-center h-7 w-7 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      isInactive
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}