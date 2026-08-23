"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type AlertModalContextType = {
  showAlert: (message: string, title?: string) => void;
  showConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
};

const AlertModalContext = createContext<AlertModalContextType | null>(null);

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Notice");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({});
  const [resolveConfirm, setResolveConfirm] = useState<((v: boolean) => void) | null>(null);

  const showAlert = useCallback((msg: string, alertTitle = "Notice") => {
    setMessage(msg);
    setTitle(alertTitle);
    setOpen(true);
  }, []);

  const showConfirm = useCallback((msg: string, options: ConfirmOptions = {}) => {
    setConfirmMessage(msg);
    setConfirmOptions(options);
    setConfirmOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveConfirm(() => resolve);
    });
  }, []);

  function handleConfirmChoice(result: boolean) {
    setConfirmOpen(false);
    resolveConfirm?.(result);
    setResolveConfirm(null);
  }

  return (
    <AlertModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmOpen} onOpenChange={(v) => !v && handleConfirmChoice(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmOptions.title ?? "Are you sure?"}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => handleConfirmChoice(false)}>
              {confirmOptions.cancelLabel ?? "Cancel"}
            </Button>
            <AlertDialogAction
              onClick={() => handleConfirmChoice(true)}
              className={confirmOptions.destructive ? "bg-destructive hover:bg-destructive/80" : undefined}
            >
              {confirmOptions.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertModalContext.Provider>
  );
}

export function useAlertModal() {
  const ctx = useContext(AlertModalContext);
  if (!ctx) throw new Error("useAlertModal must be used within AlertModalProvider");
  return ctx;
}