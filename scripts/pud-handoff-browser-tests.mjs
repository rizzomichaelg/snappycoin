/**
 * Synthetic public booking regression tests. No external request is permitted.
 * Run: node frontend/scripts/pud-handoff-browser-tests.mjs
 * Optional screenshots: PUD_HANDOFF_SCREENSHOTS=/path/to/evidence <command>
 * Optional case-name regex: PUD_HANDOFF_TEST_FILTER='retry|Spanish' <command>
 * This intentionally stays outside frontend/test so node's unit suite does not
 * need a browser. Uses the repository's existing Playwright and axe packages.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const screenshotRoot = process.env.PUD_HANDOFF_SCREENSHOTS
  ? resolve(process.env.PUD_HANDOFF_SCREENSHOTS) : null;
const testFilter = process.env.PUD_HANDOFF_TEST_FILTER ? new RegExp(process.env.PUD_HANDOFF_TEST_FILTER, "i") : null;
if (screenshotRoot) await mkdir(screenshotRoot, { recursive: true });
const server = createServer(serveStatic);
await new Promise((ready, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", ready);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const apiOrigin = "http://127.0.0.1:8787";
const browser = await chromium.launch({ headless: true });
const address = { line1: "100 Synthetic Test Lane", city: "Maryland Heights", state: "MO", postalCode: "63043" };
const pickupNotes = "Blue test box beside the front door.";
const deliveryNotes = "Covered test shelf behind the side gate.";
const pickupDate = futureDate(7);
const deliveryDate = futureDate(9);
const route = {
  routeId: "synthetic-pickup", routeDate: pickupDate, windowCode: "AM",
  windowStartAt: `${pickupDate}T15:00:00.000Z`, windowEndAt: `${pickupDate}T16:00:00.000Z`,
  expectedReturnAt: `${deliveryDate}T17:00:00.000Z`, remainingOrders: 10, remainingBags: 30,
  routeProof: "synthetic-pickup-proof",
};
const deliveryRoute = {
  ...route, routeId: "synthetic-delivery", routeDate: deliveryDate,
  windowStartAt: `${deliveryDate}T17:00:00.000Z`, windowEndAt: `${deliveryDate}T18:00:00.000Z`,
  expectedReturnAt: undefined, routeProof: "synthetic-delivery-proof",
};
const publicConfig = {
  publicEnabled: true, bookingEnabled: true, addressAutocompleteEnabled: false,
  productAnalyticsEnabled: false, productExperimentEnabled: false,
  statusRecoveryEnabled: true, feedbackEnabled: false, recurringEnabled: false,
  tipsEnabled: false, promotionsEnabled: false, referralsEnabled: false,
  claimsEnabled: false, loyaltyEnabled: false, claimEvidenceEnabled: false,
  supportedLocales: ["en-US", "es-US"], defaultLocale: "en-US", currency: "USD",
  support: { email: "support@example.test", phone: "+13145550100" },
  stripePublishableKey: null, squareApplicationId: "sandbox-synthetic-handoff",
  squareLocationId: "synthetic-location", squareEnvironment: "sandbox",
  turnstileSiteKey: "synthetic-site-key", timezone: "America/Chicago",
  pricing: { pricePerLbCents: 150, minimumCents: 3500, deliveryFeeCents: 0, version: "synthetic-price-v1" },
  scheduling: {
    pickupLeadTimeHours: 0, pickupSlotDurationMinutes: 60, minimumDeliveryDelayHours: 24,
    sameDayBookingCutoff: "14:00", latestPickupSlotStart: "17:00",
  },
  consentVersion: "synthetic-fallback-v1",
  consentVersions: {
    terms: "synthetic-terms-v2", privacy: "synthetic-privacy-v3",
    transactional_sms: "synthetic-sms-v4", saved_payment_method: "synthetic-card-v5",
    unattended_pickup: "synthetic-pickup-v6", unattended_delivery: "synthetic-delivery-v7",
    marketing_email: "synthetic-email-v8", marketing_sms: "synthetic-marketing-sms-v9",
  },
  message: "",
};
let passed = 0;

try {
  await test("fresh booking requires an explicit delivery choice", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await assertFreshHandoffs(page);
    await fillDetails(fixture);
    await page.locator('#pud-details-form button[type="submit"]').click();
    await assertStep(page, "details");
    assert.equal(fixture.phoneStarts.length, 0, "missing delivery choice started verification");
    assert.equal(await page.locator('[name="deliveryHandoff"]').first().evaluate((node) => node.validity.valueMissing), true);
    assert.equal(await page.locator('[name="deliveryHandoff"]').first().evaluate((node) => node.required), true);
  });

  for (const pickup of [false, true]) {
    for (const delivery of [false, true]) {
      await test(`independent handoffs pickup=${pickup} delivery=${delivery}`, async (fixture) => {
        await openDetails(fixture);
        await fillDetails(fixture);
        await setHandoffs(fixture.page, { pickup, delivery });
        await openReview(fixture);
        await assertReview(fixture.page, { pickup, delivery });
        await submitSuccess(fixture);
        assertOrder(fixture.orders[0], { pickup, delivery });
        assert.equal(await tokenizeCount(fixture.page), 1);
      });
    }
  }

  for (const side of ["pickup", "delivery"]) {
    await test(`${side} requires its own location and authorization`, async (fixture) => {
      const { page } = fixture;
      await openDetails(fixture);
      await fillDetails(fixture);
      await setHandoffs(page, { pickup: false, delivery: false });
      await page.locator(`[name="${side}Handoff"][value="unattended"]`).check();
      const notes = page.locator(`[name="${side}AccessNotes"]`);
      const authorization = page.locator(`[name="unattended${title(side)}Authorization"]`);
      assert.equal(await notes.getAttribute("maxlength"), "500");
      assert.equal(await notes.evaluate((node) => node.required), true);
      assert.equal(await authorization.evaluate((node) => node.required), true);
      await authorization.check();
      await page.locator('#pud-details-form button[type="submit"]').click();
      assert.equal(await notes.evaluate((node) => node.validity.valueMissing), true);
      assert.equal(fixture.phoneStarts.length, 0, "empty location started verification");
      await notes.fill("Synthetic secure location");
      await authorization.uncheck();
      await page.locator('#pud-details-form button[type="submit"]').click();
      assert.equal(await authorization.evaluate((node) => node.validity.valueMissing), true);
      assert.equal(fixture.phoneStarts.length, 0, "missing authorization started verification");
      await authorization.check();
      await notes.fill("   ");
      await page.locator('#pud-details-form button[type="submit"]').click();
      await page.locator('[data-message]:not([hidden])').waitFor();
      await assertStep(page, "details");
      assert.equal(fixture.phoneStarts.length, 0, "whitespace-only location started verification");
    });
  }

  await test("switching to attended clears only that handoff's authorization and notes", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: true, delivery: true });
    for (const side of ["pickup", "delivery"]) {
      await page.locator(`[name="${side}Handoff"][value="attended"]`).check();
      assert.equal(await page.locator(`[data-unattended-${side}-details]`).isHidden(), true);
      assert.equal(await page.locator(`[name="${side}AccessNotes"]`).inputValue(), "");
      assert.equal(await page.locator(`[name="unattended${title(side)}Authorization"]`).isChecked(), false);
      if (side === "pickup") {
        assert.equal(await page.locator('[name="deliveryAccessNotes"]').inputValue(), deliveryNotes);
        assert.equal(await page.locator('[name="unattendedDeliveryAuthorization"]').isChecked(), true);
      }
      await page.locator(`[name="${side}Handoff"][value="unattended"]`).check();
      assert.equal(await page.locator(`[name="${side}AccessNotes"]`).inputValue(), "");
      assert.equal(await page.locator(`[name="unattended${title(side)}Authorization"]`).isChecked(), false);
      await page.locator(`[name="${side}Handoff"][value="attended"]`).check();
    }
    await openReview(fixture);
    await assertReview(page, { pickup: false, delivery: false });
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: false, delivery: false });
  });

  await test("reorder carries ordinary preferences but requires fresh handoff choices", async (fixture) => {
    await openDetails(fixture);
    assert.equal(await fixture.page.locator('#pud-details-form [name="firstName"]').inputValue(), "Synthetic");
    assert.equal(await fixture.page.locator('[name="specialInstructions"]').inputValue(), "Use the synthetic laundry preference.");
    await assertFreshHandoffs(fixture.page);
    await fillDetails(fixture);
    await setHandoffs(fixture.page, { pickup: false, delivery: false });
    await openReview(fixture);
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: false, delivery: false });
  }, { reorder: true });

  await test("reload and waitlist resume do not restore legacy handoff authority", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await assertFreshHandoffs(page);
    await setHandoffs(page, { pickup: true, delivery: true });
    await page.reload({ waitUntil: "networkidle" });
    await waitForBooking(page);
    await openDetails(fixture, { navigate: false });
    await assertFreshHandoffs(page);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: false, delivery: false });
    await openReview(fixture);
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: false, delivery: false });
    assert.equal(fixture.orders[0].body.waitlistContinuationToken, `pud_wlc_${"x".repeat(64)}`);
  }, { resume: true });

  await test("native Back and review Edit refresh both handoff summaries", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: true, delivery: false });
    await openReview(fixture);
    await assertReview(page, { pickup: true, delivery: false });
    await page.goBack();
    await assertStep(page, "phone");
    await page.goBack();
    await assertStep(page, "details");
    await setHandoffs(page, { pickup: false, delivery: true });
    await openReview(fixture, { verified: true });
    await assertReview(page, { pickup: false, delivery: true });
    await page.locator('section[data-step="review"] [data-action="edit"][data-step="details"]').first().click();
    await assertStep(page, "details");
    await setHandoffs(page, { pickup: true, delivery: true, pickupText: "Edited pickup test shelf.", deliveryText: "Edited delivery test shelf." });
    await openReview(fixture, { verified: true });
    await assertReview(page, { pickup: true, delivery: true, pickupText: "Edited pickup test shelf.", deliveryText: "Edited delivery test shelf." });
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: true, delivery: true, pickupText: "Edited pickup test shelf.", deliveryText: "Edited delivery test shelf." });
    assert.equal(fixture.phoneStarts.length, 1, "editing safe details unnecessarily sent another verification request");
  });

  await test("native Forward cannot reuse reviewed authorization revoked on Details", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: true, delivery: true });
    await openReview(fixture);
    await page.goBack();
    await assertStep(page, "phone");
    await page.goBack();
    await assertStep(page, "details");
    await setHandoffs(page, { pickup: false, delivery: false });
    await page.goForward();
    await assertStep(page, "details");
    await page.goForward();
    await assertStep(page, "details");
    assert.equal(fixture.orders.length, 0);
    await openReview(fixture, { verified: true });
    await assertReview(page, { pickup: false, delivery: false });
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: false, delivery: false });
  });

  await test("native Forward before OTP cannot revive revoked authorization", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: true, delivery: true });
    await page.locator('#pud-details-form button[type="submit"]').click();
    await assertStep(page, "phone");
    await page.goBack();
    await assertStep(page, "details");
    await setHandoffs(page, { pickup: false, delivery: false });
    await page.goForward();
    await assertStep(page, "details");
    assert.equal(fixture.orders.length, 0);
    await openReview(fixture);
    await assertReview(page, { pickup: false, delivery: false });
    await submitSuccess(fixture);
    assertOrder(fixture.orders[0], { pickup: false, delivery: false });
  });

  await test("unknown create outcome locks editing and retries identical bytes and key", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: true, delivery: true });
    await openReview(fixture);
    await page.locator('[name="savedPaymentMethod"]').check();
    const submit = page.locator('#pud-review-form button[type="submit"]');
    await submit.click();
    await until(() => fixture.orders.length === 1, "first create request");
    assert.equal(await submit.isDisabled(), true);
    // Exercise the submit listener itself, including repeated Enter/programmatic
    // submissions while the response is pending, without bypassing its handler.
    await page.locator("#pud-review-form").evaluate((form) => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await assertStep(page, "review");
    assert.equal(await tokenizeCount(page), 1);
    assert.equal(fixture.orders.length, 1);
    fixture.releaseCreate();
    await page.locator('[data-message]:not([hidden])').waitFor();
    await page.locator('[data-booking-retry-notice]:not([hidden])').waitFor();
    await until(() => submit.isEnabled(), "retry becomes available");
    assert.equal(await page.locator('[name="savedPaymentMethod"]').isDisabled(), true, "unknown outcome allowed changing consent");
    assert.equal(await page.locator('#pud-review-form [name="marketingEmail"]').isDisabled(), true, "unknown outcome allowed changing request fields");
    const edits = page.locator('section[data-step="review"] [data-action="edit"]');
    assert.ok(await edits.count() > 0);
    assert.equal(await edits.evaluateAll((nodes) => nodes.every((node) => node.disabled)), true);
    await page.goBack();
    await assertStep(page, "review");
    await submit.click();
    await assertStep(page, "complete");
    assert.equal(fixture.orders.length, 2);
    assert.equal(fixture.orders[1].raw, fixture.orders[0].raw, "retry changed the serialized request body");
    assert.equal(fixture.orders[1].key, fixture.orders[0].key, "retry changed the idempotency header");
    assert.equal(await tokenizeCount(page), 1, "retry tokenized the card again");
    assertOrder(fixture.orders[1], { pickup: true, delivery: true });
  }, { responses: ["network-error", "success"], holdFirstCreate: true });

  await test("definitive card rejection permits a corrected attempt with a new key", async (fixture) => {
    const { page } = fixture;
    await openDetails(fixture);
    await fillDetails(fixture);
    await setHandoffs(page, { pickup: false, delivery: true });
    await openReview(fixture);
    await page.locator('[name="savedPaymentMethod"]').check();
    await page.locator('#pud-review-form button[type="submit"]').click();
    await page.locator('[data-message]:not([hidden])').waitFor();
    await until(() => page.locator('#pud-review-form button[type="submit"]').isEnabled(), "declined attempt completes");
    assert.equal(await page.locator('[name="savedPaymentMethod"]').isEnabled(), true);
    await page.locator('section[data-step="review"] [data-action="edit"][data-step="details"]').first().click();
    await setHandoffs(page, { pickup: false, delivery: false });
    await openReview(fixture, { verified: true });
    await submitSuccess(fixture);
    assert.equal(fixture.orders.length, 2);
    assert.notEqual(fixture.orders[0].key, fixture.orders[1].key);
    assert.equal(await tokenizeCount(page), 2);
    assertOrder(fixture.orders[1], { pickup: false, delivery: false });
  }, { responses: ["card-declined", "success"] });

  for (const width of [390, 320]) {
    await test(`Spanish handoff details and review are accessible at ${width}px`, async (fixture) => {
      const { page } = fixture;
      await openDetails(fixture);
      assert.equal(await page.locator("html").getAttribute("lang"), "es-US");
      await fillDetails(fixture);
      await setHandoffs(page, { pickup: true, delivery: true });
      for (const side of ["pickup", "delivery"]) {
        const label = await page.locator(`[name="unattended${title(side)}Authorization"]`).evaluate((node) => node.closest("label").innerText);
        assert.match(label, /autorizo/i, `${side} authorization did not translate`);
      }
      await assertAccessibleLayout(page, `details-${width}`);
      await screenshot(page, `handoff-details-es-${width}.png`);
      await openReview(fixture);
      await assertReview(page, { pickup: true, delivery: true, spanish: true });
      await assertAccessibleLayout(page, `review-${width}`);
      await screenshot(page, `handoff-review-es-${width}.png`);
    }, { spanish: true, width });
  }
  assert.ok(passed > 0, "No browser cases matched PUD_HANDOFF_TEST_FILTER");
  console.log(`Public handoff browser tests passed (${passed} cases; all APIs/providers mocked).`);
  if (screenshotRoot) console.log(`Screenshots: ${screenshotRoot}`);
} finally {
  await browser.close();
  await new Promise((closed) => server.close(closed));
}

async function test(name, run, options = {}) {
  if (testFilter && !testFilter.test(name)) return;
  const fixture = await createFixture(options);
  try {
    await run(fixture);
    assert.deepEqual(fixture.unmocked, [], "unmocked network request attempted");
    assert.deepEqual(fixture.pageErrors, [], "uncaught browser error");
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`Booking message: ${await fixture.page.locator("[data-message]").textContent().catch(() => "unavailable")}`);
    await screenshot(fixture.page, `failure-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`).catch(() => {});
    throw error;
  } finally {
    fixture.releaseCreate?.();
    await fixture.context.close();
  }
}

async function createFixture({ spanish = false, width = 1280, reorder = false, resume = false, responses = ["success"], holdFirstCreate = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce", serviceWorkers: "block" });
  const fixture = { context, orders: [], phoneStarts: [], unmocked: [], pageErrors: [], spanish };
  const firstCreateGate = holdFirstCreate ? new Promise((release) => { fixture.releaseCreate = release; }) : Promise.resolve();
  await context.addInitScript(({ reorder, resume, address }) => {
    localStorage.setItem("snappyCookieConsent:v1", "declined");
    if (reorder) sessionStorage.setItem("snappyPudReorderBootstrapV1", JSON.stringify({
      savedAt: Date.now(), value: {
        nextStep: "address_check", priorOrderNumber: "PUD-SYNTHETIC-PRIOR",
        requiresPhoneVerification: true, requiresPaymentSetup: true,
        customer: { firstName: "Synthetic", lastName: "Customer", email: "handoff@example.test", phoneLast4: "0100" },
        address,
        preferences: {
          estimatedBags: 2, detergent: "free_clear", softenerPref: "none",
          specialInstructions: "Use the synthetic laundry preference.",
          unattendedPickup: true, unattendedDelivery: true,
          accessNotes: "Legacy ambiguous test note that must never become current permission.",
          pickupAccessNotes: "Prior pickup private note", deliveryAccessNotes: "Prior delivery private note",
        },
        consents: { unattended_pickup: { accepted: true }, unattended_delivery: { accepted: true } },
      },
    }));
    if (resume) {
      sessionStorage.setItem("snappyPudBookingV1", JSON.stringify({
        savedAt: Date.now(), step: "review", address,
        order: { unattendedPickup: true, unattendedDelivery: true, accessNotes: "Legacy unsafe draft note" },
        consents: { unattendedPickup: true, unattendedDelivery: true },
      }));
      sessionStorage.setItem("snappy-pud-waitlist-continuation-v1", JSON.stringify({ token: `pud_wlc_${"x".repeat(64)}`, routeId: "synthetic-pickup" }));
    }
  }, { reorder, resume, address });
  // A single deny-by-default interception point prevents real API/provider calls,
  // even if the app changes its environment config or adds a new integration.
  await context.route("**/*", async (intercept) => {
    const request = intercept.request();
    const url = new URL(request.url());
    if (url.origin === origin && !url.pathname.startsWith("/api/")) {
      if (spanish && url.pathname === "/assets/js/pud-config.js") {
        const source = await readFile(resolve(root, "assets/js/pud-config.js"), "utf8");
        assert.ok(source.includes('Object.freeze(["en-US"])'), "Spanish test override no longer matches the local release gate");
        return intercept.fulfill({ contentType: "application/javascript", body: source.replace('Object.freeze(["en-US"])', 'Object.freeze(["en-US", "es-US"])') });
      }
      return intercept.continue();
    }
    if (url.origin === "https://challenges.cloudflare.com") return intercept.fulfill({
      contentType: "application/javascript",
      body: `window.__syntheticTurnstileReads=0;const widgets=new Map();window.turnstile={render:(node)=>{const input=document.createElement('input');input.type='hidden';input.name='cf-turnstile-response';input.value='synthetic-turnstile-'+(++window.__syntheticTurnstileReads);node.append(input);const id='synthetic-widget-'+widgets.size;widgets.set(id,input);return id;},getResponse:(id)=>widgets.get(id)?.value||'',reset:(id)=>{const input=widgets.get(id);if(input)input.value='synthetic-turnstile-'+(++window.__syntheticTurnstileReads);},remove:(id)=>widgets.get(id)?.remove()};`,
    });
    if (url.origin === "https://sandbox.web.squarecdn.com" && url.pathname === "/v1/square.js") return intercept.fulfill({
      contentType: "application/javascript",
      body: `window.__syntheticTokenizations=0;window.Square={payments:()=>({card:async()=>({attach:async(selector)=>{document.querySelector(selector).textContent='Synthetic secure card fixture';},destroy:()=>{},tokenize:async()=>({status:'OK',token:'synthetic-square-'+(++window.__syntheticTokenizations)})})})};`,
    });
    if (url.origin === apiOrigin) {
      if (request.method() === "OPTIONS") return intercept.fulfill({ status: 204, headers: corsHeaders() });
      if (url.pathname === "/api/pud/public-config") return json(intercept, publicConfig);
      if (url.pathname === "/api/pud/address/check") return json(intercept, {
        eligibility: "eligible", normalizedAddress: address, addressProof: "synthetic-address-proof",
        routes: [route], deliveryRoutes: [deliveryRoute],
      });
      if (url.pathname === "/api/pud/phone/start") {
        fixture.phoneStarts.push(request.postDataJSON());
        return json(intercept, { verificationId: "synthetic-verification", phoneLast4: "0100", expiresAt: futureExpiry() });
      }
      if (url.pathname === "/api/pud/phone/verify") return json(intercept, { phoneProof: "synthetic-phone-proof", expiresAt: futureExpiry() });
      if (url.pathname === "/api/pud/orders") {
        fixture.orders.push({ raw: request.postData(), body: request.postDataJSON(), key: request.headers()["idempotency-key"] });
        const index = fixture.orders.length - 1;
        if (index === 0) await firstCreateGate;
        const response = responses[index] || "success";
        if (response === "network-error") return intercept.abort("failed");
        if (response === "card-declined") return intercept.fulfill({
          status: 402, contentType: "application/json", headers: corsHeaders(),
          body: JSON.stringify({ ok: false, error: { code: "PUD_CARD_DECLINED", message: "This card was declined. Check the card details or use a different card.", retryable: false } }),
        });
        return json(intercept, { orderNumber: "PUD-SYNTHETIC-HANDOFF", statusToken: "synthetic-private-status-token", duplicate: index > 0 });
      }
    }
    fixture.unmocked.push(`${request.method()} ${url.origin}${url.pathname}`);
    return intercept.abort("blockedbyclient");
  });
  fixture.page = await context.newPage();
  fixture.page.setDefaultTimeout(10_000);
  fixture.page.on("pageerror", (error) => fixture.pageErrors.push(error.message));
  return fixture;
}

