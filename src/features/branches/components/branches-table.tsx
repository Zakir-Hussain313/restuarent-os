"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BranchDialog } from "./branch-dialog";
import { BranchDeactivateDialog } from "./branch-deactivate-dialog";
import { reactivateBranchAction } from "@/features/branches/actions";
import type { Branch } from "@/db/schema";

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

interface BranchesTableProps {
  branches: Branch[];
}

export function BranchesTable({ branches }: BranchesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null);

  async function handleReactivate(branch: Branch) {
    setLoadingId(branch.id);
    setError(null);
    try {
      const result = await reactivateBranchAction(branch.id);
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

  if (branches.length === 0) {
    return (
      <div className="rounded-lg border border-[#ebe9e4] bg-white py-16 text-center">
        <p className="text-sm text-[#8a8680]">
          No branches yet. Add your first branch to get started.
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
        {branches.map((branch) => {
          const isInactive = !branch.isActive;
          const isLoading = loadingId === branch.id;
          const otherBranches = branches.filter((b) => b.id !== branch.id);

          return (
            <div
              key={branch.id}
              className="rounded-lg border border-[#ebe9e4] bg-white overflow-hidden flex flex-col"
            >
              <div className="relative h-36 w-full bg-[#f4f3f0]">
                {branch.image ? (
                  <Image
                    src={branch.image}
                    alt={branch.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-[#8a8680]" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <p className="font-medium text-[#1a1814] truncate flex items-center gap-2">
                    {branch.name}
                    {branch.isMainBranch && (
                      <Badge label="Main" className="bg-[#fef3ed] text-[#e8570e]" />
                    )}
                  </p>
                  <p className="text-sm text-[#4a4744]">{branch.phone ?? "—"}</p>
                  <p className="text-sm text-[#4a4744] truncate">
                    {branch.email ?? "—"}
                  </p>
                  <p className="text-sm text-[#8a8680] line-clamp-2">
                    {branch.address ?? "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge
                    label={isInactive ? "inactive" : "active"}
                    className={
                      isInactive
                        ? "bg-[#f4f3f0] text-[#8a8680]"
                        : "bg-emerald-50 text-emerald-700"
                    }
                  />
                </div>

                <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#ebe9e4]">
                  <BranchDialog branch={branch} />

                  {branch.isMainBranch ? (
                    <span />
                  ) : isInactive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      disabled={isLoading}
                      onClick={() => handleReactivate(branch)}
                    >
                      {isLoading ? "..." : "Reactivate"}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2 text-[#8a8680] hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeactivateTarget(branch)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </div>

              {deactivateTarget?.id === branch.id && (
                <BranchDeactivateDialog
                  branch={branch}
                  otherBranches={otherBranches}
                  open={true}
                  onOpenChange={(open) => {
                    if (!open) setDeactivateTarget(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}