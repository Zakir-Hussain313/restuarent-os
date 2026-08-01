import type { Metadata } from "next";
import { PosLayout } from "@/features/pos";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

export const metadata: Metadata = {
  title: `POS | ${RESTAURANT_CONFIG.name}`,
  description: "Point of Sale — take orders fast",
};

export default function PosPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PosLayout />
    </div>
  );
}