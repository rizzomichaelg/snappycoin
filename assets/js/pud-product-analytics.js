import { apiUrl } from "./pud-config.js";

export const ANALYTICS_TAXONOMY_VERSION = "pud-product-analytics-v1";
export const ANALYTICS_EVENTS = Object.freeze([
  "site_page_viewed", "cta_clicked", "pud_session_started", "pud_page_viewed",
  "pud_address_eligible", "pud_address_ineligible", "pud_waitlist_joined",
  "pud_booking_started", "pud_phone_verified", "pud_card_saved",
  "pud_order_submitted", "pud_experiment_exposed"
]);
export const ANALYTICS_PAGE_KEYS = Object.freeze([
  "home", "pickup_delivery", "privacy", "terms", "cookies"
]);

const SESSION_KEY = "snappyPudAnalyticsSession:v1";
const EXPOSURE_KEY = "snappyPudExperimentExposure:v1";
const PRIVATE_PATHS = Object.freeze([
  "/pickup-delivery/status/",
  "/pickup-delivery/claims/",
  "/pickup-delivery/recover/"
]);
const EVENT_SET = new Set(ANALYTICS_EVENTS);
const PAGE_SET = new Set(ANALYTICS_PAGE_KEYS);
const CTA_IDS = new Set(["hero_pickup", "nav_pickup", "promo_claim", "cookie_preferences", "pickup_submit", "pickup_recover", "other"]);
const DESTINATIONS = new Set(["pickup_booking", "promotion", "preferences", "status_recovery", "same_page", "other"]);
const PARAMETER_RULES = Object.freeze({
  site_page_viewed: { navigationType: new Set(["navigate", "reload", "back_forward", "prerender", "unknown"]) },
  cta_clicked: { ctaId: CTA_IDS, destinationCategory: DESTINATIONS },
  pud_session_started: {},
  pud_page_viewed: {},
  pud_address_eligible: {},
  pud_address_ineligible: { reasonCategory: new Set(["outside_area", "needs_review", "unknown"]) },
  pud_waitlist_joined: {},
  pud_booking_started: {},
  pud_phone_verified: {},
  pud_card_saved: {},
  pud_order_submitted: { duplicate: "boolean" },
  pud_experiment_exposed: {},
});
const EXPERIMENT = Object.freeze({
  experimentId: "booking_flow_v1",
  assignmentVersion: "booking-flow-assignment-v1",
  assignmentSalt: "snappy-booking-flow-v1",
  variants: Object.freeze(["control", "streamlined"]),
  trafficAllocationBps: 9000,
  holdoutBps: 1000,
});
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let productConfigPromise;
let trackingQueue = Promise.resolve();

export function analyticsPageKey(pathname = globalThis.location?.pathname || "") {
  const path = normalizePath(pathname);
  if (PRIVATE_PATHS.some((prefix) => path.startsWith(prefix))) return null;
  if (path === "/" || path === "/index.html") return "home";
  if (path === "/pickup-delivery/" || path === "/pickup-delivery/index.html") return "pickup_delivery";
  if (path === "/privacy.html" || path === "/pickup-delivery/privacy/") return "privacy";
  if (path === "/terms.html" || path === "/pickup-delivery/terms/") return "terms";
  if (path === "/cookies.html") return "cookies";
  return null;
}

export function isPrivateAnalyticsPath(pathname = globalThis.location?.pathname || "") {
  const path = normalizePath(pathname);
  return PRIVATE_PATHS.some((prefix) => path.startsWith(prefix));
}

export function providerSafeRoute(pathname = globalThis.location?.pathname || "") {
  const key = analyticsPageKey(pathname);
  return key ? { pageKey: key, pagePath: safePagePath(key) } : null;
}

export function safePagePath(pageKey) {
  return ({
    home: "/",
    pickup_delivery: "/pickup-delivery/",
    privacy: "/privacy",
    terms: "/terms",
    cookies: "/cookies",
  })[pageKey] || "/";
}

export function classifyCta(target) {
  const requested = String(target?.dataset?.analyticsId || "").trim();
  const ctaId = CTA_IDS.has(requested) ? requested : inferCtaId(target);
  return { ctaId, destinationCategory: classifyDestination(target?.getAttribute?.("href")) };
}

export function classifyDestination(rawHref) {
  const href = String(rawHref || "").trim();
  if (!href || href.startsWith("#")) return "same_page";
  let pathname = "";
  try { pathname = new URL(href, "https://snappycoin.invalid/").pathname; } catch (_error) { return "other"; }
  if (pathname.startsWith("/pickup-delivery/recover/")) return "status_recovery";
  if (pathname.startsWith("/pickup-delivery/")) return "pickup_booking";
  if (pathname.includes("promo") || pathname.includes("free-weekday-wash")) return "promotion";
  if (pathname.endsWith("/cookies.html")) return "preferences";
  return "other";
}

