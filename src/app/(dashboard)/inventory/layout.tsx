import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { InventoryTabs } from "@/features/inventory/components/InventoryTabs";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentStaff = await getCurrentStaff();

  if (!currentStaff || !hasPermission(currentStaff.role, "manage_inventory")) {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
        <p className="text-sm text-[#8a8680] mt-1">
          Ingredients, stock, suppliers, and recipes
        </p>
      </div>

      <InventoryTabs />

      <div>{children}</div>
    </div>
  );
}