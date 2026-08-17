"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { db } from "@/db";
import { staff, branches, menuItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission } from "@/types/staff";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type EntityType = "staff" | "branch" | "menu_item";

export async function uploadEntityImage(formData: FormData) {
  const entityType = formData.get("entityType") as EntityType | null;
  const entityId = formData.get("entityId") as string | null;
  const file = formData.get("file") as File | null;

  if (!entityType || !entityId || !file) {
    return { error: "Missing required fields." };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "Image must be under 5MB." };
  }

  // ── Authorize ──────────────────────────────────────────────────────────
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  const currentStaffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  if (!currentStaffRow) {
    return { error: "Staff record not found." };
  }

  if (entityType === "menu_item") {
    // Matches createMenuItemAction/updateMenuItemAction: ADMIN + SUPER_ADMIN only,
    // NOT STAFF — unlike the "manage_menu" permission string, which STAFF also
    // holds for availability toggling. Direct role check here on purpose.
    if (currentStaffRow.role !== "ADMIN" && currentStaffRow.role !== "SUPER_ADMIN") {
      return { error: "You don't have permission to upload this image." };
    }
  } else {
    const requiredPermission =
      entityType === "staff" ? "manage_staff" : "manage_branches";

    if (!hasPermission(currentStaffRow.role, requiredPermission)) {
      return { error: "You don't have permission to upload this image." };
    }
  }

  // ── Guard: entityId must actually belong to caller's tenant/branch scope.
  // Without this, a branch-scoped ADMIN could overwrite another branch's
  // image by supplying a different entityId — role check alone isn't enough.
  if (entityType === "staff") {
    const targetStaff = await db.query.staff.findFirst({
      where: eq(staff.id, entityId),
    });
    if (!targetStaff || targetStaff.tenantId !== currentStaffRow.tenantId) {
      return { error: "Staff member not found." };
    }
    if (currentStaffRow.role === "ADMIN" && targetStaff.branchId !== currentStaffRow.branchId) {
      return { error: "You can only upload images for your own branch." };
    }
  } else if (entityType === "branch") {
    const targetBranch = await db.query.branches.findFirst({
      where: eq(branches.id, entityId),
    });
    if (!targetBranch || targetBranch.tenantId !== currentStaffRow.tenantId) {
      return { error: "Branch not found." };
    }
    if (currentStaffRow.role === "ADMIN" && targetBranch.id !== currentStaffRow.branchId) {
      return { error: "You can only upload an image for your own branch." };
    }
  } else if (entityType === "menu_item") {
    const targetItem = await db.query.menuItems.findFirst({
      where: eq(menuItems.id, entityId),
    });
    if (!targetItem || targetItem.tenantId !== currentStaffRow.tenantId) {
      return { error: "Menu item not found." };
    }
    if (currentStaffRow.role === "ADMIN" && targetItem.branchId !== currentStaffRow.branchId) {
      return { error: "You can only upload images for your own branch's menu." };
    }
  }

  // ── Upload ─────────────────────────────────────────────────────────────
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${entityType}/${entityId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("images")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from("images")
    .getPublicUrl(path);

  // Cache-bust so next/image doesn't show a stale cached version after re-upload
  const url = `${publicUrlData.publicUrl}?t=${Date.now()}`;

  return { success: true, url };
}