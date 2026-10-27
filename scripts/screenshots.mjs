#!/usr/bin/env node
/**
 * Retake the README screenshots in public/screenshots/.
 *
 * Usage:
 *   npm run dev            # in one terminal (no API keys → sample data)
 *   npm run screenshots    # in another
 *
 * Set SCREENSHOT_URL to use another server, e.g. the static demo.
 * Needs Playwright: `npm i -D playwright && npx playwright install chromium`.
 */
const BASE_URL = (process.env.SCREENSHOT_URL ?? "http://localhost:3000").replace(/\/$/, "");
const OUT_DIR = new URL("../public/screenshots/", import.meta.url).pathname;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

const shot = (page, name) => page.screenshot({ path: `${OUT_DIR}${name}.jpg`, type: "jpeg", quality: 85 });

async function openMap(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/map/`, { waitUntil: "networkidle" });
  // The server build waits for a click; the static demo loads by itself.
  if ((await page.locator("aside li").count()) === 0) await page.getByTitle("Load top news").click();
  await page.waitForFunction(() => document.querySelectorAll("aside li").length >= 20, null, { timeout: 30_000 });
  await page.waitForTimeout(5000);
  return page;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });

const landing = await context.newPage();
await landing.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
await shot(landing, "landing-dark");

const page = await openMap(context);
await shot(page, "map-dark");

await page.getByRole("button", { name: /Delivery robots/ }).click();
await page.waitForTimeout(4000);
await shot(page, "story-dark");

await page.getByRole("button", { name: "Close story" }).click();
await page.getByRole("button", { name: "Switch to flat map" }).click();
await page.getByRole("button", { name: /^Science/ }).click();
await page.waitForTimeout(4000);
await shot(page, "flat-filter-dark");

const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await shot(await openMap(phone), "mobile-dark");

await browser.close();
console.log(`Saved screenshots to ${OUT_DIR}`);
