import type { AuditLog, AuditResource, AuditAction } from "@/db/schema";

function extractName(log: AuditLog): string | null {
  const value = (log.newValue ?? log.oldValue) as Record<string, unknown> | null;
  if (!value) return null;
  if (typeof value.name === "string") return value.name;
  if (typeof value.firstName === "string") {
    return `${value.firstName} ${value.lastName ?? ""}`.trim();
  }
  return null;
}

const SENTENCE_TEMPLATES: Partial <
  Record<AuditResource, Partial<Record<AuditAction, (name: string | null, log: AuditLog) => string>>>
> = {
  menu_item: {
    create: (n) => (n ? `added "${n}" to the menu` : "added a new menu item"),
    update: (n) => (n ? `updated "${n}"` : "updated a menu item"),
    delete: (n) => (n ? `deleted "${n}"` : "deleted a menu item"),
    status_change: (n) =>
      n ? `changed the status of "${n}"` : "changed a menu item's status",
  },
  menu_category: {
    create: (n) => (n ? `added the "${n}" category` : "added a new category"),
    update: (n) => (n ? `updated the "${n}" category` : "updated a category"),
    delete: (n) => (n ? `deleted the "${n}" category` : "deleted a category"),
  },
  staff: {
    create: (n) => (n ? `added ${n} as a new staff member` : "added a new staff member"),
    update: (n) => (n ? `updated ${n}'s details` : "updated a staff member"),
    status_change: (n) =>
      n ? `changed ${n}'s status` : "changed a staff member's status",
  },
  attendance: {
    create: (n) => (n ? `logged attendance for ${n}` : "logged an attendance record"),
    update: (n) => (n ? `updated attendance for ${n}` : "updated an attendance record"),
  },
  branch: {
    create: (n) => (n ? `added "${n}" as a new branch` : "added a new branch"),
    update: (n) => (n ? `updated "${n}"` : "updated a branch"),
    status_change: (n) =>
      n ? `changed the status of "${n}"` : "changed a branch's status",
  },
  order: {
    create: (_n, log) => {
      const v = log.newValue as Record<string, unknown> | null;
      const orderNumber = v?.orderNumber as string | number | undefined;
      const source = v?.source as string | undefined;
      const label = orderNumber ? `order #${orderNumber}` : "a new order";
      return source === "online-ordering" ? `placed ${label} online` : `created ${label}`;
    },
    status_change: (_n, log) => {
      const v = log.newValue as Record<string, unknown> | null;
      const status = v?.status as string | undefined;
      const orderNumber = v?.orderNumber as string | number | undefined;
      const label = orderNumber ? `order #${orderNumber}` : "an order";
      if (status === "confirmed") return `confirmed ${label}`;
      if (status === "completed") {
        const amount = v?.amount as string | number | undefined;
        const method = v?.paymentMethod as string | undefined;
        return amount && method
          ? `completed ${label} — Rs. ${amount} via ${method}`
          : `completed ${label}`;
      }
      if (status === "cancelled") return `cancelled ${label}`;
      return `updated the status of ${label}`;
    },
  },
  payment: {
    create: (_n, log) => {
      const v = log.newValue as Record<string, unknown> | null;
      const amount = v?.amount as string | number | undefined;
      const method = v?.method as string | undefined;
      const orderNumber = v?.orderNumber as string | undefined;
      if (amount && method) {
        return orderNumber
          ? `recorded a ${method} payment of Rs. ${amount} for order ${orderNumber}`
          : `recorded a ${method} payment of Rs. ${amount}`;
      }
      return "recorded a payment";
    },
  },
};

const GENERIC_ACTION_VERB: Record<AuditAction, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  status_change: "changed the status of",
  login: "logged in",
  logout: "logged out",
  assign: "assigned",
  unassign: "unassigned",
  print: "printed",
};

export function describeAuditLog(log: AuditLog): string {
  const name = extractName(log);
  const template = SENTENCE_TEMPLATES[log.resource]?.[log.action];
  if (template) return template(name, log);

  const verb = GENERIC_ACTION_VERB[log.action] ?? log.action;
  const resourceLabel = log.resource.replace(/_/g, " ");
  return name ? `${verb} ${resourceLabel} "${name}"` : `${verb} a ${resourceLabel}`;
}