import type { TableStatus } from "@/types/table";

export const TABLE_STATUS_STYLES: Record<
  TableStatus,
  { bg: string; border: string; dot: string; label: string }
> = {
  available: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "Available" },
  occupied: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-[#e8570e]", label: "Occupied" },
  reserved: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", label: "Reserved" },
  out_of_service: { bg: "bg-[#f4f2ef]", border: "border-[#ebe9e4]", dot: "bg-[#8a8680]", label: "Out of service" },
};