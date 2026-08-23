"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { StaffTable } from "./staff-table";
import type { Staff, Branch } from "@/db/schema";

interface StaffFiltersProps {
  staff: Staff[];
  branches: Branch[];
  currentUserId: string;
  currentUserRole: string;
}

export function StaffFilters({
  staff,
  branches,
  currentUserId,
  currentUserRole,
}: StaffFiltersProps) {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState<string>("all");

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return staff.filter((member) => {
      const matchesSearch =
        !q ||
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q);

      const matchesBranch =
        !isSuperAdmin || branchId === "all" || member.branchId === branchId;

      return matchesSearch && matchesBranch;
    });
  }, [staff, search, branchId, isSuperAdmin]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8680]" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isSuperAdmin && (
          <Select value={branchId} onValueChange={(v) => setBranchId(v ?? "all")}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="All branches">
                {(value: string) =>
                  value === "all" ? "All branches" : branches.find((b) => b.id === value)?.name ?? "All branches"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <StaffTable
        staff={filtered}
        branches={branches}
        currentUserId={currentUserId}
      />
    </div>
  );
}