import type { ReactNode } from "react";
import { AlertModalProvider } from "@/components/providers/AlertModalProvider";

export default function RidersLayout({ children }: { children: ReactNode }) {
    return (
        <AlertModalProvider>
            <div className="min-h-screen bg-muted/30">{children}</div>
        </AlertModalProvider>
    );
}