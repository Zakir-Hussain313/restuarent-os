"use client";

import { useEffect, useState } from "react";
import { Printer, Receipt, XCircle, Loader2, Bike, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitchenTicketModal } from "../modals/KitchenTicketModal";
import { BillModal } from "../modals/BillModal";
import { CancelConfirmModal } from "../modals/CancelConfirmModal";
import { MarkReadyModal } from "../modals/MarkReadyModal";
import { SplitPaymentModal } from "../modals/SplitPaymentModal";
import { getBranchesAction } from "@/features/staff/actions";
import type { Branch } from "@/db/schema";
import type { Order, PaymentMethod } from "@/types";
import type { SplitPaymentLine } from "@/features/orders/actions";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface OrderActionsProps {
  order: Order;
  canPrintKitchenTicket: boolean;
  canMarkReady: boolean;
  onMarkReady: (riderId: string | "auto") => void;
  isMarkingReady: boolean;
  canPrintBill: boolean;
  canCompleteBill: boolean;
  canCancel: boolean;
  onPrintKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  onCompleteBill: (paymentMethod: PaymentMethod) => void;
  isCompletingBill: boolean;
  onCancelOrder: () => void;
  isCancelling: boolean;
  onBillPrinted: () => void;
  canSplitPayment: boolean;
  onSplitPayment: (lines: SplitPaymentLine[]) => void;
  isRecordingSplitPayment: boolean;
}

interface ActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isLoading: boolean;
  variant: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "complimentary", label: "Complimentary" },
];

function ActionButton({
  label,
  icon,
  onClick,
  isLoading,
  variant,
  disabled,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading || disabled}
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 sm:py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        variant === "primary" &&
        "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
        variant === "secondary" &&
        "bg-background text-foreground border-border hover:bg-muted",
        variant === "danger" &&
        "border-red-200 text-red-600 hover:bg-red-50 bg-background"
      )}
    >
      {isLoading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        icon
      )}
      <span>{label}</span>
    </button>
  );
}

