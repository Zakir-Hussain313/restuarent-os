import type { Metadata } from "next";
import { OrdersLayout } from "@/features/orders";

export const metadata: Metadata = {
  title: "Orders | Rice n Spice",
  description: "Manage and track all restaurant orders",
};

export default function OrdersPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <OrdersLayout />
    </div>
  );
}