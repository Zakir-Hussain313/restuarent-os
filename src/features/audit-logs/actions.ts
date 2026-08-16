"use server";

import { db } from "@/db";
import { auditLogs, branches } from "@/db/schema";
import { getCurrentStaff } from "@/features/auth/actions";
import { hasPermission } from "@/types/staff";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import type { AuditLog, AuditResource } from "@/db/schema";

export interface AuditLogFilters {
  branchId?: string;
  resource?: AuditResource;
  before?: string; // ISO timestamp cursor
}

export interface AuditLogsResult {
  success: true;
  logs: AuditLog[];
  branchName: Map<string, string>;
  nextCursor: string | null;
}

export interface AuditLogsError {
  success: false;
  error: string;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function getAuditLogsAction(
  filters: AuditLogFilters = {}
): Promise<AuditLogsResult | AuditLogsError> {
  const currentStaffRow = await getCurrentStaff();
  if (!currentStaffRow) {
    return { success: false, error: "Not authenticated." };
  }
  if (!hasPermission(currentStaffRow.role, "view_audit_logs")) {
    return { success: false, error: "You don't have permission to view audit logs." };
  }

  const tenantId = currentStaffRow.tenantId;
  const baseConditions = [eq(auditLogs.tenantId, tenantId)];
  if (currentStaffRow.role === "ADMIN") {
    if (!currentStaffRow.branchId) {
      return { success: false, error: "Your account has no branch assigned." };
    }
    baseConditions.push(eq(auditLogs.branchId, currentStaffRow.branchId));
  } else if (filters.branchId) {
    baseConditions.push(eq(auditLogs.branchId, filters.branchId));
  }
  if (filters.resource) {
    baseConditions.push(eq(auditLogs.resource, filters.resource));
  }

  // ── Step 1: find which calendar day to fetch ──────────────────────────
  // The most recent log at-or-before the cursor tells us which day is next.
  const cursorDate = filters.before ? new Date(filters.before) : new Date();
  const anchor = await db.query.auditLogs.findFirst({
    where: and(...baseConditions, lt(auditLogs.createdAt, cursorDate)),
    orderBy: [desc(auditLogs.createdAt)],
  });

  if (!anchor) {
    // No more history before this cursor.
    return { success: true, logs: [], branchName: new Map(), nextCursor: null };
  }

  const dayStart = startOfUtcDay(anchor.createdAt);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  // ── Step 2: fetch that whole day's logs ────────────────────────────────
  const dayLogs = await db.query.auditLogs.findMany({
    where: and(...baseConditions, gte(auditLogs.createdAt, dayStart), lt(auditLogs.createdAt, dayEnd)),
    orderBy: [desc(auditLogs.createdAt)],
  });

  // ── Branch names for display (only need the ones referenced) ──────────
  const branchIds = [...new Set(dayLogs.map((l) => l.branchId).filter((id): id is string => !!id))];
  const branchRows = branchIds.length
    ? await db.query.branches.findMany({
        where: (b, { inArray }) => inArray(b.id, branchIds),
      })
    : [];
  const branchName = new Map(branchRows.map((b) => [b.id, b.name]));

  return {
    success: true,
    logs: dayLogs,
    branchName,
    nextCursor: dayStart.toISOString(),
  };
}

export async function getBranchesForFilterAction() {
  const currentStaffRow = await getCurrentStaff();
  if (!currentStaffRow || !hasPermission(currentStaffRow.role, "view_audit_logs")) {
    return { branches: [] };
  }
  const rows = await db.query.branches.findMany({
    where: eq(branches.tenantId, currentStaffRow.tenantId),
  });
  if (currentStaffRow.role === "ADMIN") {
    return { branches: rows.filter((b) => b.id === currentStaffRow.branchId) };
  }
  return { branches: rows };
}