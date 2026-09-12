import { RESTAURANT_CONFIG } from "@/lib/restaurantConfig";

export function todayInTenantTz(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: RESTAURANT_CONFIG.timezone,
  });
}

export function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}