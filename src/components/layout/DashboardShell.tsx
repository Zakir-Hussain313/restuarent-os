"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuthStore, type AuthStaff } from "@/store/useAuthStore";

interface DashboardShellProps {
  children: React.ReactNode;
  // Fetched server-side by whatever page/layout renders this component
  // (e.g. await getSupabaseServerClient() session -> query `staff` by id).
  // Pass null if no session/staff row was found.
  currentStaff: AuthStaff | null;
}

export function DashboardShell({ children, currentStaff }: DashboardShellProps) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Sync the store once with what the server already resolved.
  // Runs again if currentStaff identity changes (e.g. after a server
  // action revalidates the page with a different staff row).
  useEffect(() => {
    hydrate(currentStaff);
  }, [currentStaff, hydrate]);

  // Avoid a flash of "logged out" Sidebar state before hydration runs.
  if (!isHydrated) {
    return null; // or a lightweight skeleton, if preferred
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9f8f6]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}