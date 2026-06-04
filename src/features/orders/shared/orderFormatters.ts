import type { Order } from "@/types/order";

export function formatOrderAge(createdAt: Date | string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}


export function formatOrderType(type: Order["orderType"]): string {
  switch (type) {
    case "dine_in": return "Dine In";
    case "takeaway": return "Takeaway";
    case "delivery": return "Delivery";
  }
}