"use client";

import { useState } from "react";
import { KeyRound, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ConfirmPasswordModalProps {
  open: boolean;
  description: string;
  isSubmitting: boolean;
  error?: string | null;
  onConfirm: (password: string) => void;
  onClose: () => void;
}

export function ConfirmPasswordModal({
  open,
  description,
  isSubmitting,
  error,
  onConfirm,
  onClose,
}: ConfirmPasswordModalProps) {
  const [password, setPassword] = useState("");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    onConfirm(password);
  }

  function handleClose() {
    setPassword("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-sm bg-background rounded-xl border shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Confirm Your Password</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}