async function openDetails(fixture, { navigate = true } = {}) {
  const { page } = fixture;
  if (navigate) {
    await page.goto(`${origin}/pickup-delivery/${fixture.spanish ? "?lang=es" : ""}`, { waitUntil: "networkidle" });
    await waitForBooking(page);
  }
  for (const [name, value] of Object.entries(address)) await page.locator(`#pud-address-form [name="${name}"]`).fill(value);
  await page.locator('#pud-address-form button[type="submit"]').click();
  await assertStep(page, "details");
}

async function waitForBooking(page) {
  await page.waitForFunction(() => document.querySelector("[data-pud-booking]")?.dataset.bookingStep === "address" && Boolean(window.turnstile));
}

async function fillDetails({ page }) {
  if (await page.locator('[name="pickupDay"]').isEnabled()) await page.locator('[name="pickupDay"]').selectOption(pickupDate);
  if (await page.locator('[name="routeId"]').isEnabled()) await page.locator('[name="routeId"]').selectOption(route.routeId);
  await page.locator('[name="deliveryDay"]').selectOption(deliveryDate);
  await page.locator('[name="deliveryRouteId"]').selectOption(deliveryRoute.routeId);
  for (const [name, value] of Object.entries({ firstName: "Synthetic", lastName: "Customer", email: "handoff@example.test", phone: "3145550100" })) {
    await page.locator(`#pud-details-form [name="${name}"]`).fill(value);
  }
  await page.locator('[name="terms"]').check();
}

