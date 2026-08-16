"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsBranchFilterProps {
  branches: { id: string; name: string }[];
  selectedBranchId: string;
}

export function SettingsBranchFilter({
  branches,
  selectedBranchId,
}: SettingsBranchFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string | null) {
  if (!value) return; // branch select shouldn't ever be cleared, but base-ui's type allows it
  const params = new URLSearchParams(searchParams.toString());
  params.set("branch", value);
  router.push(`${pathname}?${params.toString()}`);
}

  return (
    <Select value={selectedBranchId} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}