import type { Metadata } from "next";
import { MenuLayout } from "@/features/menu";

export const metadata: Metadata = {
  title: "Menu | Rice n Spice",
};

export default function MenuPage() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <MenuLayout />
    </div>
  );
}