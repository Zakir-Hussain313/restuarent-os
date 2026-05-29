/**
 * Mock query adapter — wraps mock data in simulated async calls.
 * When backend is ready, replace the factory function with real API calls.
 * TanStack Query hooks stay identical — zero rewrite.
 */

export function createMockQueryFn<T>(data: T, delayMs = 500): () => Promise<T> {
  return () =>
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(structuredClone(data) as T), delayMs);
    });
}

export function createMockMutationFn<TInput, TOutput>(
  handler: (input: TInput) => TOutput,
  delayMs = 400
): (input: TInput) => Promise<TOutput> {
  return (input: TInput) =>
    new Promise<TOutput>((resolve, reject) => {
      setTimeout(() => {
        try {
          resolve(handler(input));
        } catch (err) {
          reject(err);
        }
      }, delayMs);
    });
}

// Query key factory — centralized, prevents typos across the codebase
export const queryKeys = {
  restaurant: ["restaurant"] as const,
  staff: {
    all: ["staff"] as const,
    detail: (id: string) => ["staff", id] as const,
  },
  menu: {
    categories: ["menu", "categories"] as const,
    items: ["menu", "items"] as const,
    item: (id: string) => ["menu", "items", id] as const,
    byCategory: (categoryId: string) => ["menu", "items", "category", categoryId] as const,
  },
  orders: {
    all: ["orders"] as const,
    active: ["orders", "active"] as const,
    detail: (id: string) => ["orders", id] as const,
    byTable: (tableId: string) => ["orders", "table", tableId] as const,
  },
  tables: {
    all: ["tables"] as const,
    sections: ["tables", "sections"] as const,
    detail: (id: string) => ["tables", id] as const,
  },
  customers: {
    all: ["customers"] as const,
    detail: (id: string) => ["customers", id] as const,
  },
  analytics: {
    dashboard: ["analytics", "dashboard"] as const,
    report: (from: string, to: string) => ["analytics", "report", from, to] as const,
  },
} as const;