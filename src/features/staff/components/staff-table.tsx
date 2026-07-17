"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { StaffDialog } from "./add-staff-dialog";
import { deactivateStaffAction, reactivateStaffAction } from "@/features/staff/actions";
import type { Staff, Branch } from "@/db/schema";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  STAFF: "Staff",
  RIDER: "Rider",
};

const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN: "bg-[#fef3ed] text-[#e8570e]",
  STAFF: "bg-blue-50 text-blue-700",
  RIDER: "bg-purple-50 text-purple-700",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-[#f4f3f0] text-[#8a8680]",
  on_leave: "bg-amber-50 text-amber-700",
};

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

interface StaffTableProps {
  staff: Staff[];
  branches: Branch[];
  currentUserId: string;
}

export function StaffTable({ staff, branches, currentUserId }: StaffTableProps) {
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
      <div className="rounded-lg border border-[#ebe9e4] bg-white py-16 text-center">
        <p className="text-sm text-[#8a8680]">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {staff.map((member) => {
          const isSelf = member.id === currentUserId;
          const isSuperAdmin = member.role === "SUPER_ADMIN";
          const isInactive = member.status === "inactive";
          const isLoading = loadingId === member.id;

          return (
            <div
              key={member.id}
              className="rounded-lg border border-[#ebe9e4] bg-white overflow-hidden flex flex-col"
            >
              <div className="relative h-36 w-full bg-[#f4f3f0]">
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
                    <span className="h-14 w-14 rounded-full bg-[#e8570e]/10 text-[#e8570e] flex items-center justify-center text-lg font-semibold">
                      {initials(member.firstName, member.lastName)}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <p className="font-medium text-[#1a1814] truncate">
                    {member.firstName} {member.lastName}
                    {isSelf && (
                      <span className="ml-2 text-xs text-[#8a8680] font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-[#4a4744] truncate">{member.email}</p>
                  <p className="text-sm text-[#8a8680]">{member.phone ?? "—"}</p>
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
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#ebe9e4]">
                  <StaffDialog branches={branches} staff={member} />

                  {!isSelf && !isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 text-xs px-2 ${
                        isInactive
                          ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          : "text-[#8a8680] hover:text-destructive hover:bg-destructive/10"
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