"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";

// Single source of truth — derived from the Drizzle schema, never redeclared.
// When staffRoleEnum grows (e.g. CUSTOMER), this type updates automatically.
export type AppRole = (typeof staff.$inferSelect)["role"];

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    // Zod 4: ZodError exposes `.issues`, not `.errors` (Zod 3 API).
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid email or password." };
  }

  return { success: true };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  return { success: true };
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPasswordAction(formData: FormData) {
  const raw = { email: formData.get("email") };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    }
  );

  if (error) {
    return { error: "Failed to send reset email. Please try again." };
  }

  return { success: true };
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPasswordAction(formData: FormData) {
  const raw = {
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Failed to update password. Please try again." };
  }

  return { success: true };
}

// ── Get Current Staff ─────────────────────────────────────────────────────────
// Server-side helper used by layouts and server components to fetch the
// authenticated staff row. Returns null if unauthenticated or no staff row.

export async function getCurrentStaff() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return null;

  const staffRow = await db.query.staff.findFirst({
    where: eq(staff.id, session.user.id),
  });

  return staffRow ?? null;
}