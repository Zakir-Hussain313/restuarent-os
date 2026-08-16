"use client";

import { useRef } from "react";
import { Printer, X, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { Order, PaymentMethod } from "@/types";
import type { Branch } from "@/db/schema";
import { RESTAURANT_CONFIG } from "@/config/restaurant";

interface BillModalProps {
  open: boolean;
  order: Order;
  branch?: Branch;
  paymentMethod: PaymentMethod;
  isConfirming: boolean;
  onConfirm: () => void;
  onClose: () => void;
  mode?: "printAndComplete" | "printOnly" | "completeOnly";
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank_transfer: "Bank Transfer",
  complimentary: "Complimentary",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(RESTAURANT_CONFIG.locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(RESTAURANT_CONFIG.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BillModal({
  open,
  order,
  branch,
  paymentMethod,
  isConfirming,
  onConfirm,
  onClose,
  mode = "printAndComplete",
}: BillModalProps) {
  const billRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function handleAction() {
    if (mode === "completeOnly") {
      onConfirm();
      return;
    }

    const billHtml = billRef.current?.innerHTML;
    if (!billHtml) return;

    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill — ${order.orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 12px;
              color: #000;
              background: #fff;
              padding: 16px;
              width: 300px;
            }
            .text-center { text-align: center; }
            .font-bold { font-weight: 700; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12px; }
            .text-lg { font-size: 16px; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 3px; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .row-bold { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #000; }
            .item-name { flex: 1; }
            .item-qty { min-width: 28px; text-align: right; margin-right: 8px; }
            .item-price { min-width: 60px; text-align: right; }
            .modifier { font-size: 10px; color: #555; padding-left: 8px; margin-top: 1px; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #555; }
          </style>
        </head>
        <body>${billHtml}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    onConfirm();
  }

  const activeItems = order.items.filter((item) => item.status !== "cancelled");

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
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-semibold">Print Bill</h2>
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
            ref={billRef}
            className="font-mono text-sm bg-white text-black border border-dashed border-gray-300 rounded-lg p-4 space-y-3"
          >
            <div className="text-center space-y-0.5">
              <h1 className="text-base font-black tracking-widest uppercase">
                {RESTAURANT_CONFIG.name}
              </h1>
              {branch?.address && (
                <p className="text-[10px] text-gray-500">
                  {branch.address}
                </p>
              )}
              {branch?.phone && (
                <p className="text-[10px] text-gray-500">
                  Tel: {branch.phone}
                </p>
              )}
              {branch?.email && (
                <p className="text-[10px] text-gray-500">
                  {branch.email}
                </p>
              )}
            </div>

            <div className="border-t border-dashed border-gray-400" />

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-bold">Order</span>
                <span>{order.orderNumber}</span>
              </div>
              {order.wasOfflineOrder && order.offlineRef && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Offline Ref</span>
                  <span>{order.offlineRef}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="font-bold">Type</span>
                <span>{ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}</span>
              </div>
              {order.tableNumber && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Table</span>
                  <span>{order.tableNumber}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Phone</span>
                  <span>{order.customerPhone}</span>
                </div>
              )}
              {order.riderName && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Rider</span>
                  <span>{order.riderName}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="font-bold">Date</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold">Time</span>
                <span>{formatTime(order.createdAt)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400" />

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                <span>Item</span>
                <div className="flex gap-4">
                  <span>Qty</span>
                  <span className="min-w-15 text-right">Amount</span>
                </div>
              </div>

              {activeItems.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium flex-1 leading-tight">
                      {item.menuItemName}
                    </span>
                    <div className="flex gap-4 shrink-0">
                      <span className="text-xs text-right min-w-5">
                        {item.quantity}
                      </span>
                      <span className="text-xs font-semibold tabular-nums min-w-15 text-right">
                        {formatCurrency(item.itemTotal)}
                      </span>
                    </div>
                  </div>
                  {item.selectedVariant && (
                    <p className="text-[10px] text-gray-500 pl-2">
                      › {item.selectedVariant.variantName}
                    </p>
                  )}
                  {item.selectedModifiers.map((mod) => (
                    <p
                      key={mod.optionId}
                      className="text-[10px] text-gray-500 pl-2"
                    >
                      + {mod.optionName}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-400" />

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
              </div>

              {order.discounts.map((d) => (
                <div key={d.id} className="flex justify-between text-xs text-gray-600">
                  <span>
                    {d.name}{" "}
                    {d.type === "percentage" ? `(${d.value}%)` : ""}
                  </span>
                  <span className="tabular-nums text-green-700">
                    − {formatCurrency(d.appliedAmount)}
                  </span>
                </div>
              ))}

              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Delivery Fee</span>
                  <span className="tabular-nums">
                    {formatCurrency(order.deliveryFee)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-2 border-t border-gray-400">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatCurrency(order.total)}</span>
              </div>

              <div className="flex justify-between text-xs text-gray-600 pt-1">
                <span>Payment Method</span>
                <span className="font-medium">
                  {PAYMENT_METHOD_LABELS[paymentMethod]}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-400" />

            <div className="text-center space-y-1">
              <p className="text-[11px] font-bold">Thank you for dining with us!</p>
              <p className="text-[10px] text-gray-500">
                Please visit again · {RESTAURANT_CONFIG.name}
              </p>
            </div>
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
            onClick={handleAction}
            disabled={isConfirming}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isConfirming ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            {mode === "printOnly" && "Print Bill"}
            {mode === "completeOnly" && "Complete Order"}
            {mode === "printAndComplete" && "Print & Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}