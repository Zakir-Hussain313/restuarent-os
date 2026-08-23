import type { TableStatus, TableColor } from "@/types/table";
export const TABLE_STATUS_STYLES: Record < 
  TableStatus,
  { bg: string; border: string; dot: string; label: string }
> = {
  available: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", label: "Available" },
  occupied: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", label: "Occupied" },
  reserved: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", label: "Reserved" },
  out_of_service: { bg: "bg-muted", border: "border-border", dot: "bg-muted-foreground", label: "Out of service" },
};

// Real wood-tone finishes, not app-brand colors — these are meant to look
// like actual restaurant table finishes (oak, walnut, mahogany, etc).
// Hex-based (not Tailwind classes) since Tailwind has no wood palette.
export const TABLE_COLORS: TableColor[] = ["oak", "walnut", "mahogany", "espresso", "cherry", "ash"];

export const TABLE_COLOR_STYLES: Record <
  TableColor,
  { bg: string; border: string; chair: string; label: string }
> = {
  oak: { bg: "#E4C89A", border: "#B9925A", chair: "#A87B44", label: "Oak" },
  walnut: { bg: "#8B6544", border: "#63472E", chair: "#553B27", label: "Walnut" },
  mahogany: { bg: "#7A3B2E", border: "#552821", chair: "#48211B", label: "Mahogany" },
  espresso: { bg: "#4A3728", border: "#2E2118", chair: "#251A13", label: "Espresso" },
  cherry: { bg: "#8B4A3B", border: "#63332A", chair: "#542A22", label: "Cherry" },
  ash: { bg: "#CBC3B3", border: "#9E9483", chair: "#8B8172", label: "Ash" },
};

/** Falls back to Oak for any legacy/unrecognized value (e.g. old "slate" rows from before this palette existed). */
export function getTableColorStyle(color: string) {
  return TABLE_COLOR_STYLES[color as TableColor] ?? TABLE_COLOR_STYLES.oak;
}