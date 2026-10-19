"use client";

import { useQuery } from "@tanstack/react-query";
import { History, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { queryKeys } from "@/hooks/useMockQuery";
import { getOrderRevisionsAction } from "@/features/orders/actions";
import { printOrderUpdateTicket } from "@/features/orders/lib/printOrderUpdateTicket";
import type { OrderRevisionDTO } from "@/features/orders/lib/orderEditing";
import type { OrderRevisionLine } from "@/db/schema";
import type { Order } from "@/types";

function lineLabel(line: OrderRevisionLine): string {
  return `${line.menuItemName}${line.variantName ? ` (${line.variantName})` : ""}`;
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RevisionRow({ order, revision }: { order: Order; revision: OrderRevisionDTO }) {
  const { added, cancelled, quantityChanged } = revision.changes;
  const diff = revision.totalAfter - revision.totalBefore;

  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">Update #{revision.revision}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>
              {revision.editedByName ?? "Unknown"} · {formatWhen(revision.createdAt)}
            </span>
            {revision.editorDeleted && (
              <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                Deleted
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void printOrderUpdateTicket({ order, revision })}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-input px-2.5 text-xs font-medium hover:bg-primary-light hover:text-primary"
        >
          <Printer className="h-3.5 w-3.5" />
          Reprint
        </button>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs">
        {added.map((l) => (
          <li key={`a-${l.itemId}`} className="text-primary">
            + {l.quantity}× {lineLabel(l)}
          </li>
        ))}
        {cancelled.map((l) => (
          <li key={`c-${l.itemId}`} className="text-destructive line-through">
            − {l.quantity}× {lineLabel(l)}
          </li>
        ))}
        {quantityChanged.map((l) => (
          <li key={`q-${l.itemId}`} className="text-amber-600">
            ~ {lineLabel(l)} {l.fromQuantity} → {l.quantity}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="italic">{revision.reason ?? ""}</span>
        <span className="tabular-nums">
          {formatCurrency(revision.totalBefore)} → {formatCurrency(revision.totalAfter)}
          {diff !== 0 && (
            <span className={diff > 0 ? "text-primary" : "text-destructive"}>
              {" "}
              ({diff > 0 ? "+" : "−"}
              {formatCurrency(Math.abs(diff))})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// Every saved item edit on this order, newest first, with a reprint button
// for its update ticket. Renders nothing until loaded (or if the viewer isn't
// allowed to see edit history).
export function OrderEditHistory({ order }: { order: Order }) {
  // The revision number is part of the key: a new edit is a new cache entry
  // (fetched fresh), and an old entry never goes stale because saved
  // revisions never change.
  const { data } = useQuery({
    queryKey: [...queryKeys.orders.detail(order.id), "revisions", order.revision] as const,
    queryFn: async () => {
      const res = await getOrderRevisionsAction(order.id);
      if (res.data === null) throw new Error(res.error);
      return res.data;
    },
    retry: false,
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="px-5 py-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        Edit history
      </p>
      <div className="space-y-2">
        {data.map((revision) => (
          <RevisionRow key={revision.revision} order={order} revision={revision} />
        ))}
      </div>
    </div>
  );
}