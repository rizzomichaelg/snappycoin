import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "pickup-delivery/index.html", "pickup-delivery/status/index.html", "pickup-delivery/privacy/index.html",
  "pickup-delivery/terms/index.html", "pickup-delivery/claims/index.html", "assets/css/pud.css", "assets/css/pud-status.css",
  "assets/css/pud-accessibility.css", "assets/js/site-analytics.js", "assets/js/pud-config.js", "assets/js/pud-api.js",
  "assets/js/pud-contract.js", "assets/js/pud-address.js", "assets/js/pud-attribution.js", "assets/js/pud-booking.js",
  "assets/js/pud-payment.js", "assets/js/pud-phone.js", "assets/js/pud-scheduling.js", "assets/js/pud-status.js",
  "assets/js/pud-claims.js",
  "assets/js/pud-idempotency.js", "assets/js/pud-reorder.js", "assets/js/pud-waitlist-continuation.js",
];
await Promise.all(required.map((file) => access(resolve(root, file))));
for (const file of required.filter((candidate) => candidate.endsWith(".js"))) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`JavaScript syntax check failed for ${file}: ${result.stderr || result.stdout}`);
}

const booking = await source("pickup-delivery/index.html");
const status = await source("pickup-delivery/status/index.html");
const claims = await source("pickup-delivery/claims/index.html");
const bookingJs = await source("assets/js/pud-booking.js");
const statusJs = await source("assets/js/pud-status.js");
const apiJs = await source("assets/js/pud-api.js");
const contractJs = await source("assets/js/pud-contract.js");
const paymentJs = await source("assets/js/pud-payment.js");
const reorderJs = await source("assets/js/pud-reorder.js");
const claimsJs = await source("assets/js/pud-claims.js");
const idempotencyJs = await source("assets/js/pud-idempotency.js");
const attributionJs = await source("assets/js/pud-attribution.js");
const waitlistBootstrapJs = await source("assets/js/pud-waitlist-continuation.js");
const siteAnalyticsJs = await source("assets/js/site-analytics.js");

for (const marker of ["pud-address-form", "pud-details-form", "pud-code-form", "pud-payment-form", "pud-review-form"]) {
  if (!booking.includes(marker)) throw new Error(`Booking marker missing: ${marker}`);
}
if (!status.includes('meta name="referrer" content="no-referrer"')) throw new Error("Status page must use no-referrer.");
if (!status.includes("noindex,nofollow")) throw new Error("Status page must be noindex.");
if (status.includes("frame-ancestors")) throw new Error("frame-ancestors is ineffective in a meta CSP and must be delivered as a response header.");
if (!claims.includes('meta name="referrer" content="no-referrer"')) throw new Error("Claims page must use no-referrer.");
if (!booking.includes('/assets/js/site-analytics.js')) throw new Error("Booking page must load the consent-aware site analytics module.");
if (status.includes("site-analytics.js") || claims.includes("site-analytics.js")) throw new Error("Private token pages must not load page-view analytics.");
if (status.includes("data-contract-disabled")) throw new Error("The obsolete hidden advanced-flow marker must be removed.");

