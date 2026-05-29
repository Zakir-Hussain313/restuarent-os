import type { Metadata } from "next";
import { PosLayout } from "@/features/pos";

export const metadata: Metadata = {
  title: "POS | Rice n Spice",
  description: "Point of Sale — take orders fast",
};

export default function PosPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PosLayout />
    </div>
  );
}