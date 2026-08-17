import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

globalThis.window = { location: { hostname: "localhost", pathname: "/pickup-delivery/", search: "", hash: "", protocol: "http:" } };
globalThis.location = globalThis.window.location;
globalThis.document = { documentElement: { lang: "en-US" } };
globalThis.sessionStorage = { getItem: () => null, setItem: () => {} };
globalThis.crypto ??= await import("node:crypto").then(({ webcrypto }) => webcrypto);
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ data: { productAnalyticsEnabled: true, productExperimentEnabled: false } }),
});

const analytics = await import("../assets/js/pud-product-analytics.js");
const SESSION_KEY = "snappyPudAnalyticsSession:v1";
const EXPOSURE_KEY = "snappyPudExperimentExposure:v1";
const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const SESSION_ID_PATTERN = new RegExp(`^session:${UUID_V4}$`);
const EVENT_ID_PATTERN = new RegExp(`^event:${UUID_V4}$`);
let freshModuleId = 0;

test("private status, claims, and recovery routes never get an analytics page key", () => {
  for (const path of [
    "/pickup-delivery/status/",
    "/pickup-delivery/status/index.html",
    "/pickup-delivery/claims/",
    "/pickup-delivery/recover/",
  ]) {
    assert.equal(analytics.analyticsPageKey(path), null);
    assert.equal(analytics.providerSafeRoute(path), null);
  }
});

test("product analytics is independently exact-on gated and uses a no-referrer config request", async () => {
  assert.equal(await analytics.productAnalyticsEnabled(), true);
  assert.equal(await analytics.productExperimentEnabled(), false);
  const source = await readFile(new URL("../assets/js/pud-product-analytics.js", import.meta.url), "utf8");
  assert.match(source, /productAnalyticsEnabled === true/);
  assert.match(source, /productExperimentEnabled === true/);
  assert.match(source, /referrerPolicy: "no-referrer"/);
});

test("analytics ingestion and experiment exposure use separate exact-true flags", async () => {
  for (const [config, expectedAnalytics, expectedExperiment] of [
    [{ productAnalyticsEnabled: true, productExperimentEnabled: false }, true, false],
    [{ productAnalyticsEnabled: true, productExperimentEnabled: true }, true, true],
    [{ productAnalyticsEnabled: false, productExperimentEnabled: true }, false, true],
    [{ productAnalyticsEnabled: "true", productExperimentEnabled: "true" }, false, false],
  ]) {
    const loaded = await freshAnalytics({ config });
    assert.equal(await loaded.productAnalyticsEnabled(), expectedAnalytics);
    assert.equal(await loaded.productExperimentEnabled(), expectedExperiment);
  }
});

test("event IDs are generated as lowercase UUIDv4 values and supplied IDs are validated unchanged", () => {
  const supplied = "event:00000000-0000-4000-8000-0000000000aa";
  const event = analytics.buildProductEvent("pud_page_viewed", {}, { eventId: supplied });
  assert.equal(event.eventId, supplied);
  assert.match(analytics.buildProductEvent("pud_page_viewed").eventId, EVENT_ID_PATTERN);

  for (const eventId of [
    "event:00000000-0000-4000-8000-0000000000AA",
    "event:00000000-0000-1000-8000-0000000000aa",
    "event:customer@example.com",
    "session:00000000-0000-4000-8000-0000000000aa",
  ]) {
    assert.throws(
      () => analytics.buildProductEvent("pud_page_viewed", {}, { eventId }),
      /lowercase UUIDv4/,
    );
  }
});

test("experiment assignment rejects non-lowercase or non-v4 session IDs", async () => {
  for (const sessionId of [
    "session:00000000-0000-4000-8000-0000000000AA",
    "session:00000000-0000-1000-8000-0000000000aa",
    "session:customer@example.com",
    "event:00000000-0000-4000-8000-0000000000aa",
  ]) {
    await assert.rejects(
      () => analytics.deterministicExperimentAssignment(sessionId),
      /lowercase UUIDv4/,
    );
  }
});

test("poisoned stored session IDs are replaced before ingestion", async () => {
  const storage = memorySessionStorage({ [SESSION_KEY]: "session:+13145550199" });
  const bodies = [];
  const loaded = await freshAnalytics({
    storage,
    config: { productAnalyticsEnabled: true, productExperimentEnabled: false },
    ingest: async (body) => { bodies.push(body); return { ok: true }; },
  });
  assert.equal(await loaded.trackProductEvent("site_page_viewed", { navigationType: "navigate" }, { consent: true }), true);
  assert.equal(bodies.length, 1);
  assert.match(bodies[0].sessionId, SESSION_ID_PATTERN);
  assert.notEqual(bodies[0].sessionId, "session:+13145550199");
  assert.equal(storage.getItem(SESSION_KEY), bodies[0].sessionId);
});

