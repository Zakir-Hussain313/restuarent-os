"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type AlertModalContextType = {
  showAlert: (message: string, title?: string) => void;
};

const AlertModalContext = createContext<AlertModalContextType | null>(null);

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("Notice");

  const showAlert = useCallback((msg: string, alertTitle = "Notice") => {
    setMessage(msg);
    setTitle(alertTitle);
    setOpen(true);
  }, []);

  return (
    <AlertModalContext.Provider value={{ showAlert }}>
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
    </AlertModalContext.Provider>
  );
}

export function useAlertModal() {
  const ctx = useContext(AlertModalContext);
  if (!ctx) throw new Error("useAlertModal must be used within AlertModalProvider");
  return ctx;
}