export function OrderActions({
  order,
  canPrintKitchenTicket,
  canMarkReady,
  onMarkReady,
  isMarkingReady,
  canPrintBill,
  canCompleteBill,
  canCancel,
  onPrintKitchenTicket,
  isPrintingKitchenTicket,
  onCompleteBill,
  isCompletingBill,
  onCancelOrder,
  isCancelling,
  onBillPrinted,
  canSplitPayment,
  onSplitPayment,
  isRecordingSplitPayment,
}: OrderActionsProps) {
  const { showConfirm } = useAlertModal();
  const [kitchenTicketOpen, setKitchenTicketOpen] = useState(false);
  const [markReadyOpen, setMarkReadyOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [branch, setBranch] = useState<Branch | undefined>(undefined);
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  // Bumped every time the split modal opens — passed as the modal's `key`
  // so it fully remounts (and its internal draft lines reset) instead of
  // needing a setState-in-effect to clear stale state from last time.
  const [splitModalInstance, setSplitModalInstance] = useState(0);
  const [dismissedAutoPrintFor, setDismissedAutoPrintFor] = useState<string | null>(null);
  // Only cash payments have an offline path (see completeBillAction/
  // offlinePaymentQueue) — card/JazzCash/Easypaisa/bank transfer all
  // require a live connection, so they're disabled while offline instead
  // of failing confusingly after the staff member already picked one.
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getBranchesAction().then((res) => {
      if (cancelled) return;
      setBranch(res.branches.find((b) => b.id === order.branchId));
    });
    return () => {
      cancelled = true;
    };
  }, [order.branchId]);

  const isDelivery = order.orderType === "delivery";
  const hasActions = canPrintKitchenTicket || canMarkReady || canPrintBill || canCancel || canSplitPayment;
  // A split payment can complete the order in the same tick this renders,
  // flipping every can* flag above to false before the post-split print
  // modal gets a chance to show. Stay mounted whenever any modal is open,
  // regardless of whether new actions are currently available.
  const anyModalOpen =
    kitchenTicketOpen || markReadyOpen || billOpen || cancelOpen || splitModalOpen;

  // Auto-open + auto-print the bill the moment a delivery order first
  // reaches "ready_for_delivery" — derived at render time, no effect needed.
  // Gated on the persisted billPrintedAt flag (not just dismissedAutoPrintFor,
  // which is component state and resets on every remount — e.g. navigating
  // away and back — causing the popup to reappear even after it was
  // already printed once).
  const autoOpenBill =
    isDelivery &&
    order.status === "ready_for_delivery" &&
    !order.billPrintedAt &&
    dismissedAutoPrintFor !== order.id;

  const isBillModalOpen = billOpen || autoOpenBill;

  if (!hasActions && !anyModalOpen) return null;

  async function handleCompleteOrder() {
    const confirmed = await showConfirm(
      `Mark order ${order.orderNumber} as paid and complete?`,
      { title: "Complete order?", confirmLabel: "Mark Paid" }
    );
    if (!confirmed) return;
    onCompleteBill(paymentMethod);
  }

  async function handleSplitConfirm(lines: SplitPaymentLine[]) {
    const total = lines.reduce((sum, l) => sum + l.amount, 0);
    const confirmed = await showConfirm(
      `Record ${lines.length} payment${lines.length > 1 ? "s" : ""} totaling Rs. ${total.toLocaleString()} toward order ${order.orderNumber}?`,
      { title: "Record payments?", confirmLabel: "Confirm" }
    );
    if (!confirmed) return;
    onSplitPayment(lines);
    setSplitModalOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canPrintKitchenTicket && (
          <ActionButton
            label="Kitchen Ticket"
            icon={<Printer className="w-3.5 h-3.5" />}
            onClick={() => setKitchenTicketOpen(true)}
            isLoading={isPrintingKitchenTicket}
            variant="primary"
          />
        )}

        {canMarkReady && (
          <ActionButton
            label="Mark Ready for Delivery"
            icon={<Bike className="w-3.5 h-3.5" />}
            onClick={() => setMarkReadyOpen(true)}
            isLoading={isMarkingReady}
            variant="primary"
          />
        )}

        {canPrintBill && (
          <>
            <div className="flex flex-col gap-1">
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger className="h-9 sm:h-8 w-auto text-xs font-medium" aria-label="Payment method">
                  <SelectValue>
                    {(value: string) =>
                      PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === value)?.label ?? value
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={!isOnline && opt.value !== "cash"}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isOnline && (
                <span className="text-[10px] text-muted-foreground">
                  Offline — only cash accepted, will sync when reconnected
                </span>
              )}
            </div>

            {isDelivery ? (
              <ActionButton
                label="Complete Order"
                icon={<Receipt className="w-3.5 h-3.5" />}
                onClick={handleCompleteOrder}
                isLoading={isCompletingBill}
                variant="primary"
                disabled={!canCompleteBill}
              />
            ) : (
              <ActionButton
                label="Print Bill"
                icon={<Receipt className="w-3.5 h-3.5" />}
                onClick={() => setBillOpen(true)}
                isLoading={isCompletingBill}
                variant="secondary"
              />
            )}
          </>
        )}

        {canSplitPayment && (
          <ActionButton
            label="Split Payment"
            icon={<Layers className="w-3.5 h-3.5" />}
            onClick={() => {
              setSplitModalInstance((n) => n + 1);
              setSplitModalOpen(true);
            }}
            isLoading={false}
            variant="secondary"
          />
        )}

        {canCancel && (
          <ActionButton
            label="Cancel Order"
            icon={<XCircle className="w-3.5 h-3.5" />}
            onClick={() => setCancelOpen(true)}
            isLoading={isCancelling}
            variant="danger"
          />
        )}
      </div>

      <KitchenTicketModal
        open={kitchenTicketOpen}
        order={order}
        isConfirming={isPrintingKitchenTicket}
        onConfirm={() => {
          onPrintKitchenTicket();
          setKitchenTicketOpen(false);
        }}
        onClose={() => setKitchenTicketOpen(false)}
      />

      <MarkReadyModal
        open={markReadyOpen}
        branchId={order.branchId}
        orderNumber={order.orderNumber}
        isSubmitting={isMarkingReady}
        onConfirm={(riderId) => {
          onMarkReady(riderId);
          setMarkReadyOpen(false);
        }}
        onClose={() => setMarkReadyOpen(false)}
      />

      <SplitPaymentModal
        key={splitModalInstance}
        open={splitModalOpen}
        orderNumber={order.orderNumber}
        balance={order.balance}
        existingPayments={order.payments.filter((p) => p.status === "paid")}
        isSubmitting={isRecordingSplitPayment}
        onConfirm={handleSplitConfirm}
        onClose={() => setSplitModalOpen(false)}
      />

            <BillModal
        open={isBillModalOpen}
        order={order}
        branch={branch}
        paymentMethod={paymentMethod}
        isConfirming={isCompletingBill}
        onConfirm={() => {
          setBillOpen(false);
          setDismissedAutoPrintFor(order.id);
          if (!isDelivery) {
            onCompleteBill(paymentMethod);
          }
        }}
        onClose={() => {
          setBillOpen(false);
          setDismissedAutoPrintFor(order.id);
        }}
        onPrinted={onBillPrinted}
        mode={isDelivery ? "printOnly" : "printAndComplete"}
        autoPrint={false}
      />

      <CancelConfirmModal
        open={cancelOpen}
        orderNumber={order.orderNumber}
        isCancelling={isCancelling}
        onConfirm={() => {
          onCancelOrder();
          setCancelOpen(false);
        }}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}