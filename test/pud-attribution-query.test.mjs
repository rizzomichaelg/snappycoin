import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

globalThis.crypto ??= await import("node:crypto").then(({ webcrypto }) => webcrypto);
let freshModuleId = 0;

test("allowlisted campaign query is captured and scrubbed before provider eligibility", async () => {
  const browser = installBrowser(
    "https://www.snappycoinlaundry.com/pickup-delivery/?utm_source=google&utm_medium=cpc&utm_campaign=july-pickup&gclid=safe-click-123",
  );
  const attribution = await freshAttribution();

  assert.equal(attribution.prepareAttributionQueryForProviders(), true);
  assert.equal(browser.location.search, "");
  assert.equal(browser.location.hash, "");
  assert.equal(browser.location.href, "https://www.snappycoinlaundry.com/pickup-delivery/");
  assert.deepEqual(browser.historyCalls, [{ state: { page: 1 }, title: "", target: "/pickup-delivery/" }]);

  const captured = attribution.attribution();
  for (const touch of [captured.firstTouch, captured.currentTouch]) {
    assert.equal(touch.utmSource, "google");
    assert.equal(touch.utmMedium, "cpc");
    assert.equal(touch.utmCampaign, "july-pickup");
    assert.equal(touch.gclid, "safe-click-123");
    assert.equal(touch.landingPath, "/pickup-delivery/");
    assert.equal(touch.currentPath, "/pickup-delivery/");
  }

  const product = await import(`../assets/js/pud-product-analytics.js?attribution=${++freshModuleId}`);
  assert.deepEqual(product.providerSafeRoute(), { pageKey: "pickup_delivery", pagePath: "/pickup-delivery/" });
  const providerEvent = product.safeProviderEvent("cta_clicked", {
    ctaId: "pickup_submit",
    destinationCategory: "pickup_booking",
  });
  const productEvent = product.buildProductEvent("pud_page_viewed");
  for (const campaignValue of ["google", "cpc", "july-pickup", "safe-click-123"]) {
    assert.equal(JSON.stringify(providerEvent).includes(campaignValue), false);
    assert.equal(JSON.stringify(productEvent).includes(campaignValue), false);
  }
});

test("unknown, PII-bearing, and fragment URLs remain unscrubbed and provider-ineligible", async () => {
  const cases = [
    "https://www.snappycoinlaundry.com/pickup-delivery/?utm_source=google&debug=1",
    "https://www.snappycoinlaundry.com/pickup-delivery/?email=customer%40example.com",
    "https://www.snappycoinlaundry.com/pickup-delivery/?utm_term=customer%40example.com",
    "https://www.snappycoinlaundry.com/pickup-delivery/?utm_content=3145551212",
    "https://www.snappycoinlaundry.com/pickup-delivery/?toString=prototype-key",
    "https://www.snappycoinlaundry.com/pickup-delivery/?utm_source=google#private-token",
  ];

  for (const sourceUrl of cases) {
    const browser = installBrowser(sourceUrl);
    const attribution = await freshAttribution();
    assert.equal(attribution.prepareAttributionQueryForProviders(), false, sourceUrl);
    assert.equal(browser.location.href, sourceUrl, sourceUrl);
    assert.deepEqual(browser.historyCalls, [], sourceUrl);
    assert.equal(browser.localStorage.getItem("snappyPudFirstTouchV1"), null, sourceUrl);

    const serialized = JSON.stringify(attribution.attribution());
    for (const forbidden of ["customer@example.com", "3145551212", "prototype-key", "private-token", "debug"]) {
      assert.equal(serialized.includes(forbidden), false, `${sourceUrl} leaked ${forbidden}`);
    }
  }
});

test("site analytics prepares the campaign location before any provider bootstrap", async () => {
  const source = await readFile(new URL("../assets/js/pud-site-analytics.js", import.meta.url), "utf8");
  const preparation = source.indexOf("providerLocationSafe = prepareAttributionQueryForProviders();");
  const init = source.indexOf("function init() {");
  const initializationPreparation = source.indexOf("prepareProviderLocation();", init);
  const optionalInitialization = source.indexOf("initOptionalAnalytics();", init);
  assert.ok(preparation > 0);
  assert.ok(initializationPreparation > init);
  assert.ok(initializationPreparation < optionalInitialization);
  assert.match(source, /if \(isPrivateAnalyticsPath\(\) \|\| !providerLocationPrepared \|\| !providerLocationSafe\) return null;/);
  assert.match(source, /if \(window\.location\.search \|\| window\.location\.hash\) return null;/);
  assert.doesNotMatch(source, /window\.location\.href|page_referrer|link_href/);
});

async function freshAttribution() {
  freshModuleId += 1;
  return import(`../assets/js/pud-attribution.js?query-test=${freshModuleId}`);
}

function installBrowser(sourceUrl) {
  let current = new URL(sourceUrl);
  const historyCalls = [];
  const location = {};
  for (const field of ["href", "search", "hash", "pathname", "hostname", "protocol", "origin"]) {
    Object.defineProperty(location, field, { enumerable: true, get: () => current[field] });
  }
  const localStorage = memoryStorage();
  const history = {
    state: { page: 1 },
    replaceState(state, title, target) {
      historyCalls.push({ state, title, target });
      current = new URL(target, current);
    },
  };
  globalThis.window = { location, history, localStorage };
  globalThis.location = location;
  globalThis.history = history;
  globalThis.document = {
    documentElement: { lang: "en-US" },
    readyState: "complete",
    referrer: "https://www.google.com/search?q=laundry",
    querySelectorAll: () => [],
  };
  globalThis.sessionStorage = memoryStorage();
  return { location, historyCalls, localStorage };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}
