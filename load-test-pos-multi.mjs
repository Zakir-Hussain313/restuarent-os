/**
 * Multi-account version of load-test-pos.mjs — each concurrent session
 * uses a DIFFERENT staff account (loadtest1..N@loadtest.ricenspice.internal),
 * so we're testing real concurrency, not tripping the login rate limiter.
 *
 * Requires: seed-load-test-staff.mjs already run.
 *
 * Run:
 *   BASE_URL=https://restuarent-os.vercel.app CONCURRENT_USERS=50 \
 *   ITEM_NAME="seekh kabab" node load-test-pos-multi.mjs
 */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "10", 10);
const ITEM_NAME = process.env.ITEM_NAME || "ITEM_NAME_HERE";
const EMAIL_DOMAIN = "loadtest.ricenspice.internal";
const PASSWORD = "LoadTest123!";

async function runSession(index, browser) {
  const email = `loadtest${(index % 30) + 1}@${EMAIL_DOMAIN}`;
  const start = Date.now();
  const context = await browser.newContext();
  const page = await context.newPage();
  const timings = { sessionId: index, email };

  try {
    let t0 = Date.now();
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/dashboard|pos/, { timeout: 20000 });
    timings.loginMs = Date.now() - t0;

    t0 = Date.now();
    await page.goto(`${BASE_URL}/pos`);
    await page.waitForLoadState("networkidle");
    timings.posLoadMs = Date.now() - t0;

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
      await page.screenshot({ path: `failure-multi-session-${index}.png` });
      timings.currentUrl = page.url();
    } catch {}
  } finally {
    await context.close();
  }

  return timings;
}

(async () => {
  console.log(`Starting ${CONCURRENT_USERS} concurrent sessions (multi-account) against ${BASE_URL}`);
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
    failed.forEach((f) => console.log(`Session ${f.sessionId} (${f.email}): ${f.error}${f.currentUrl ? ` (stuck on ${f.currentUrl})` : ""}`));
    console.log("Screenshots saved as failure-multi-session-N.png");
  }
})();