test("failed and non-ok ingestion persist no lifecycle markers and a later call retries them", async () => {
  const storage = memorySessionStorage();
  const bodies = [];
  let mode = "throw";
  const loaded = await freshAnalytics({
    storage,
    config: { productAnalyticsEnabled: true, productExperimentEnabled: true },
    ingest: async (body) => {
      bodies.push(body);
      if (mode === "throw") throw new Error("offline");
      return { ok: mode === "ok" };
    },
  });
  const sessionId = await eligibleSessionId(loaded);
  storage.setItem(SESSION_KEY, sessionId);
  const eventId = "event:00000000-0000-4000-8000-0000000000bb";

  assert.equal(await loaded.trackProductEvent("pud_page_viewed", {}, { consent: true, eventId }), false);
  assertLifecycleNotPersisted(storage);
  assert.deepEqual(bodies[0].events.map((event) => event.name), [
    "pud_session_started", "pud_experiment_exposed", "pud_page_viewed",
  ]);
  assert.equal(bodies[0].events.at(-1).eventId, eventId);

  mode = "not-ok";
  assert.equal(await loaded.trackProductEvent("pud_page_viewed", {}, { consent: true, eventId }), false);
  assertLifecycleNotPersisted(storage);
  assert.deepEqual(bodies[1].events.map((event) => event.name), [
    "pud_session_started", "pud_experiment_exposed", "pud_page_viewed",
  ]);

  mode = "ok";
  assert.equal(await loaded.trackProductEvent("pud_page_viewed", {}, { consent: true, eventId }), true);
  assertSessionLifecycle(storage, sessionId);

  assert.equal(await loaded.trackProductEvent("pud_booking_started", {}, {
    consent: true,
    eventId: "event:00000000-0000-4000-8000-0000000000bc",
  }), true);
  assert.deepEqual(bodies[3].events.map((event) => event.name), ["pud_booking_started"]);
});

test("legacy global markers and stale exposure metadata cannot cross analytics sessions", async () => {
  const storage = memorySessionStorage();
  const bodies = [];
  const loaded = await freshAnalytics({
    storage,
    config: { productAnalyticsEnabled: true, productExperimentEnabled: true },
    ingest: async (body) => { bodies.push(body); return { ok: true }; },
  });
  const firstSessionId = await eligibleSessionId(loaded);
  const secondSessionId = await eligibleSessionId(loaded, [firstSessionId]);
  const legacyAssignment = await loaded.deterministicExperimentAssignment(firstSessionId);
  storage.setItem(SESSION_KEY, firstSessionId);
  storage.setItem(`${SESSION_KEY}:started`, "1");
  storage.setItem(`${SESSION_KEY}:exposed`, "1");
  storage.setItem(EXPOSURE_KEY, JSON.stringify(legacyAssignment));

  assert.equal(await loaded.trackProductEvent("pud_page_viewed", {}, {
    consent: true,
    eventId: "event:00000000-0000-4000-8000-0000000000bd",
  }), true);
  assert.deepEqual(bodies[0].events.map((event) => event.name), [
    "pud_session_started", "pud_experiment_exposed", "pud_page_viewed",
  ]);
  assertSessionLifecycle(storage, firstSessionId);

  storage.setItem(SESSION_KEY, secondSessionId);
  assert.equal(await loaded.trackProductEvent("pud_booking_started", {}, {
    consent: true,
    eventId: "event:00000000-0000-4000-8000-0000000000be",
  }), true);
  assert.deepEqual(bodies[1].events.map((event) => event.name), [
    "pud_session_started", "pud_experiment_exposed", "pud_booking_started",
  ]);
  assertSessionLifecycle(storage, secondSessionId);
});

