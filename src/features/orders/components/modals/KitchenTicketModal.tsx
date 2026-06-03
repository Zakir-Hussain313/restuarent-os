"use client";

import { useRef } from "react";
import { Printer, X, Loader2, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/types";

interface KitchenTicketModalProps {
  open: boolean;
  order: Order;
  isConfirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in:  "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function KitchenTicketModal({
  open,
  order,
  isConfirming,
  onConfirm,
  onClose,
}: KitchenTicketModalProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function handlePrint() {
    const ticketHtml = ticketRef.current?.innerHTML;
    if (!ticketHtml) return;

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kitchen Ticket — ${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 13px;
              color: #000;
              background: #fff;
              padding: 16px;
              width: 300px;
            }
            .ticket-header { text-align: center; margin-bottom: 12px; }
            .ticket-header h1 { font-size: 18px; font-weight: 700; letter-spacing: 2px; }
            .ticket-header p { font-size: 11px; margin-top: 2px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; }
            .meta-label { font-weight: 600; }
            .items-header { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
            .item { margin-bottom: 10px; }
            .item-main { display: flex; gap: 8px; font-weight: 700; font-size: 14px; }
            .item-qty { min-width: 24px; }
            .item-modifier { font-size: 11px; padding-left: 32px; color: #333; margin-top: 2px; }
            .item-notes { font-size: 11px; padding-left: 32px; font-style: italic; color: #555; margin-top: 2px; }
            .footer { text-align: center; font-size: 10px; margin-top: 12px; color: #555; }
          </style>
        </head>
        <body>${ticketHtml}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    onConfirm();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border shadow-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
              <ChefHat className="w-4 h-4 text-orange-600" />
            </div>
            <h2 className="text-sm font-semibold">Kitchen Ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5">
          <div
            ref={ticketRef}
            className="font-mono text-sm bg-white text-black border border-dashed border-gray-300 rounded-lg p-4 space-y-3"
          >
            <div className="ticket-header text-center space-y-0.5">
              <h1 className="text-base font-black tracking-widest uppercase">
                Kitchen Ticket
              </h1>
              <p className="text-xs text-gray-500">Rice n Spice</p>
            </div>

            <div className="divider border-t border-dashed border-gray-400" />

            <div className="space-y-1">
              <div className="meta-row flex justify-between text-xs">
                <span className="font-bold">Order</span>
                <span>{order.orderNumber}</span>
              </div>
              <div className="meta-row flex justify-between text-xs">
                <span className="font-bold">Type</span>
                <span>{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span>
              </div>
              {order.tableNumber && (
                <div className="meta-row flex justify-between text-xs">
                  <span className="font-bold">Table</span>
                  <span>{order.tableNumber}</span>
                </div>
              )}
              {order.customerName && (
                <div className="meta-row flex justify-between text-xs">
                  <span className="font-bold">Customer</span>
                  <span>{order.customerName}</span>
                </div>
              )}
              <div className="meta-row flex justify-between text-xs">
                <span className="font-bold">Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="meta-row flex justify-between text-xs">
                <span className="font-bold">Time</span>
                <span>{formatTime(order.createdAt)}</span>
              </div>
            </div>

            <div className="divider border-t border-dashed border-gray-400" />

            <div className="space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Items
              </p>
              {order.items
                .filter((item) => item.status !== "cancelled")
                .map((item) => (
                  <div key={item.id} className="item space-y-0.5">
                    <div className="item-main flex items-start gap-2 font-bold text-sm">
                      <span className="min-w-5 text-right shrink-0">
                        {item.quantity}x
                      </span>
                      <span className="flex-1">{item.menuItemName}</span>
                    </div>
                    {item.selectedVariant && (
                      <p className="item-modifier text-[11px] text-gray-600 pl-8">
                        › {item.selectedVariant.variantName}
                      </p>
                    )}
                    {item.selectedModifiers.map((mod) => (
                      <p
                        key={mod.optionId}
                        className="item-modifier text-[11px] text-gray-600 pl-8"
                      >
                        + {mod.optionName}
                      </p>
                    ))}
                    {item.notes && (
                      <p className="item-notes text-[11px] text-gray-500 italic pl-8">
                        ✎ {item.notes}
                      </p>
                    )}
                  </div>
                ))}
            </div>

            {order.notes && (
              <>
                <div className="divider border-t border-dashed border-gray-400" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Order Notes
                  </p>
                  <p className="text-xs italic text-gray-600">{order.notes}</p>
                </div>
              </>
            )}

            <div className="divider border-t border-dashed border-gray-400" />

            <p className="footer text-center text-[10px] text-gray-400">
              {formatDate(order.createdAt)} · {formatTime(order.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t shrink-0">
          <button
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            disabled={isConfirming}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isConfirming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            Print & Confirm
          </button>
        </div>
      </div>
    </div>
  );
}