for (const marker of [
  "pud-reschedule-form", "pud-payment-method-form", "pud-tip-form", "pud-recurring-create-form",
  'data-action="payment-replace"', 'data-action="reorder"', 'data-action="cancel"',
]) {
  if (!status.includes(marker)) throw new Error(`Advanced status control missing: ${marker}`);
}
const tipInput = status.match(/<input[^>]+name="amount"[^>]*>/)?.[0] || "";
if (!tipInput || /\svalue=/.test(tipInput)) throw new Error("Tip input must exist without a preselected amount.");
if (!/reorderOrder\(token/.test(statusJs)) throw new Error("Status page must expose the private reorder/proposal bootstrap.");
if (!statusJs.includes("window.top !== window.self") || !bookingJs.includes("window.top !== window.self")) {
  throw new Error("Private and checkout pages need a static-host frame-busting fallback.");
}

for (const callback of ['"error-callback"', '"expired-callback"', '"timeout-callback"']) {
  if (!bookingJs.includes(callback)) throw new Error(`Turnstile callback missing: ${callback}`);
}
for (const marker of ['utm_source: "utmSource"', "selfReportedSource", "currentPath"]) {
  if (!attributionJs.includes(marker)) throw new Error(`Attribution contract marker missing: ${marker}`);
}
if (attributionJs.includes("referrerDomain") || attributionJs.includes("selfReported:")) throw new Error("Attribution includes a non-contract field.");
if (attributionJs.includes('`${url.pathname}${url.search}`') || attributionJs.includes("referrer.slice")) {
  throw new Error("Attribution must persist only a pathname and referrer origin, never arbitrary URL query data.");
}
for (const marker of ["safePath", "safeReferrerOrigin", "safeCampaignValue", "containsSensitiveUrlMaterial"]) {
  if (!attributionJs.includes(marker)) throw new Error(`Privacy-safe attribution marker missing: ${marker}`);
}

if (statusJs.includes("location.search") || claimsJs.includes("location.search")) throw new Error("Private pages must strip URL query strings.");
if (/trackFunnel|SnappyAnalytics|gtag\(/.test(statusJs + claimsJs)) throw new Error("Private pages must not invoke analytics.");
if (/innerHTML|insertAdjacentHTML|document\.write/.test(statusJs)) throw new Error("Status controls must construct safe DOM nodes.");
if (!statusJs.includes("history.replaceState") || !claimsJs.includes("history.replaceState")) throw new Error("Private pages must normalize tokens to a fragment-only URL.");
if (!apiJs.includes('postContract("/api/pud/orders/status", { token })')) throw new Error("Status token must be sent in a JSON request body.");
if (/apiUrl\([^\n]*(?:token|clientSecret|setupIntentClientSecret)/.test(apiJs + statusJs)) throw new Error("Tokens or client secrets must not enter an API URL.");
if (!statusJs.includes("PUD_VERSION_CONFLICT") || !statusJs.includes("await refresh()")) throw new Error("Status actions must recover version conflicts with a server refresh.");
if (!statusJs.includes("actionInFlight") || !claimsJs.includes("submitting") || !bookingJs.includes("submissionInFlight")) {
  throw new Error("Booking and private actions need double-submit protection.");
}

for (const scope of ["cancel", "reschedule", "payment-method", "tip", "recurring-create"]) {
  if (!statusJs.includes(`stableActionKey("${scope}"`)) throw new Error(`Stable action key missing: ${scope}`);
}
if (!claimsJs.includes('stableActionKey("claim"') || !bookingJs.includes('stableActionKey("order"')) {
  throw new Error("Claim and booking actions need retry-stable idempotency keys.");
}
if (!idempotencyJs.includes('digest("SHA-256"') || /sessionStorage\.[^(]+\([^\n]*(?:token|secret|proof)/i.test(idempotencyJs)) {
  throw new Error("Idempotency storage must retain only fingerprints and generated keys.");
}
if (apiJs.includes("Math.random") || !apiJs.includes("getRandomValues")) throw new Error("Idempotency keys require a cryptographic random source.");

for (const marker of ["preparePaymentMethodReplacement", "confirmPaymentMethodReplacement", "replacePaymentMethod(token", "setupIntentClientSecret"]) {
  if (!statusJs.includes(marker) && !paymentJs.includes(marker)) throw new Error(`Replacement-card recovery marker missing: ${marker}`);
}
if (/sessionStorage|localStorage/.test(paymentJs)) throw new Error("Stripe client secrets must remain memory-only.");
if (!statusJs.includes("confirmPaymentRemediation") || !statusJs.includes("tipOrder(token")) throw new Error("Tip PaymentIntent confirmation is incomplete.");

for (const marker of ["recurringProposalId", "preferredRouteId", "requiresPhoneVerification", "requiresPaymentSetup"]) {
  if (!bookingJs.includes(marker) && !reorderJs.includes(marker) && !statusJs.includes(marker)) throw new Error(`Safe proposal bootstrap marker missing: ${marker}`);
}
if (!bookingJs.includes("phoneProof") || !bookingJs.includes("addressProof") || !bookingJs.includes("preparePayment")) {
  throw new Error("Proposal/reorder booking must retain the normal address, phone, and SetupIntent proof chain.");
}
for (const marker of [
  "takeWaitlistContinuation", "waitlistContinuationToken", "waitlistRouteId",
  "waitlistContinuationToken: state.waitlistContinuationToken", "clearWaitlistContinuation",
]) {
  if (!bookingJs.includes(marker) && !paymentJs.includes(marker)) throw new Error(`Waitlist checkout continuation marker missing: ${marker}`);
}
if (!waitlistBootstrapJs.includes("history.replaceState") || !bookingJs.includes("SnappyWaitlistContinuation")) {
  throw new Error("Waitlist bearer continuation must leave the URL fragment immediately and recover only within the browser session.");
}
const bootstrapPosition = booking.indexOf('/assets/js/pud-waitlist-continuation.js');
const analyticsPosition = booking.indexOf('/assets/js/site-analytics.js');
if (bootstrapPosition < 0 || analyticsPosition < 0 || bootstrapPosition > analyticsPosition) {
  throw new Error("Waitlist bearer bootstrap must execute before any analytics module is loaded.");
}
if (siteAnalyticsJs.includes("window.location.href") || siteAnalyticsJs.includes("window.location.hash")) {
  throw new Error("Analytics must never receive URL fragments or a raw browser URL.");
}
if (!contractJs.includes('"waitlistContinuationToken"') || !paymentJs.includes("waitlistContinuationToken ?")) {
  throw new Error("Waitlist continuation token must be an optional payment-setup contract field.");
}
if (/trackFunnel\([^)]*waitlistContinuation/i.test(bookingJs)) {
  throw new Error("Waitlist continuation tokens must never enter analytics.");
}
if (!contractJs.includes('["token", "cadence", "preferredRouteRule"') || contractJs.includes('["token", "addressId", "cadence"')) {
  throw new Error("Recurring create must use safe server defaults without exposing an address ID.");
}

const createOrderBlock = bookingJs.slice(bookingJs.indexOf("async function submitOrder"), bookingJs.indexOf("async function submitWaitlist"));
if (!createOrderBlock.includes("checkoutProof") || createOrderBlock.includes("phoneProof") || createOrderBlock.includes("addressProof")) {
  throw new Error("Final order payload must use checkoutProof and must not replay phone/address proofs.");
}
if (!createOrderBlock.includes("recurringProposalId")) throw new Error("Proposal ID must reach normal order creation.");

const stored = new Map();
globalThis.window = { location: { hostname: "localhost" } };
globalThis.sessionStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
  removeItem: (key) => stored.delete(key),
};
const { stableActionKey } = await import("../assets/js/pud-idempotency.js");
const persistedKey = await stableActionKey("verifier", "private-intent-material");
if (persistedKey !== await stableActionKey("verifier", "private-intent-material")) {
  throw new Error("The same logical retry did not reuse its persisted idempotency key.");
}
if (persistedKey === await stableActionKey("verifier", "different-intent")) {
  throw new Error("Distinct logical actions reused an idempotency key.");
}
if ([...stored.values()].some((value) => value.includes("private-intent-material"))) {
  throw new Error("Raw action input leaked into idempotency storage.");
}
globalThis.sessionStorage.getItem = () => { throw new Error("storage denied"); };
globalThis.sessionStorage.setItem = () => { throw new Error("storage denied"); };
const memoryKey = await stableActionKey("memory-fallback", "retry-intent");
if (memoryKey !== await stableActionKey("memory-fallback", "retry-intent")) {
  throw new Error("Idempotency keys were unstable when browser storage was unavailable.");
}

const { requestJson } = await import("../assets/js/pud-api.js");
globalThis.fetch = (_url, options = {}) => new Promise((_resolve, reject) => {
  const abort = () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    reject(error);
  };
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener("abort", abort, { once: true });
});
let timeoutFailure;
try {
  await requestJson("/api/pud/public-config", { timeoutMs: 5 });
} catch (error) {
  timeoutFailure = error;
}
if (timeoutFailure?.code !== "PUD_CLIENT_TIMEOUT" || timeoutFailure.retryable !== true) {
  throw new Error("Customer API requests must abort and classify an expired deadline as retryable.");
}

globalThis.fetch = async () => { throw new TypeError("network unavailable"); };
let networkFailure;
try {
  await requestJson("/api/pud/public-config", { timeoutMs: 100 });
} catch (error) {
  networkFailure = error;
}
if (networkFailure?.code !== "PUD_CLIENT_NETWORK_ERROR" || networkFailure.retryable !== true) {
  throw new Error("Customer API requests must classify transport failures as retryable without exposing details.");
}

console.log(`PUD frontend verification passed (${required.length} required files).`);

function source(path) {
  return readFile(resolve(root, path), "utf8");
}
