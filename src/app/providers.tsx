"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState } from "react";
import { get, set, del } from "idb-keyval";
import type { Persister } from "@tanstack/query-persist-client-core";
import { queryKeys } from "@/hooks/useMockQuery";
import { OfflineSyncManager } from "@/components/OfflineSyncManager";
import { AlertModalProvider } from "@/components/providers/AlertModalProvider";

// IndexedDB-backed persister for TanStack Query — only used to persist
// stable reference data (menu categories/items) so the POS can render
// offline. Deliberately does NOT persist tables/riders/orders/customers:
// that data changes in real time and serving a stale cached copy while
// offline is more dangerous than showing nothing (e.g. staff could seat
// a table that was actually just occupied by another terminal).
function createIDBPersister(idbKey = "zaiqa-query-cache"): Persister {
  return {
    persistClient: async (client) => {
      try {
        await set(idbKey, client);
      } catch (err) {
        // Don't let a persistence failure take down the app â€” the query
        // cache still works in-memory even if it can't be written to disk.
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

export function Providers({ children }: { children: React.ReactNode }) {
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 12, // 12 hours â€” safe upper bound for a shift
        dehydrateOptions: {
          // Never persist mutations â€” offline order writes are handled by
          // our own dedicated queue (offlineOrderQueue.ts), not TanStack's
          // built-in persistence, and an in-flight mutation can carry a
          // live Promise reference that IndexedDB's structured clone
          // can't serialize.
          shouldDehydrateMutation: () => false,
          shouldDehydrateQuery: (query) => {
            // Only persist queries that have actually finished successfully —
            // a query still mid-fetch can carry an internal Promise reference
            // that structuredClone can't serialize into IndexedDB.
            if (query.state.status !== "success") return false;

            const key = query.queryKey;
            // Exact-length, exact-value match only — NOT a prefix match.
            // A prefix match on ["menu","items"] also catches
            // queryKeys.menu.item(id) (["menu","items",id]) and
            // queryKeys.menu.byCategory(id) (["menu","items","category",id]),
            // which are different queries with different shaped data and
            // must not be swept into this persistence bucket.
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
  );
}