async function assertFreshHandoffs(page) {
  assert.equal(await page.locator('[name="pickupHandoff"][value="attended"]').isChecked(), true);
  assert.equal(await page.locator('[name="deliveryHandoff"]:checked').count(), 0);
  for (const side of ["pickup", "delivery"]) {
    assert.equal(await page.locator(`[data-unattended-${side}-details]`).isHidden(), true);
    assert.equal(await page.locator(`[name="${side}AccessNotes"]`).inputValue(), "");
    assert.equal(await page.locator(`[name="unattended${title(side)}Authorization"]`).isChecked(), false);
  }
}

async function setHandoffs(page, { pickup, delivery, pickupText = pickupNotes, deliveryText = deliveryNotes }) {
  for (const [side, enabled, text] of [["pickup", pickup, pickupText], ["delivery", delivery, deliveryText]]) {
    await page.locator(`[name="${side}Handoff"][value="${enabled ? "unattended" : "attended"}"]`).check();
    if (enabled) {
      await page.locator(`[name="${side}AccessNotes"]`).fill(text);
      await page.locator(`[name="unattended${title(side)}Authorization"]`).check();
    }
  }
}

async function openReview({ page }, { verified = false } = {}) {
  await page.locator('#pud-details-form button[type="submit"]').click();
  if (!verified) {
    await assertStep(page, "phone");
    await page.locator('#pud-code-form [name="code"]').fill("123456");
    await page.locator('#pud-code-form button[type="submit"]').click();
  }
  await assertStep(page, "review");
  await until(() => page.locator('#pud-review-form button[type="submit"]').isEnabled(), "secure card fixture loads");
}

