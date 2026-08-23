"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Lightweight root provider — just TanStack Query, no persistence.
// The IndexedDB-backed persister + offline sync + AlertModalProvider
// are POS-specific concerns and live in (dashboard)/providers.tsx instead,
// so customer-facing storefront pages don't pay for IndexedDB setup,
// persistence machinery, or a 45s offline-sync poll they'll never use.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}