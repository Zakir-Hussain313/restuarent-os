import { useOrders } from "./useOrders";

export function useActiveOrders() {
  return useOrders({
    scopeTypes: ["dine_in", "takeaway"],
    scopeStatuses: ["pending", "confirmed"],
  });
}