async function assertReview(page, { pickup, delivery, pickupText = pickupNotes, deliveryText = deliveryNotes, spanish = false }) {
  for (const [side, enabled, text] of [["pickup", pickup, pickupText], ["delivery", delivery, deliveryText]]) {
    const handoff = page.locator(`[data-review-${side}-handoff]`);
    const notes = page.locator(`[data-review-${side}-instructions]`);
    assert.equal(await handoff.isVisible(), true);
    assert.ok((await handoff.innerText()).trim(), `${side} handoff summary is empty`);
    if (!spanish) assert.match(await handoff.innerText(), enabled ? /secure|unattended|leave/i : /hand|person|attended/i);
    assert.equal(await notes.isVisible(), enabled, `${side} instructions visibility differs from the selected handoff`);
    if (enabled) assert.equal((await notes.innerText()).trim(), text);
    else assert.equal((await notes.textContent()).trim(), "", `${side} hidden instructions retained stale text`);
  }
}

async function submitSuccess({ page }) {
  await page.locator('[name="savedPaymentMethod"]').check();
  await page.locator('#pud-review-form button[type="submit"]').click();
  await assertStep(page, "complete");
}

function assertOrder(request, { pickup, delivery, pickupText = pickupNotes, deliveryText = deliveryNotes }) {
  assert.ok(request, "no order was submitted");
  const { body, key } = request;
  assert.ok(key);
  assert.equal(body.idempotencyKey, key);
  assert.equal(body.preferences.unattendedPickup, pickup);
  assert.equal(body.preferences.unattendedDelivery, delivery);
  assert.deepEqual(body.consents.unattended_pickup, { accepted: pickup, version: "synthetic-pickup-v6" });
  assert.deepEqual(body.consents.unattended_delivery, { accepted: delivery, version: "synthetic-delivery-v7" });
  const notes = [pickup ? `Pickup instructions: ${pickupText}` : "", delivery ? `Delivery instructions: ${deliveryText}` : ""].filter(Boolean).join("\n");
  assert.equal(body.preferences.accessNotes || "", notes);
  assert.equal(Object.hasOwn(body.preferences, "pickupAccessNotes"), false, "unknown preference field leaked into API contract");
  assert.equal(Object.hasOwn(body.preferences, "deliveryAccessNotes"), false, "unknown preference field leaked into API contract");
}

