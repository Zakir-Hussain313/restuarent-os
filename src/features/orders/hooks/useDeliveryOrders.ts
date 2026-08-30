import { useOrders } from "./useOrders";

export function useDeliveryOrders() {
  return useOrders({
    scopeTypes: ["delivery"],
    scopeStatuses: ["pending", "confirmed", "ready_for_delivery"],
  });
}