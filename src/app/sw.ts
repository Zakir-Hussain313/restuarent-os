/// <reference lib="webworker" />
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";
import { NetworkOnly } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Protected/authenticated routes must never serve cached HTML — a cached
// page here could belong to a different session, role, or logged-out
// state entirely. These always require a live network response; if
// offline, the /offline fallback below takes over instead.
const PROTECTED_PATHS = [
  "/dashboard", "/pos", "/orders", "/tables", "/menu", "/staff",
  "/attendance", "/settings", "/audit-logs", "/admins", "/branches",
  "/riders", "/reports",
];

const protectedPageRoute = {
  matcher: ({ request, url, sameOrigin }: { request: Request; url: URL; sameOrigin: boolean }) =>
    sameOrigin &&
    request.destination === "document" &&
    PROTECTED_PATHS.some((p) => url.pathname.startsWith(p)),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST || []),
    { url: "/offline", revision: null },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Protected-route rule checked first, then Serwist's normal Next.js
  // caching for everything else (static assets, public pages).
  runtimeCaching: [protectedPageRoute, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// One-time cleanup: remove any stale cached HTML from before this fix
// existed, so an already-bad cached login page doesn't linger up to its
// normal 24h expiry.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.delete("pages").catch(() => {})
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "New Delivery";
  const options: NotificationOptions = {
    body: data.body || "You have a new delivery assigned.",
    data: { url: data.url || "/riders" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/riders";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});