export function navigationType() {
  try {
    const value = performance.getEntriesByType?.("navigation")?.[0]?.type;
    return ["navigate", "reload", "back_forward", "prerender"].includes(value) ? value : "unknown";
  } catch (_error) {
    return "unknown";
  }
}

export function buildProductEvent(name, parameters = {}, options = {}) {
  if (!EVENT_SET.has(name)) throw new TypeError("Unknown analytics event.");
  const pageKey = options.pageKey || analyticsPageKey();
  if (!PAGE_SET.has(pageKey)) throw new TypeError("Analytics is disabled on this route.");
  const safeParameters = validateParameters(name, parameters);
  const event = {
    eventId: options.eventId === undefined
      ? secureId("event")
      : analyticsIdentifier("event", options.eventId),
    name,
    occurredAt: options.occurredAt || new Date().toISOString(),
    pageKey,
    locale: localeSnapshot(),
    parameters: safeParameters,
    experiment: options.experiment || null,
  };
  if ((name === "pud_experiment_exposed") !== Boolean(event.experiment)) {
    throw new TypeError("Experiment metadata is exposure-only.");
  }
  rejectSensitiveSerialization(event);
  return event;
}

export function trackProductEvent(name, parameters = {}, options = {}) {
  const pageKey = analyticsPageKey();
  if (!pageKey || options.consent !== true) return Promise.resolve(false);
  const request = trackingQueue.then(() => trackProductEventSerialized(name, parameters, options, pageKey));
  trackingQueue = request.then(() => undefined, () => undefined);
  return request;
}

