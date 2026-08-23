"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        This page hit an error. Your other tabs and data are unaffected.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-black/80"
        >
          Try again
        </button>
        <a
          href="/dashboard"
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to dashboard
        </a>
      </div>
    </div>
  );
}