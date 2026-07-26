import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBranchListAction } from "@/features/branches/actions";
import { MenuFilters } from "@/features/menu/components/MenuFilters";
import { MenuLayout } from "@/features/menu";

export const metadata: Metadata = {
  title: "Menu | Rice n Spice",
};

export default async function MenuPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentStaffRow = user
    ? await db.query.staff.findFirst({ where: eq(staff.id, user.id) })
    : null;

  const isSuperAdmin = currentStaffRow?.role === "SUPER_ADMIN";
  const isAdmin = currentStaffRow?.role === "ADMIN";
  const isStaff = currentStaffRow?.role === "STAFF";

  // ADMIN, SUPER_ADMIN, and STAFF may reach the menu page.
  // STAFF is restricted to toggle-status only (canManageMenu = false),
  // enforced server-side in the actions and mirrored here for the UI.
  // RIDER has no menu access per the project brief.
  if (!currentStaffRow || (!isAdmin && !isSuperAdmin && !isStaff)) {
    redirect("/dashboard");
  }

  const canManageMenu = isAdmin || isSuperAdmin;

  const { branches } = isSuperAdmin
    ? await getBranchListAction()
    : { branches: [] };

  return (
    <div className="h-full flex flex-col min-h-0">
      <MenuFilters
        isSuperAdmin={isSuperAdmin}
        canManageMenu={canManageMenu}
        branches={branches ?? []}
      >
        <MenuLayout />
      </MenuFilters>
    </div>
  );
}