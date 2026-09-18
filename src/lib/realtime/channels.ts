export type RealtimeResource = "orders" | "tables" | "attendance" | "riders" | "menu" | "notifications" | "coupons";

export function branchChannel(branchId: string, resource: RealtimeResource): string {
  return `branch:${branchId}:${resource}`;
}