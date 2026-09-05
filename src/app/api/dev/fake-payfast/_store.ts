// In-memory store for the fake PayFast dev simulator only.
// Resets on dev server restart — that's fine, this is throwaway test tooling.
// Pinned on globalThis because Next.js dev (Turbopack) can bundle each API
// route as a separate module instance — a plain module-level Map would then
// end up duplicated (one per route), so different routes wouldn't see each
// other's writes.
type Outcome = "paid" | "failed";

const globalForFakePayfast = globalThis as unknown as {
    __fakePayfastOutcomes?: Map<string, Outcome>;
};

const outcomes = globalForFakePayfast.__fakePayfastOutcomes ?? new Map<string, Outcome>();
globalForFakePayfast.__fakePayfastOutcomes = outcomes;

export function setOutcome(basketId: string, outcome: Outcome) {
    outcomes.set(basketId, outcome);
}

export function getOutcome(basketId: string): Outcome | undefined {
    return outcomes.get(basketId);
}