"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";
import { getAuditLogsAction, type AuditLogFilters } from "@/features/audit-logs/actions";
import { describeAuditLog } from "@/features/audit-logs/describeLog";
import type { AuditLog, AuditResource } from "@/db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

interface AuditLogFeedProps {
  initialLogs: AuditLog[];
  initialBranchNames: Record<string, string>;
  initialCursor: string | null;
  branches: Branch[];
}

const RESOURCE_OPTIONS: { value: AuditResource; label: string }[] = [
  { value: "order", label: "Orders" },
  { value: "order_item", label: "Order Items" },
  { value: "payment", label: "Payments" },
  { value: "menu_item", label: "Menu Items" },
  { value: "menu_category", label: "Menu Categories" },
  { value: "table", label: "Tables" },
  { value: "staff", label: "Staff" },
  { value: "customer", label: "Customers" },
  { value: "delivery", label: "Deliveries" },
  { value: "attendance", label: "Attendance" },
  { value: "tenant_settings", label: "Settings" },
  { value: "branch_settings", label: "Branch Settings" },
  { value: "branch", label: "Branches" },
  { value: "coupon", label: "Coupons" },
];

function formatDayHeading(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameUtcDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  if (isSameUtcDay(date, today)) return "Today";
  if (isSameUtcDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function LogRow({
  log,
  branchName,
}: {
  log: AuditLog;
  branchName?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = Boolean(log.oldValue || log.newValue);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => hasDiff && setExpanded((e) => !e)}
        className="w-full flex items-start gap-3 py-3 px-1 text-left hover:bg-muted transition-colors"
      >
        {hasDiff ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
          )
        ) : (
          <div className="w-3.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{log.actorName ?? "Someone"}</span>{" "}
            {describeAuditLog(log)}
            {branchName && (
              <span className="text-muted-foreground"> · {branchName}</span>
            )}
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 pt-0.5">
          {formatTime(log.createdAt.toString())}
        </span>
      </button>

      {expanded && hasDiff && (
        <div className="pl-7 pb-3 pr-3 space-y-2">
          {log.oldValue !== null && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Before</p>
              <pre className="text-xs bg-muted border border-border rounded-lg p-2.5 overflow-x-auto">
                {JSON.stringify(log.oldValue, null, 2)}
              </pre>
            </div>
          )}
          {log.newValue !== null && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">After</p>
              <pre className="text-xs bg-muted border border-border rounded-lg p-2.5 overflow-x-auto">
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditLogFeed({
  initialLogs,
  initialBranchNames,
  initialCursor,
  branches,
}: AuditLogFeedProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [branchNames, setBranchNames] = useState<Record<string, string>>(initialBranchNames);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function applyFilters(nextBranch: string, nextResource: string) {
    setBranchFilter(nextBranch);
    setResourceFilter(nextResource);
    startTransition(async () => {
      const filters: AuditLogFilters = {};
      if (nextBranch) filters.branchId = nextBranch;
      if (nextResource) filters.resource = nextResource as AuditResource;
      const result = await getAuditLogsAction(filters);
      if (result.success) {
        setLogs(result.logs);
        setBranchNames(Object.fromEntries(result.branchName));
        setCursor(result.nextCursor);
      }
    });
  }

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const filters: AuditLogFilters = { before: cursor };
      if (branchFilter) filters.branchId = branchFilter;
      if (resourceFilter) filters.resource = resourceFilter as AuditResource;
      const result = await getAuditLogsAction(filters);
      if (result.success) {
        setLogs((prev) => [...prev, ...result.logs]);
        setBranchNames((prev) => ({ ...prev, ...Object.fromEntries(result.branchName) }));
        setCursor(result.nextCursor);
      }
    });
  }

  // Group logs by calendar day for date headers.
  const grouped: { heading: string; items: AuditLog[] }[] = [];
  for (const log of logs) {
    const iso = log.createdAt.toString();
    const heading = formatDayHeading(iso);
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.heading === heading) {
      lastGroup.items.push(log);
    } else {
      grouped.push({ heading, items: [log] });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-light shrink-0">
          <Filter className="w-4 h-4 text-primary" />
        </span>
        {branches.length > 1 && (
          <Select
            value={branchFilter || "all"}
            onValueChange={(value) => applyFilters(!value || value === "all" ? "" : value, resourceFilter)}
          >
            <SelectTrigger className="h-9 w-auto">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={resourceFilter || "all"}
          onValueChange={(value) => applyFilters(branchFilter, !value || value === "all" ? "" : value)}
        >
          <SelectTrigger className="h-9 w-auto">
            <SelectValue placeholder="All activity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity types</SelectItem>
            {RESOURCE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feed */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            No activity found.
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.heading}>
              <div className="px-4 py-2 bg-primary-light border-b border-border text-xs font-semibold uppercase tracking-wide text-primary">
                {group.heading}
              </div>
              <div className="px-4">
                {group.items.map((log) => (
                  <LogRow key={log.id} log={log} branchName={branchNames[log.branchId ?? ""]} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {cursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="w-full py-2.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}