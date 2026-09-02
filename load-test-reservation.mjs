/**
 * Reservation load test — simulates a real guest: pick location -> pick a
 * table -> book -> capture the phone+code -> look it up on /my-reservations.
 * No login (public flow). Dine-in mode has no area step — city then
 * branch directly.
 *
 * Run:
 *   BASE_URL=https://restuarent-os.vercel.app CONCURRENT_USERS=20 \
 *   CITY="Quetta" BRANCH="Main Branch" node load-test-reservation.mjs
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "10", 10);
const CITY = process.env.CITY || "CITY_HERE";
const BRANCH = process.env.BRANCH || "BRANCH_HERE";

const VIEWPORT = { width: 390, height: 844 };

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function runSession(index, browser) {
  const start = Date.now();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const timings = { sessionId: index };
  const phone = `031${String(index).padStart(7, "0")}`;

  try {
    let t0 = Date.now();
    await page.goto(`${BASE_URL}/book-a-table`);

    await page.getByText(/where would you like to book/i).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: new RegExp(CITY, "i") }).first().click();
    await page.getByRole("button", { name: new RegExp(BRANCH, "i") }).first().click();
    await page.getByRole("button", { name: /^ok$/i }).click();
    timings.locationPickMs = Date.now() - t0;

    t0 = Date.now();
    await page.waitForLoadState("networkidle");
    const tableButton = page.locator('button:not([disabled])[title^="Table "]').first();
    await tableButton.waitFor({ timeout: 15000 });
    await tableButton.click();
    timings.floorPlanLoadMs = Date.now() - t0;

    t0 = Date.now();
    await page.getByLabel(/phone number/i).fill(phone);
    // party size / duration left at their defaults (2, 90min)
    const startTime = toDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)); // 1hr from now
    await page.getByLabel(/date & time/i).fill(startTime);
    await page.getByRole("button", { name: /reserve table/i }).click();

    await page.getByText(/reservation code/i).waitFor({ timeout: 15000 });
    const code = (
      await page.locator("p.text-lg.font-bold").first().textContent()
    )?.trim();
    timings.bookMs = Date.now() - t0;

    if (!code) throw new Error("Could not read confirmation code after booking");

    t0 = Date.now();
    await page.goto(`${BASE_URL}/my-reservations`);
    await page.getByLabel(/phone number/i).fill(phone);
    await page.getByLabel(/reservation code/i).fill(code);
    await page.getByRole("button", { name: /find my reservation/i }).click();
    await page.waitForResponse((res) => res.status() === 200, { timeout: 15000 }).catch(() => {});
    timings.lookupMs = Date.now() - t0;

    timings.totalMs = Date.now() - start;
    timings.ok = true;
  } catch (err) {
    timings.ok = false;
    timings.error = err.message;
    timings.totalMs = Date.now() - start;
    try {
      await page.screenshot({ path: `failure-reservation-session-${index}.png` });
      timings.currentUrl = page.url();
    } catch {}
  } finally {
    await context.close();
  }
  return timings;
}

(async () => {
  console.log(`Starting ${CONCURRENT_USERS} concurrent reservation sessions against ${BASE_URL}`);
  const browser = await chromium.launch();
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_USERS }, (_, i) => runSession(i, browser))
  );
  await browser.close();

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const avg = (key) => (ok.reduce((s, r) => s + (r[key] || 0), 0) / (ok.length || 1)).toFixed(0);

  console.log("\n=== Results ===");
  console.log(`Success: ${ok.length}/${results.length}`);
  console.log(`Avg location pick:  ${avg("locationPickMs")}ms`);
  console.log(`Avg floor plan load: ${avg("floorPlanLoadMs")}ms`);
  console.log(`Avg booking:        ${avg("bookMs")}ms`);
  console.log(`Avg lookup:         ${avg("lookupMs")}ms`);
  console.log(`Avg total:          ${avg("totalMs")}ms`);
  if (failed.length) {
    console.log("\n=== Failures ===");
    failed.forEach((f) =>
      console.log(`Session ${f.sessionId}: ${f.error}${f.currentUrl ? ` (stuck on ${f.currentUrl})` : ""}`)
    );
    console.log("Screenshots saved as failure-reservation-session-N.png");
  }
})();