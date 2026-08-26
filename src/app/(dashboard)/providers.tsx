"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { get, set, del } from "idb-keyval";
import type { Persister } from "@tanstack/query-persist-client-core";
import { SerwistProvider } from "@serwist/next/react";
import { queryKeys } from "@/hooks/useMockQuery";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { AlertModalProvider } from "@/components/providers/AlertModalProvider";

// IndexedDB-backed persister for TanStack Query — only used to persist
// stable reference data (menu categories/items) so the POS can render
// offline. Deliberately does NOT persist tables/riders/orders/customers:
// that data changes in real time and serving a stale cached copy while
// offline is more dangerous than showing nothing (e.g. staff could seat
// a table that was actually just occupied by another terminal).
//
// Scoped to (dashboard) only — the storefront gets a plain
// QueryClientProvider from the root layout (see src/app/providers.tsx)
// since customers never need offline POS caching.
function createIDBPersister(idbKey = "zaiqa-query-cache"): Persister {
  return {
    persistClient: async (client) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        console.error("[queryCachePersister] Failed to persist client:", err);
      }
    },
    restoreClient: async () => {
      return await get(idbKey);
    },
    removeClient: async () => {
      await del(idbKey);
    },
  };
}

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  const [persister] = useState(() => createIDBPersister());

  return (
    // Service worker is scoped to this (dashboard) tree only via where
    // SerwistProvider is mounted — the public storefront layout never
    // renders this, so customers never register/precache it. Registering
    // here (not disabled) is safe: only staff/POS clients ever load it.
    <SerwistProvider swUrl="/sw.js" register cacheOnNavigation reloadOnOnline>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 1000 * 60 * 60 * 12, // 12 hours — safe upper bound for a shift
          dehydrateOptions: {
            shouldDehydrateMutation: () => false,
            shouldDehydrateQuery: (query) => {
              if (query.state.status !== "success") return false;

              const key = query.queryKey;
              const isCategoriesQuery =
                key.length === queryKeys.menu.categories.length + 1 &&
                key[0] === queryKeys.menu.categories[0] &&
                key[1] === queryKeys.menu.categories[1];

              const isItemsQuery =
                key.length === queryKeys.menu.items.length + 1 &&
                key[0] === queryKeys.menu.items[0] &&
                key[1] === queryKeys.menu.items[1];

              return isCategoriesQuery || isItemsQuery;
            },
          },
        }}
      >
        <OfflineSyncManager />
        <AlertModalProvider>{children}</AlertModalProvider>
      </PersistQueryClientProvider>
    </SerwistProvider>
  );
}