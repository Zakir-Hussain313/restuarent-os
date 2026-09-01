/**
 * Load test: N concurrent staff logins placing a Dine-in order each.
 * Real browser sessions — needed because POS/orders run through Next.js
 * server actions, not plain REST endpoints k6 can hit directly.
 *
 * Setup:
 *   npm i -D playwright
 *   npx playwright install chromium
 *
 * Run:
 *   BASE_URL=https://your-staging-url STAFF_EMAIL=... STAFF_PASSWORD=... \
 *   CONCURRENT_USERS=10 node load-test-pos.js
 *
 * Notes:
 *   - Point this at STAGING, never a live client's production instance.
 *   - Uses one real staff account across all concurrent sessions on purpose —
 *     this is the realistic worst case (same branch, same clocked-in staff
 *     pool, same coupon-splitting logic) during a rush.
 *   - The item name/table selectors below are placeholders — swap
 *     "ITEM_NAME_HERE" for a real menu item you've seeded in staging.
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const STAFF_EMAIL = process.env.STAFF_EMAIL;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD;
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "10", 10);
const ITEM_NAME = process.env.ITEM_NAME || "ITEM_NAME_HERE";

if (!STAFF_EMAIL || !STAFF_PASSWORD) {
  console.error("Set STAFF_EMAIL and STAFF_PASSWORD env vars first.");
  process.exit(1);
}

async function runSession(index, browser) {
  const start = Date.now();
  const context = await browser.newContext();
  const page = await context.newPage();
  const timings = { sessionId: index };

  try {
    // 1. Login
    let t0 = Date.now();
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel("Email").fill(STAFF_EMAIL);
    await page.getByLabel("Password").fill(STAFF_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|pos/, { timeout: 15000 });
    timings.loginMs = Date.now() - t0;

    // 2. Go to POS
    t0 = Date.now();
    await page.goto(`${BASE_URL}/pos`);
    await page.waitForLoadState("networkidle");
    timings.posLoadMs = Date.now() - t0;

    // 3. Select Dine-in, add an item, place order
    t0 = Date.now();
    await page.getByText(/dine[\s-]?in/i).first().click();
    await page.getByText(ITEM_NAME, { exact: false }).first().click();
    await page.getByRole("button", { name: /place order/i }).click();
    await page.waitForResponse((res) => res.status() === 200, { timeout: 15000 }).catch(() => {});
    timings.orderMs = Date.now() - t0;

    timings.totalMs = Date.now() - start;
    timings.ok = true;
  } catch (err) {
    timings.ok = false;
    timings.error = err.message;
    timings.totalMs = Date.now() - start;
    try {
      await page.screenshot({ path: `failure-session-${index}.png` });
      timings.currentUrl = page.url();
    } catch {}
  } finally {
    await context.close();
  }

  return timings;
}

(async () => {
  console.log(`Starting ${CONCURRENT_USERS} concurrent sessions against ${BASE_URL}`);
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
  console.log(`Avg login time:  ${avg("loginMs")}ms`);
  console.log(`Avg POS load:    ${avg("posLoadMs")}ms`);
  console.log(`Avg order place: ${avg("orderMs")}ms`);
  console.log(`Avg total:       ${avg("totalMs")}ms`);

  if (failed.length) {
    console.log("\n=== Failures ===");
    failed.forEach((f) => console.log(`Session ${f.sessionId}: ${f.error}${f.currentUrl ? ` (stuck on ${f.currentUrl})` : ""}`));
    console.log("Screenshots saved as failure-session-N.png — open one to see what the browser actually saw.");
  }
})();