async function assertAccessibleLayout(page, name) {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll("main *")].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1);
    }).slice(0, 10).map((node) => node.id || node.getAttribute("name") || node.tagName),
  }));
  assert.ok(layout.scroll <= layout.client, `${name} horizontal overflow: ${JSON.stringify(layout)}`);
  await page.evaluate(axeSource);
  const violations = await page.evaluate(async () => (await globalThis.axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
  })).violations.filter((item) => ["serious", "critical"].includes(item.impact)).map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })));
  assert.deepEqual(violations, [], `${name} serious/critical accessibility failures`);
}

async function screenshot(page, name) {
  if (!screenshotRoot) return;
  // Start full-page evidence at the top after axe's focus checks, so the sticky
  // mobile header is not captured over the middle of a scrolled form.
  await page.evaluate(async () => {
    document.activeElement?.blur?.();
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((ready) => requestAnimationFrame(() => requestAnimationFrame(ready)));
  });
  await page.screenshot({ path: resolve(screenshotRoot, name), fullPage: true });
}
async function assertStep(page, step) {
  await page.waitForFunction((expected) => document.querySelector("[data-pud-booking]")?.dataset.bookingStep === expected, step);
  assert.equal(await page.locator(`section[data-step="${step}"]`).isVisible(), true);
}
async function tokenizeCount(page) { return page.evaluate(() => window.__syntheticTokenizations || 0); }
async function until(condition, description) {
  const deadline = Date.now() + 10_000;
  while (!await condition()) {
    assert.ok(Date.now() < deadline, `Timed out waiting for ${description}`);
    await new Promise((ready) => setTimeout(ready, 20));
  }
}
function title(value) { return value[0].toUpperCase() + value.slice(1); }
function futureDate(days) { return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10); }
function futureExpiry() { return new Date(Date.now() + 3_600_000).toISOString(); }
function corsHeaders() { return { "access-control-allow-origin": origin, "access-control-allow-headers": "Content-Type, Idempotency-Key", "access-control-allow-methods": "GET, POST, OPTIONS" }; }
function json(intercept, data) { return intercept.fulfill({ contentType: "application/json", headers: corsHeaders(), body: JSON.stringify({ ok: true, data }) }); }

async function serveStatic(request, response) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || "/", "http://127.0.0.1").pathname); }
  catch { response.writeHead(400).end("Bad request"); return; }
  const file = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
  if (!file.startsWith(`${root}${sep}`)) { response.writeHead(403).end("Forbidden"); return; }
  try {
    const body = await readFile(file);
    const type = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" }[extname(file).toLowerCase()] || "application/octet-stream";
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  } catch { response.writeHead(404, { "content-type": "text/plain" }).end("Not found"); }
}
