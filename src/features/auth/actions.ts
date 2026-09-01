"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "./schemas";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq } from "drizzle-orm";
import { loginRateLimit, forgotPasswordRateLimit } from "@/lib/rate-limit";

// Single source of truth — derived from the Drizzle schema, never redeclared.
// When staffRoleEnum grows (e.g. CUSTOMER), this type updates automatically.
export type AppRole = (typeof staff.$inferSelect)["role"];

// ── Login ─────────────────────────────────────────────────────────────────────


export async function loginAction(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    let t = Date.now();
    const { success } = await loginRateLimit.limit(parsed.data.email.toLowerCase());
    console.log(`[timing] rateLimit: ${Date.now() - t}ms`);
    if (!success) {
      return { error: "Too many login attempts. Please wait a minute and try again." };
    }

    const supabase = await getSupabaseServerClient();

  t = Date.now();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  console.log(`[timing] signInWithPassword: ${Date.now() - t}ms`);

  if (error || !data.user) {
    return { error: "Invalid email or password." };
  }

  t = Date.now();
  const staffRow = await db.query.staff.findFirst({
    where: eq(staff.id, data.user.id),
  });
  console.log(`[timing] staffLookup: ${Date.now() - t}ms`);

  if (!staffRow) {
    await supabase.auth.signOut();
    return { error: "No staff account found for this user." };
  }

  // Block inactive staff — deactivated accounts cannot log in
  if (staffRow.status === "inactive") {
    await supabase.auth.signOut();
    return { error: "Your account has been deactivated. Contact your administrator." };
  }

  return { success: true, role: staffRow.role };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  return { success: true };
}

// ── Forgot Password ───────────────────────────────────────────────────────────

export async function forgotPasswordAction(input: ForgotPasswordInput) {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { success } = await forgotPasswordRateLimit.limit(parsed.data.email.toLowerCase());
  if (!success) {
    return { error: "Too many reset requests. Please wait before trying again." };
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/reset-password`,
    }
  );

  if (error) {
    console.error("resetPasswordForEmail error:", error.message, error.status);
    return { error: "Failed to send reset email. Please try again." };
  }

  return { success: true };
}

// ── Reset Password ────────────────────────────────────────────────────────────

export async function resetPasswordAction(input: ResetPasswordInput) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await getSupabaseServerClient();

  // Defensive check — updateUser() can appear to "succeed" even with no
  // active session, silently no-op-ing the password change. Verify a real
  // session exists first so failures are explicit, not silent.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your reset link has expired or is invalid. Please request a new one.",
    };
  }

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const staffRow = await db.query.staff.findFirst({
    where: eq(staff.id, user.id),
  });

  return staffRow ?? null;
}