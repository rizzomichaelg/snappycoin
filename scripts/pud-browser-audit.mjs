import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(process.cwd(), process.argv[2] || "artifacts/pud-redesign/browser-audit.json");
const requestedPort = Number(process.env.PUD_BROWSER_AUDIT_PORT || 0);
const server = createServer(serveStatic);
await new Promise((resolveReady, reject) => {
  server.once("error", reject);
  server.listen(requestedPort, "127.0.0.1", resolveReady);
});
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;

const publicConfig = {
  publicEnabled: true,
  productAnalyticsEnabled: false,
  productExperimentEnabled: false,
  bookingEnabled: true,
  addressAutocompleteEnabled: true,
  statusRecoveryEnabled: true,
  feedbackEnabled: true,
  recurringEnabled: true,
  tipsEnabled: true,
  promotionsEnabled: true,
  referralsEnabled: true,
  claimsEnabled: true,
  loyaltyEnabled: true,
  claimEvidenceEnabled: true,
  supportedLocales: ["en-US", "es-US"],
  defaultLocale: "en-US",
  currency: "USD",
  support: { email: "support@snappycoinlaundry.com", phone: "+13146281001" },
  stripePublishableKey: null,
  squareApplicationId: "sandbox-sq0idb-browser-audit",
  squareLocationId: "browser-audit-location",
  squareEnvironment: "sandbox",
  turnstileSiteKey: "browser-audit-site-key",
  timezone: "America/Chicago",
  pricing: { pricePerLbCents: 150, minimumCents: 3500, deliveryFeeCents: 0, version: "audit-v2" },
  scheduling: {
    pickupLeadTimeHours: 0,
    pickupSlotDurationMinutes: 60,
    minimumDeliveryDelayHours: 24,
    sameDayBookingCutoff: "14:00",
    latestPickupSlotStart: "17:00"
  },
  consentVersion: "audit-v1",
  consentVersions: {
    terms: "audit-v1",
    privacy: "audit-v1",
    transactional_sms: "audit-v1",
    saved_payment_method: "audit-v1",
    unattended_pickup: "audit-v1",
    unattended_delivery: "audit-v1",
    marketing_email: "audit-v1",
    marketing_sms: "audit-v1"
  },
  message: ""
};

const receipt = {
  currency: "usd",
  weightTenths: 200,
  pricePerLbCents: 199,
  weightChargeCents: 3980,
  minimumCents: 3500,
  minimumAdjustmentCents: 0,
  baseChargeCents: 3980,
  deliveryFeeCents: 0,
  discountCents: 0,
  taxCents: 20,
  tipCents: 0,
  totalCents: 4000,
  amountCapturedCents: 4000,
  refundedCents: 0,
  netPaidCents: 4000,
  pricingVersion: "audit-v1",
  taxRuleVersion: "audit-v1"
};

function statusFixture(fulfillmentStatus = "confirmed", paymentStatus = "succeeded") {
  return {
    orderNumber: "PUD-AUDIT-123456789012345678901234567890",
    version: 3,
    estimatedBags: 2,
    fulfillmentStatus,
    paymentStatus,
    pickupWindowStartAt: "2026-07-29T14:00:00.000Z",
    pickupWindowEndAt: "2026-07-29T15:00:00.000Z",
    deliveryWindowStartAt: "2026-07-30T14:00:00.000Z",
    deliveryWindowEndAt: "2026-07-30T15:00:00.000Z",
    expectedCompletionAt: "2026-07-30T14:00:00.000Z",
    milestones: {
      submittedAt: "2026-07-25T18:00:00.000Z",
      confirmedAt: null,
      pickedUpAt: null,
      weighedAt: null,
      readyAt: null,
      outForDeliveryAt: null,
      deliveredAt: null
    },
    totalCents: 4000,
    refundedCents: 0,
    receipt,
    paymentMethod: null,
    paymentAmountCents: null,
    paymentAttentionRequired: ["requires_action", "failed", "disputed"].includes(paymentStatus),
    operationalAttentionRequired: false,
    addressReviewRequired: false,
    canCancel: true,
    canTip: true,
    canClaim: true,
    canCreateRecurring: true,
    canSubmitFeedback: true,
    feedbackSubmitted: false,
    locale: "en-US",
    timezone: "America/Chicago",
    currency: "USD",
    recurringDefaults: {
      preferredBags: 2,
      detergent: "free_clear",
      softenerPref: "none",
      preferredRouteRule: { weekday: "wednesday" }
    },
    rescheduleOptions: [{
      routeId: "route-audit",
      routeDate: "2026-07-29",
      windowCode: "AM",
      windowStartAt: "2026-07-29T14:00:00Z",
      windowEndAt: "2026-07-29T17:00:00Z",
      expectedReturnAt: "2026-07-30T01:00:00Z",
      remainingOrders: 4,
      remainingBags: 8,
      routeProof: "route-proof-audit"
    }],
    recurringSchedules: [],
    updatedAt: "2026-07-25T18:00:00Z"
  };
}