test("concurrent tracking is serialized and experiment-off sends no exposure", async () => {
  const sessionId = "session:00000000-0000-4000-8000-0000000000cc";
  const storage = memorySessionStorage({ [SESSION_KEY]: sessionId });
  const bodies = [];
  let releaseFirst;
  const firstResponse = new Promise((resolve) => { releaseFirst = resolve; });
  const loaded = await freshAnalytics({
    storage,
    config: { productAnalyticsEnabled: true, productExperimentEnabled: false },
    ingest: async (body) => {
      bodies.push(body);
      if (bodies.length === 1) return firstResponse;
      return { ok: true };
    },
  });

  const first = loaded.trackProductEvent("pud_page_viewed", {}, {
    consent: true,
    eventId: "event:00000000-0000-4000-8000-0000000000cd",
  });
  const second = loaded.trackProductEvent("pud_booking_started", {}, {
    consent: true,
    eventId: "event:00000000-0000-4000-8000-0000000000ce",
  });
  await waitFor(() => bodies.length === 1);
  assert.equal(bodies.length, 1);
  assert.deepEqual(bodies[0].events.map((event) => event.name), ["pud_session_started", "pud_page_viewed"]);
  releaseFirst({ ok: true });
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[1].events.map((event) => event.name), ["pud_booking_started"]);
  assert.equal(storage.getItem(EXPOSURE_KEY), null);
});

test("GA and Meta provider initialization remains suppressed on unsafe query and fragment URLs", async () => {
  const source = await readFile(new URL("../assets/js/pud-site-analytics.js", import.meta.url), "utf8");
  const unsafeLocation = { pathname: "/pickup-delivery/", search: "?email=customer%40example.com", hash: "#Bearer.private" };
  const providerSafe = (locationLike) => {
    if (locationLike.search || locationLike.hash) return null;
    return analytics.providerSafeRoute(locationLike.pathname);
  };
  assert.equal(providerSafe(unsafeLocation), null);
  assert.match(source, /if \(window\.location\.search \|\| window\.location\.hash\) return null/);
  assert.match(source, /function bootstrapMetaPixel\(\)[\s\S]*?const route = providerSafeContext\(\);[\s\S]*?if \(!route\) return/);
  assert.match(source, /function initGoogleAnalytics\(\)[\s\S]*?const route = providerSafeContext\(\);[\s\S]*?if \(!route\)/);
  assert.match(source, /send_page_view: false/);
  assert.doesNotMatch(source, /["']PageView["']/);
  assert.doesNotMatch(source, /window\.location\.href|link_href|page_referrer/);
});

test("provider events expose only classified route, CTA, and locale fields", () => {
  const event = analytics.safeProviderEvent("cta_clicked", { ctaId: "pickup_submit", destinationCategory: "pickup_booking" });
  assert.deepEqual(Object.keys(event.parameters).sort(), ["ctaId", "destinationCategory", "event_id", "locale", "page_key", "page_path"].sort());
  assert.equal(JSON.stringify(event).includes("http"), false);
  assert.equal(JSON.stringify(event).includes("?"), false);
  assert.equal(JSON.stringify(event).includes("#"), false);
});

async function freshAnalytics({
  config = { productAnalyticsEnabled: false, productExperimentEnabled: false },
  storage = memorySessionStorage(),
  ingest = async () => ({ ok: true }),
} = {}) {
  globalThis.sessionStorage = storage;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/api/pud/public-config")) {
      return { ok: true, json: async () => ({ data: config }) };
    }
    if (String(url).endsWith("/api/pud/analytics/events") && options.method === "POST") {
      return ingest(JSON.parse(options.body), options);
    }
    throw new Error(`Unexpected analytics test request: ${url}`);
  };
  freshModuleId += 1;
  return import(`../assets/js/pud-product-analytics.js?test=${freshModuleId}`);
}

function memorySessionStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

async function eligibleSessionId(loaded, excluded = []) {
  for (let index = 1; index <= 100; index += 1) {
    const candidate = `session:00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
    if (!excluded.includes(candidate) && await loaded.deterministicExperimentAssignment(candidate)) return candidate;
  }
  throw new Error("Could not find a deterministic eligible analytics session for the test.");
}

function assertLifecycleNotPersisted(storage) {
  assert.equal(storage.getItem(`${SESSION_KEY}:started`), null);
  assert.equal(storage.getItem(`${SESSION_KEY}:exposed`), null);
  assert.equal(storage.getItem(EXPOSURE_KEY), null);
}

function assertSessionLifecycle(storage, sessionId) {
  assert.equal(storage.getItem(`${SESSION_KEY}:started`), sessionId);
  assert.equal(storage.getItem(`${SESSION_KEY}:exposed`), sessionId);
  const stored = JSON.parse(storage.getItem(EXPOSURE_KEY));
  assert.equal(stored.sessionId, sessionId);
  assert.deepEqual(Object.keys(stored).sort(), ["assignment", "sessionId"]);
  assert.deepEqual(Object.keys(stored.assignment).sort(), ["assignmentVersion", "experimentId", "holdout", "variant"]);
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for the analytics request.");
}
