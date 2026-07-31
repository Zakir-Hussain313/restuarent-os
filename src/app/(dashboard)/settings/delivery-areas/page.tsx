import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/features/auth/actions";
import { DeliveryAreasLayout } from "@/features/delivery-areas/components/DeliveryAreasLayout";

export default async function DeliveryAreasSettingsPage() {
  const currentStaff = await getCurrentStaff();

  // Explicit route-level guard. Settings is a SUPER_ADMIN-only capability
  // per the project brief. This can't rely on the server actions' own
  // inline `auth.staff.role !== "SUPER_ADMIN"` checks as the only defense —
  // those still let this page's shell/UI load for the wrong role before
  // any data call resolves. redirect() here happens before any render.
  if (currentStaff?.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#1a1814]">
          Delivery Areas
        </h1>
        <p className="text-sm text-[#8a8680] mt-1">
          Manage delivery coverage per branch
        </p>
      </div>

      <DeliveryAreasLayout />
    </div>
  );
}