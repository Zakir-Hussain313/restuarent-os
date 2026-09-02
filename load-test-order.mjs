/**
 * Storefront online-ordering load test — simulates a real guest customer:
 * pick location -> browse menu -> add item -> checkout as guest.
 * No login involved (public flow).
 *
 * Requires: a multi-branch tenant, so CITY/AREA must match real values
 * configured under Settings -> Delivery Areas.
 *
 * Run:
 *   BASE_URL=https://restuarent-os.vercel.app CONCURRENT_USERS=20 \
 *   ITEM_NAME="seekh kabab" CITY="Quetta" AREA="Jinnah Town" \
 *   node load-test-order.mjs
 */
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "10", 10);
const ITEM_NAME = process.env.ITEM_NAME || "ITEM_NAME_HERE";
const CITY = process.env.CITY || "CITY_HERE";
const AREA = process.env.AREA || "AREA_HERE";

// Narrow viewport so the mobile "View Cart" checkout bar is always present,
// matching how most real customers actually order (on their phone).
const VIEWPORT = { width: 390, height: 844 };

async function runSession(index, browser) {
  const start = Date.now();
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const timings = { sessionId: index };
  try {
    let t0 = Date.now();
    await page.goto(`${BASE_URL}/order`);

    // Location picker (multi-branch tenant)
    await page.getByText(/where should we deliver/i).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: new RegExp(CITY, "i") }).first().click();
    await page.getByRole("button", { name: new RegExp(AREA, "i") }).first().click();
    await page.getByRole("button", { name: /^ok$/i }).click();
    timings.locationPickMs = Date.now() - t0;

    t0 = Date.now();
    await page.waitForLoadState("networkidle");
    await page.getByText(ITEM_NAME, { exact: false }).first().waitFor({ timeout: 15000 });
    timings.menuLoadMs = Date.now() - t0;

    t0 = Date.now();
    await page
      .getByText(ITEM_NAME, { exact: false })
      .first()
      .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]")
      .getByRole("button", { name: /add to cart/i })
      .click();
    await page.getByRole("button", { name: /view cart/i }).click();
    timings.addToCartMs = Date.now() - t0;

    t0 = Date.now();
    await page.waitForURL(/\/order\/checkout/, { timeout: 15000 });
    await page.getByPlaceholder(/\+92 300/i).fill(`030${String(index).padStart(7, "0")}`);
    await page.getByPlaceholder(/house 12/i).fill("Load test address, block 4");
    await page.getByRole("button", { name: /confirm order/i }).click();
    await page.waitForURL(/\/order\/confirmed/, { timeout: 15000 });
    timings.checkoutMs = Date.now() - t0;

    timings.totalMs = Date.now() - start;
    timings.ok = true;
  } catch (err) {
    timings.ok = false;
    timings.error = err.message;
    timings.totalMs = Date.now() - start;
    try {
      await page.screenshot({ path: `failure-order-session-${index}.png` });
      timings.currentUrl = page.url();
    } catch {}
  } finally {
    await context.close();
  }
  return timings;
}

(async () => {
  console.log(`Starting ${CONCURRENT_USERS} concurrent storefront order sessions against ${BASE_URL}`);
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
  console.log(`Avg location pick: ${avg("locationPickMs")}ms`);
  console.log(`Avg menu load:     ${avg("menuLoadMs")}ms`);
  console.log(`Avg add to cart:   ${avg("addToCartMs")}ms`);
  console.log(`Avg checkout:      ${avg("checkoutMs")}ms`);
  console.log(`Avg total:         ${avg("totalMs")}ms`);
  if (failed.length) {
    console.log("\n=== Failures ===");
    failed.forEach((f) =>
      console.log(`Session ${f.sessionId}: ${f.error}${f.currentUrl ? ` (stuck on ${f.currentUrl})` : ""}`)
    );
    console.log("Screenshots saved as failure-order-session-N.png");
  }
})();