async function trackProductEventSerialized(name, parameters, options, pageKey) {
  const config = await productFeatureConfig();
  if (!config.analyticsEnabled) return false;
  const sessionId = analyticsSessionId();
  const events = [];
  let marksStarted = false;
  let exposure = null;
  if (name.startsWith("pud_") && name !== "pud_session_started" && !sessionFlag("started", sessionId)) {
    events.push(buildProductEvent("pud_session_started", {}, { pageKey }));
    marksStarted = true;
  }
  if (name === "pud_session_started") marksStarted = true;
  if (config.experimentEnabled && name.startsWith("pud_") && name !== "pud_experiment_exposed") {
    exposure = await exposureEvent(sessionId, pageKey);
    if (exposure) events.push(exposure);
  }
  events.push(buildProductEvent(name, parameters, { pageKey, eventId: options.eventId }));
  const body = { sessionId, events };
  rejectSensitiveSerialization(body);
  try {
    const response = await fetch(apiUrl("/api/pud/analytics/events"), {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      keepalive: true,
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return false;
    if (marksStarted) setSessionFlag("started", sessionId);
    if (exposure) persistExposure(sessionId, exposure.experiment);
    return true;
  } catch (_error) {
    return false;
  }
}

export function productAnalyticsEnabled() {
  return productFeatureConfig().then((config) => config.analyticsEnabled);
}

export function productExperimentEnabled() {
  return productFeatureConfig().then((config) => config.experimentEnabled);
}

function productFeatureConfig() {
  if (!productConfigPromise) {
    productConfigPromise = fetch(apiUrl("/api/pud/public-config"), {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) return false;
      const payload = await response.json();
      const config = payload?.data || payload;
      return Object.freeze({
        analyticsEnabled: config?.productAnalyticsEnabled === true,
        experimentEnabled: config?.productExperimentEnabled === true,
      });
    }).catch(() => Object.freeze({ analyticsEnabled: false, experimentEnabled: false }));
  }
  return productConfigPromise.then((config) => config === false
    ? Object.freeze({ analyticsEnabled: false, experimentEnabled: false })
    : config);
}

export async function deterministicExperimentAssignment(sessionId) {
  const validatedSessionId = analyticsIdentifier("session", sessionId);
  const bytes = new TextEncoder().encode(`${EXPERIMENT.assignmentSalt}:${validatedSessionId}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const bucket = (((digest[0] << 8) | digest[1]) >>> 0) % 10000;
  if (bucket >= EXPERIMENT.trafficAllocationBps) return null;
  const holdout = bucket < EXPERIMENT.holdoutBps;
  const variantBucket = Math.max(0, bucket - EXPERIMENT.holdoutBps);
  return {
    experimentId: EXPERIMENT.experimentId,
    assignmentVersion: EXPERIMENT.assignmentVersion,
    variant: EXPERIMENT.variants[variantBucket % EXPERIMENT.variants.length],
    holdout,
  };
}

export function safeProviderEvent(name, parameters = {}) {
  const event = buildProductEvent(name, parameters);
  return {
    name: event.name,
    parameters: {
      event_id: event.eventId,
      page_key: event.pageKey,
      page_path: safePagePath(event.pageKey),
      locale: event.locale,
      ...event.parameters,
    },
  };
}

async function exposureEvent(sessionId, pageKey) {
  if (sessionFlag("exposed", sessionId) || storedExposure(sessionId)) return null;
  const assignment = await deterministicExperimentAssignment(sessionId);
  if (!assignment) return null;
  return buildProductEvent("pud_experiment_exposed", {}, { pageKey, experiment: assignment });
}

function persistExposure(sessionId, assignment) {
  writeSession(EXPOSURE_KEY, JSON.stringify({ sessionId, assignment }));
  setSessionFlag("exposed", sessionId);
}

function storedExposure(sessionId) {
  const raw = readSession(EXPOSURE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        Object.keys(value).some((key) => !["sessionId", "assignment"].includes(key)) ||
        !isAnalyticsIdentifier("session", value.sessionId) || value.sessionId !== sessionId) return null;
    const assignment = value.assignment;
    if (!assignment || typeof assignment !== "object" || Array.isArray(assignment) ||
        Object.keys(assignment).some((key) => !["experimentId", "assignmentVersion", "variant", "holdout"].includes(key)) ||
        assignment.experimentId !== EXPERIMENT.experimentId ||
        assignment.assignmentVersion !== EXPERIMENT.assignmentVersion ||
        !EXPERIMENT.variants.includes(assignment.variant) ||
        typeof assignment.holdout !== "boolean") return null;
    return assignment;
  } catch (_error) {
    return null;
  }
}

function analyticsSessionId() {
  const current = readSession(SESSION_KEY);
  if (isAnalyticsIdentifier("session", current)) return current;
  const created = secureId("session");
  writeSession(SESSION_KEY, created);
  return created;
}

function secureId(prefix) {
  const id = crypto.randomUUID?.();
  if (typeof id !== "string") throw new TypeError("Secure analytics identifier generation is unavailable.");
  return analyticsIdentifier(prefix, `${prefix}:${id.toLowerCase()}`);
}

function isAnalyticsIdentifier(prefix, value) {
  return typeof value === "string" && value.startsWith(`${prefix}:`) && UUID_V4_PATTERN.test(value.slice(prefix.length + 1));
}

function analyticsIdentifier(prefix, value) {
  if ((prefix !== "session" && prefix !== "event") || !isAnalyticsIdentifier(prefix, value)) {
    throw new TypeError(`Analytics ${prefix} identifier must be a lowercase UUIDv4.`);
  }
  return value;
}

function sessionFlag(name, sessionId) {
  return readSession(`${SESSION_KEY}:${name}`) === sessionId;
}

function setSessionFlag(name, sessionId) {
  writeSession(`${SESSION_KEY}:${name}`, sessionId);
}

function readSession(key) {
  try { return sessionStorage.getItem(key) || ""; } catch (_error) { return ""; }
}

function writeSession(key, value) {
  try { sessionStorage.setItem(key, value); } catch (_error) { /* optional */ }
}

function localeSnapshot() {
  return document.documentElement.lang?.toLowerCase().startsWith("es") ? "es-US" : "en-US";
}

function normalizePath(value) {
  return String(value || "/").split(/[?#]/, 1)[0] || "/";
}

function inferCtaId(target) {
  const classes = String(target?.className || "");
  if (classes.includes("btn-cta")) return "promo_claim";
  if (classes.includes("button")) return "hero_pickup";
  return "other";
}

function validateParameters(name, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Invalid analytics parameters.");
  const rules = PARAMETER_RULES[name];
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    const rule = rules[key];
    if (!rule) throw new TypeError("Disallowed analytics parameter.");
    if (rule === "boolean" ? typeof value !== "boolean" : typeof value !== "string" || !rule.has(value)) {
      throw new TypeError("Invalid analytics parameter value.");
    }
    result[key] = value;
  }
  return result;
}

function rejectSensitiveSerialization(value) {
  const serialized = JSON.stringify(value);
  if (/https?:\/\//i.test(serialized) || /\bBearer\s+/i.test(serialized) ||
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized) ||
      /"(?:href|url|query|fragment|token|proof|secret|email|phone|address)"\s*:/i.test(serialized)) {
    throw new TypeError("Sensitive analytics material rejected.");
  }
}
