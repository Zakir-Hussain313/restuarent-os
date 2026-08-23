import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditAction, AuditResource, Staff, NotificationType } from "@/db/schema";
import { createNotification } from "@/features/notifications/actions";

type Db = typeof db;

// "order" is excluded — order creation already fires its own explicit
// notification from createOrderAction, piggybacking here would duplicate it.
function resolveOverrideNotification(
  resource: AuditResource,
  action: AuditAction,
  newValue?: Record<string, unknown> | null
): { type: NotificationType; title: string; message: string } | null {
  if (resource === "table" && action === "status_change") {
    if (newValue?.status === "out_of_service") {
      return {
        type: "table_out_of_service",
        title: "Table out of service",
        message: `A table was marked out of service.`,
      };
    }
    return null;
  }

  if (
    (resource === "staff" || resource === "tenant_settings" || resource === "branch_settings" || resource === "branch") &&
    (action === "update" || action === "delete")
  ) {
    return {
      type: "manual_override",
      title: "Manual change made",
      message: `A ${resource.replace("_", " ")} record was ${action}d.`,
    };
  }

  return null;
}

interface AuditOptions {
  branchId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  description?: string;
}

type AuditActor = Staff | { id: string | null; tenantId: string; branchId?: string | null; firstName: string; lastName: string };

export async function logAudit(
  db: Db,
  actor: AuditActor,
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

    const branchId = options.branchId ?? actor.branchId;
    const overrideNotif = resolveOverrideNotification(resource, action, options.newValue);
    if (overrideNotif && branchId) {
      await createNotification({
        tenantId: actor.tenantId,
        branchId,
        ...overrideNotif,
        resourceType: resource,
        resourceId,
      });
    }
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}