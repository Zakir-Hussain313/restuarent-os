"use client";

import { useEffect, useState } from "react";
import { Printer, Receipt, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitchenTicketModal } from "../modals/KitchenTicketModal";
import { BillModal } from "../modals/BillModal";
import { CancelConfirmModal } from "../modals/CancelConfirmModal";
import { getBranchesAction } from "@/features/staff/actions";
import type { Branch } from "@/db/schema";
import type { Order, PaymentMethod } from "@/types";
import { useAlertModal } from "@/components/providers/AlertModalProvider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface OrderActionsProps {
  order: Order;
  canPrintKitchenTicket: boolean;
  canPrintBill: boolean;
  canCompleteBill: boolean;
  canCancel: boolean;
  onPrintKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  onCompleteBill: (paymentMethod: PaymentMethod) => void;
  isCompletingBill: boolean;
  onCancelOrder: () => void;
  isCancelling: boolean;
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
  canPrintBill,
  canCompleteBill,
  canCancel,
  onPrintKitchenTicket,
  isPrintingKitchenTicket,
  onCompleteBill,
  isCompletingBill,
  onCancelOrder,
  isCancelling,
}: OrderActionsProps) {
  const { showConfirm } = useAlertModal();
  const [kitchenTicketOpen, setKitchenTicketOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [billPrinted, setBillPrinted] = useState(false);
  const [branch, setBranch] = useState<Branch | undefined>(undefined);

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
  const hasActions = canPrintKitchenTicket || canPrintBill || canCancel;

  if (!hasActions) return null;

  async function handleCompleteOrder() {
    const confirmed = await showConfirm(
      `Mark order ${order.orderNumber} as paid and complete?`,
      { title: "Complete order?", confirmLabel: "Mark Paid" }
    );
    if (!confirmed) return;
    onCompleteBill(paymentMethod);
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

        {canPrintBill && (
          <>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="h-9 sm:h-8 w-auto text-xs font-medium" aria-label="Payment method">
                <SelectValue>
                  {(value: string) =>
                    PAYMENT_METHOD_OPTIONS.find((opt) => opt.value === value)?.label ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isDelivery ? (
              billPrinted ? (
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
                  isLoading={false}
                  variant="secondary"
                />
              )
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

      <BillModal
        open={billOpen}
        order={order}
        branch={branch}
        paymentMethod={paymentMethod}
        isConfirming={isCompletingBill}
        onConfirm={() => {
          setBillOpen(false);
          if (isDelivery) {
            setBillPrinted(true);
          } else {
            onCompleteBill(paymentMethod);
          }
        }}
        onClose={() => setBillOpen(false)}
        mode={isDelivery ? "printOnly" : "printAndComplete"}
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