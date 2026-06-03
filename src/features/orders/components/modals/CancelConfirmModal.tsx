"use client";

import { AlertTriangle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CancelConfirmModalProps {
  open: boolean;
  orderNumber: string;
  isCancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelConfirmModal({
  open,
  orderNumber,
  isCancelling,
  onConfirm,
  onClose,
}: CancelConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Cancel Order
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Are you sure you want to cancel{" "}
            <span className="font-semibold text-foreground">{orderNumber}</span>?
            This action cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Keep Order
          </button>
          <button
            onClick={onConfirm}
            disabled={isCancelling}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isCancelling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            Yes, Cancel Order
          </button>
        </div>
      </div>
    </div>
  );
}