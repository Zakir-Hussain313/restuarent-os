"use client";

import { useState } from "react";
import { Printer, Receipt, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { KitchenTicketModal } from "../modals/KitchenTicketModal";
import { BillModal } from "../modals/BillModal";
import { CancelConfirmModal } from "../modals/CancelConfirmModal";
import type { Order } from "@/types";

interface OrderActionsProps {
  order: Order;
  canPrintKitchenTicket: boolean;
  canPrintBill: boolean;
  canCancel: boolean;
  onPrintKitchenTicket: () => void;
  isPrintingKitchenTicket: boolean;
  onCompleteBill: () => void;
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
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
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
  canCancel,
  onPrintKitchenTicket,
  isPrintingKitchenTicket,
  onCompleteBill,
  isCompletingBill,
  onCancelOrder,
  isCancelling,
}: OrderActionsProps) {
  const [kitchenTicketOpen, setKitchenTicketOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const hasActions = canPrintKitchenTicket || canPrintBill || canCancel;

  if (!hasActions) return null;

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
          <ActionButton
            label="Print Bill"
            icon={<Receipt className="w-3.5 h-3.5" />}
            onClick={() => setBillOpen(true)}
            isLoading={isCompletingBill}
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

      <BillModal
        open={billOpen}
        order={order}
        isConfirming={isCompletingBill}
        onConfirm={() => {
          onCompleteBill();
          setBillOpen(false);
        }}
        onClose={() => setBillOpen(false)}
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