const pages = [
  ["booking", "/pickup-delivery/", "pud-page--booking"],
  ["status", "/pickup-delivery/status/", "pud-page--status"],
  ["recovery", "/pickup-delivery/recover/", "pud-page--recovery"],
  ["claims", "/pickup-delivery/claims/", "pud-page--claims"],
  ["terms", "/pickup-delivery/terms/", "pud-page--terms"],
  ["privacy", "/pickup-delivery/privacy/", "pud-page--privacy"]
];
const report = {
  generatedAt: new Date().toISOString(),
  pages: [],
  statusStates: [],
  checks: []
};
const browser = await chromium.launch({ headless: true });

try {
  for (const [name, path, bodyClass] of pages) {
    const context = await auditContext();
    const page = await context.newPage();
    const consoleErrors = [];
    const missingAssets = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === origin) {
        missingAssets.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.setViewportSize({ width: 320, height: 568 });
    const response = await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `${name} did not load`);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("body").evaluate((node, expected) => node.classList.contains(expected), bodyClass), true);
    assert.equal(await page.locator("[data-locale-switcher-host]").count(), 1, `${name} locale host`);
    const narrowLayout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
        })
        .map((node) => ({
          tag: node.tagName,
          id: node.id,
          className: typeof node.className === "string" ? node.className : "",
          text: node.textContent?.trim().slice(0, 80) || "",
          rect: node.getBoundingClientRect().toJSON(),
        }))
        .slice(0, 20),
      scrollContainers: [document.documentElement, document.body, ...document.querySelectorAll("body *")]
        .filter((node) => node.scrollWidth > node.clientWidth + 1)
        .map((node) => ({
          tag: node.tagName,
          id: node.id,
          className: typeof node.className === "string" ? node.className : "",
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
          overflowX: getComputedStyle(node).overflowX,
          text: node.textContent?.trim().slice(0, 120) || "",
        }))
        .slice(0, 30),
    }));
    assert.equal(
      narrowLayout.scrollWidth <= narrowLayout.clientWidth,
      true,
      `${name} overflows at 320px: ${JSON.stringify(narrowLayout)}`
    );

    const skip = page.locator(".skip-link, .pud-skip-link").first();
    const hiddenBox = await skip.boundingBox();
    assert.ok(hiddenBox && hiddenBox.y + hiddenBox.height <= 0, `${name} skip link is visible before focus`);
    await skip.focus();
    const focusBox = await skip.boundingBox();
    assert.ok(focusBox && focusBox.y >= 0, `${name} skip link is not visible on focus`);

    await page.evaluate(axeSource);
    const axe = await page.evaluate(async () => globalThis.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] }
    }));
    const severe = axe.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
    assert.equal(
      severe.length,
      0,
      `${name} axe serious/critical violations: ${JSON.stringify(severe.map(({ id, impact, help, nodes }) => ({
        id,
        impact,
        help,
        targets: nodes.map((node) => node.target)
      })))}`
    );

    if (name === "booking") {
      assert.equal(await page.locator("[data-progress-step]:visible").count(), 4, "online booking flow does not have four visible steps");
      assert.equal(await page.locator('[data-step-position="address"]').textContent(), "Step 1 of 4");
      assert.equal(await page.locator("#pud-payment-element").count(), 1, "Square card entry is missing");
      assert.match(await page.locator("[data-payment-summary]").textContent(), /Online card payment/);
      assert.doesNotMatch(await page.locator("main").innerText(), /pay in person|in-person payment/i);
      report.checks.push("online-card-payment-only");
      const banner = page.locator(".cookie-consent-banner");
      if (await banner.count()) {
        const overlaps = await page.evaluate(() => {
          const noticeElement = document.querySelector(".cookie-consent-banner");
          const notice = noticeElement?.getBoundingClientRect();
          if (!notice || !noticeElement) return [];
          return [...document.querySelectorAll("input, select, textarea, button")]
            .filter((node) => !noticeElement.contains(node))
            .filter((node) => {
              const style = getComputedStyle(node);
              return style.display !== "none" && style.visibility !== "hidden";
            })
            .filter((node) => {
              const rect = node.getBoundingClientRect();
              return rect.left < notice.right && rect.right > notice.left && rect.top < notice.bottom && rect.bottom > notice.top;
            })
            .map((node) => node.id || node.name || node.textContent?.trim().slice(0, 40));
        });
        assert.deepEqual(overlaps, [], "cookie notice overlaps a booking control");
      }
    }
    if (name === "claims") {
      assert.equal(await page.locator("[data-pud-claim-form]").isHidden(), true, "unauthorized claim form remains visible");
      assert.equal(await page.locator("[data-claim-unavailable]").isVisible(), true, "claim unavailable panel is hidden");
    }

    assert.deepEqual(missingAssets, [], `${name} has missing local assets`);
    assert.deepEqual(consoleErrors, [], `${name} console errors`);
    report.pages.push({
      name,
      width: 320,
      axeViolations: axe.violations.length,
      seriousOrCritical: severe.length,
      consoleErrors,
      missingAssets
    });
    console.log(`✓ ${name} page`);
    await context.close();
  }

  const disabledRecoveryContext = await auditContext({
    config: { ...publicConfig, statusRecoveryEnabled: false }
  });
  const disabledRecovery = await disabledRecoveryContext.newPage();
  await disabledRecovery.goto(`${origin}/pickup-delivery/recover/`, { waitUntil: "networkidle" });
  assert.equal(await disabledRecovery.locator("[data-recovery-start]").isHidden(), true);
  assert.equal(await disabledRecovery.locator("[data-recovery-unavailable]").isVisible(), true);
  report.checks.push("recovery-disabled-hides-form");
  console.log("✓ recovery unavailable state");
  await disabledRecoveryContext.close();

  for (const choice of ["accept", "decline"]) {
    const cookieContext = await auditContext();
    const cookiePage = await cookieContext.newPage();
    await cookiePage.goto(`${origin}/pickup-delivery/`, { waitUntil: "networkidle" });
    await cookiePage.locator(`[data-cookie-consent="${choice}"]`).click();
    assert.equal(await cookiePage.locator(".cookie-consent-banner").count(), 0);
    assert.equal(
      await cookiePage.evaluate(() => localStorage.getItem("snappyCookieConsent:v1")),
      choice === "accept" ? "accepted" : "declined"
    );
    await cookieContext.close();
  }
  report.checks.push("cookie-accept-and-decline-persist");
  console.log("✓ cookie consent choices");

  const fulfillmentStates = ["submitted", "confirmed", "picked_up", "weighed", "ready", "out_for_delivery", "delivered", "canceled"];
  const paymentStates = ["uncharged", "processing", "succeeded", "requires_action", "failed", "partially_refunded", "refunded", "disputed", "succeeded_external"];
  for (const state of [
    ...fulfillmentStates.map((value) => ({ fulfillment: value, payment: "succeeded" })),
    ...paymentStates.map((value) => ({ fulfillment: "confirmed", payment: value }))
  ]) {
    const context = await auditContext({ status: statusFixture(state.fulfillment, state.payment) });
    const page = await context.newPage();
    const statusConsole = [];
    page.on("console", (message) => {
      if (message.type() === "error") statusConsole.push(message.text());
    });
    await page.goto(`${origin}/pickup-delivery/status/#audit-private-token`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    assert.equal(
      await page.locator('[data-pud-status][data-order-loaded="true"]').count(),
      1,
      `status did not load for ${state.fulfillment}/${state.payment}; message=${await page.locator("[data-message]").textContent()}; console=${statusConsole.join(" | ")}`
    );
    assert.equal(await page.locator("[data-message]").textContent(), "");
    assert.equal(await page.locator('[data-fulfillment-timeline] [aria-current="step"]').count(), state.fulfillment === "canceled" ? 0 : 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (state.fulfillment === "delivered") {
      const amount = page.locator('#pud-tip-form [name="amount"]');
      assert.equal(await amount.isVisible(), false);
      for (const [percent, dollars] of [[10, "3.98"], [15, "5.97"], [20, "7.96"]]) {
        await page.locator(`[data-percent="${percent}"]`).click();
        assert.equal(await amount.inputValue(), dollars);
        assert.equal(await amount.getAttribute("readonly"), "");
      }
      await page.locator('[data-action="tip-amount"][data-amount=""]').click();
      assert.equal(await amount.inputValue(), "");
      assert.equal(await amount.getAttribute("readonly"), null);
      await amount.fill("4.25");
      assert.equal(await amount.inputValue(), "4.25");
    }
    report.statusStates.push(state);
    console.log(`✓ status ${state.fulfillment}/${state.payment}`);
    await context.close();
  }

  const spanishContext = await auditContext({ spanish: true });
  const spanishPage = await spanishContext.newPage();
  await spanishPage.goto(`${origin}/pickup-delivery/terms/?lang=es`, { waitUntil: "networkidle" });
  assert.equal(await spanishPage.locator("html").getAttribute("lang"), "es-US");
  assert.match(await spanishPage.locator("h1").textContent(), /Términos|servicio/i);
  assert.equal(await spanishPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  report.checks.push("spanish-policy-layout");
  console.log("✓ Spanish policy layout");
  await spanishContext.close();

  const overlapContext = await auditContext();
  const overlapPage = await overlapContext.newPage();
  await overlapPage.setViewportSize({ width: 1024, height: 768 });
  await overlapPage.goto(`${origin}/pickup-delivery/`, { waitUntil: "networkidle" });
  await overlapPage.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    document.querySelector(".pud-service-confidence")?.scrollIntoView({ block: "start" });
  });
  await overlapPage.waitForTimeout(100);
  const heroOverlap = await overlapPage.evaluate(() => {
    const hero = document.querySelector(".pud-hero");
    const confidence = document.querySelector(".pud-service-confidence");
    const heroRect = hero?.getBoundingClientRect();
    const confidenceRect = confidence?.getBoundingClientRect();
    if (!heroRect || !confidenceRect) return { overlaps: true, missing: true };
    return {
      overlaps: heroRect.left < confidenceRect.right
        && heroRect.right > confidenceRect.left
        && heroRect.top < confidenceRect.bottom
        && heroRect.bottom > confidenceRect.top,
      hero: {
        top: Math.round(heroRect.top),
        bottom: Math.round(heroRect.bottom),
      },
      confidence: {
        top: Math.round(confidenceRect.top),
        bottom: Math.round(confidenceRect.bottom),
      },
    };
  });
  assert.equal(heroOverlap.overlaps, false, `desktop hero overlaps the trust section after scroll: ${JSON.stringify(heroOverlap)}`);
  report.checks.push("desktop-hero-does-not-overlap-following-sections");
  console.log("✓ desktop hero scroll overlap");
  await overlapContext.close();

  const reflowContext = await auditContext();
  const reflowPage = await reflowContext.newPage();
  await reflowPage.setViewportSize({ width: 640, height: 900 });
  await reflowPage.goto(`${origin}/pickup-delivery/`, { waitUntil: "networkidle" });
  for (const [zoom, width] of [[2, 640], [4, 320]]) {
    await reflowPage.setViewportSize({ width, height: 900 });
    const reflow = await reflowPage.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("body *")]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
        })
        .slice(0, 12)
        .map((node) => ({
          selector: node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}.${[...node.classList].join(".")}`,
          left: Math.round(node.getBoundingClientRect().left),
          right: Math.round(node.getBoundingClientRect().right)
        }))
    }));
    assert.equal(reflow.scrollWidth <= reflow.clientWidth, true, `${zoom * 100}% equivalent reflow overflow: ${JSON.stringify(reflow)}`);
  }
  await reflowPage.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  report.checks.push("200-and-400-percent-reflow", "reduced-motion-and-forced-colors");
  console.log("✓ zoom, reduced motion, and forced colors");
  await reflowContext.close();

  const screenshotRoot = resolve(dirname(outputPath), "after");
  await mkdir(screenshotRoot, { recursive: true });
  const visualViewports = [[1440, 1200], [1024, 1366], [768, 1024], [390, 844], [360, 800], [320, 568]];
  const visualContext = await auditContext();
  for (const [width, height] of visualViewports) {
    for (const [name, path] of pages) {
      const page = await visualContext.newPage();
      await page.setViewportSize({ width, height });
      const url = name === "status" ? `${origin}${path}#audit-private-token` : `${origin}${path}`;
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(250);
      await page.screenshot({
        path: resolve(screenshotRoot, `${name}-${width}x${height}.png`),
        fullPage: true
      });
      await page.close();
    }
  }
  await visualContext.close();
  report.checks.push("required-viewport-screenshots");
  console.log(`✓ ${visualViewports.length * pages.length} required viewport screenshots`);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PUD browser audit passed (${report.pages.length} pages, ${report.statusStates.length} loaded status states).`);
  console.log(`Wrote ${outputPath}`);
} finally {
  await browser.close();
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function auditContext({ config = publicConfig, status = statusFixture(), spanish = false } = {}) {
  const context = await browser.newContext();
  await context.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({
    contentType: "application/javascript",
    body: "window.turnstile={render:()=> 'audit-widget',getResponse:()=> 'audit-turnstile-token',reset:()=>{},remove:()=>{}};"
  }));
  if (spanish) {
    await context.route(`${origin}/assets/js/pud-config.js`, async (route) => {
      const source = await readFile(resolve(root, "assets/js/pud-config.js"), "utf8");
      await route.fulfill({
        contentType: "application/javascript",
        body: source.replace('Object.freeze(["en-US"])', 'Object.freeze(["en-US", "es-US"])')
      });
    });
  }
  await context.route("http://127.0.0.1:8787/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/pud/public-config") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: config }) });
    }
    if (url.pathname === "/api/pud/orders/status") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, data: status }) });
    }
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "AUDIT_NOT_MOCKED", message: "Audit route not mocked." } })
    });
  });
  return context;
}

async function serveStatic(request, response) {
  const url = new URL(request.url || "/", origin);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (_error) {
    response.writeHead(400).end("Bad request");
    return;
  }
  const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const file = resolve(root, `.${relative}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(file);
    response.writeHead(200, {
      "content-type": contentType(file),
      "cache-control": "no-store"
    });
    response.end(body);
  } catch (_error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function contentType(file) {
  return ({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webmanifest": "application/manifest+json"
  })[extname(file).toLowerCase()] || "application/octet-stream";
}
