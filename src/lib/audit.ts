import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditAction, AuditResource, Staff } from "@/db/schema";

type Db = typeof db;

interface AuditOptions {
  branchId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  description?: string;
}

export async function logAudit(
  db: Db,
  actor: Staff,
  resource: AuditResource,
  resourceId: string,
  action: AuditAction,
  options: AuditOptions = {}
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      tenantId: actor.tenantId,
      branchId: options.branchId ?? actor.branchId ?? null,
      actorId: actor.id,
      actorName: `${actor.firstName} ${actor.lastName}`,
      resource,
      resourceId,
      action,
      oldValue: options.oldValue ?? null,
      newValue: options.newValue ?? null,
      description: options.description ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}