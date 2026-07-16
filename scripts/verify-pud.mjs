import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "pickup-delivery/index.html", "pickup-delivery/status/index.html", "pickup-delivery/recover/index.html", "pickup-delivery/privacy/index.html",
  "pickup-delivery/terms/index.html", "pickup-delivery/claims/index.html", "assets/css/pud.css", "assets/css/pud-status.css",
  "assets/css/pud-accessibility.css", "assets/js/site-analytics.js", "assets/js/pud-config.js", "assets/js/pud-api.js",
  "assets/js/pud-contract.js", "assets/js/pud-address.js", "assets/js/pud-attribution.js", "assets/js/pud-booking.js",
  "assets/js/pud-calendar.js", "assets/js/pud-product-analytics.js", "assets/js/pud-recovery.js", "assets/js/site-i18n.js",
  "assets/js/pud-payment.js", "assets/js/pud-phone.js", "assets/js/pud-scheduling.js", "assets/js/pud-status.js",
  "assets/js/pud-claims.js",
  "assets/js/pud-claim-capability.js",
  "assets/js/pud-claim-evidence.js",
  "assets/js/pud-preference-attempt.js",
  "assets/js/pud-idempotency.js", "assets/js/pud-reorder.js", "assets/js/pud-waitlist-continuation.js",
];
await Promise.all(required.map((file) => access(resolve(root, file))));
for (const file of required.filter((candidate) => candidate.endsWith(".js"))) {
  const result = spawnSync(process.execPath, ["--check", resolve(root, file)], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`JavaScript syntax check failed for ${file}: ${result.stderr || result.stdout}`);
}

const booking = await source("pickup-delivery/index.html");
const status = await source("pickup-delivery/status/index.html");
if (!status.includes('href="/pickup-delivery/recover/"')) {
  throw new Error("Status page must link customers to private-link recovery.");
}
const recovery = await source("pickup-delivery/recover/index.html");
const claims = await source("pickup-delivery/claims/index.html");
const bookingJs = await source("assets/js/pud-booking.js");
const calendarJs = await source("assets/js/pud-calendar.js");
const i18nJs = await source("assets/js/site-i18n.js");
const statusJs = await source("assets/js/pud-status.js");
const recoveryJs = await source("assets/js/pud-recovery.js");
const apiJs = await source("assets/js/pud-api.js");
const contractJs = await source("assets/js/pud-contract.js");
const paymentJs = await source("assets/js/pud-payment.js");
const reorderJs = await source("assets/js/pud-reorder.js");
const claimsJs = await source("assets/js/pud-claims.js");
const claimCapabilityJs = await source("assets/js/pud-claim-capability.js");
const claimEvidenceJs = await source("assets/js/pud-claim-evidence.js");
const preferenceAttemptJs = await source("assets/js/pud-preference-attempt.js");
const idempotencyJs = await source("assets/js/pud-idempotency.js");
const attributionJs = await source("assets/js/pud-attribution.js");
const waitlistBootstrapJs = await source("assets/js/pud-waitlist-continuation.js");
const siteAnalyticsJs = await source("assets/js/site-analytics.js");

for (const marker of ["pud-address-form", "pud-details-form", "pud-code-form", "pud-payment-form", "pud-review-form"]) {
  if (!booking.includes(marker)) throw new Error(`Booking marker missing: ${marker}`);
}
if (!status.includes('meta name="referrer" content="no-referrer"')) throw new Error("Status page must use no-referrer.");
if (!status.includes("noindex,nofollow")) throw new Error("Status page must be noindex.");
if (!recovery.includes('meta name="referrer" content="no-referrer"') || !recovery.includes("noindex,nofollow")) {
  throw new Error("Recovery page must be no-referrer and noindex.");
}
if (status.includes("frame-ancestors")) throw new Error("frame-ancestors is ineffective in a meta CSP and must be delivered as a response header.");
if (!claims.includes('meta name="referrer" content="no-referrer"')) throw new Error("Claims page must use no-referrer.");
if (!booking.includes('/assets/js/site-analytics.js')) throw new Error("Booking page must load the consent-aware site analytics module.");
for (const [page, sourceText] of [["booking", booking], ["status", status], ["claims", claims]]) {
  if (!sourceText.includes("/assets/js/site-i18n.js")) throw new Error(`${page} page must load the human-authored locale module.`);
}
if (status.includes("site-analytics.js") || claims.includes("site-analytics.js") || recovery.includes("site-analytics.js")) {
  throw new Error("Private token and identity-recovery pages must not load page-view analytics.");
}
if (status.includes("data-contract-disabled")) throw new Error("The obsolete hidden advanced-flow marker must be removed.");
if (!booking.includes('data-action="add-pickup-calendar"') ||
    !status.includes('data-action="add-rescheduled-pickup-calendar"')) {
  throw new Error("Booking and successful rescheduling must expose the pickup calendar action.");
}
for (const marker of ["createPickupCalendar", "downloadPickupCalendar", "DTSTART:", "DTEND:", "SUMMARY:"]) {
  if (!calendarJs.includes(marker)) throw new Error(`Pickup calendar integration missing: ${marker}`);
}
for (const marker of ["selectedRoute.windowStartAt", "selectedRoute.windowEndAt", "state.calendarPickup"]) {
  if (!bookingJs.includes(marker)) throw new Error(`Booking calendar data path missing: ${marker}`);
}
for (const marker of ["route.windowStartAt", "route.windowEndAt", "rescheduledCalendarPickup"]) {
  if (!statusJs.includes(marker)) throw new Error(`Reschedule calendar data path missing: ${marker}`);
}
if (/(?:DESCRIPTION|LOCATION|URL|ATTENDEE|ORGANIZER|CONTACT):/.test(calendarJs)) {
  throw new Error("Pickup calendar must not include sensitive or link-bearing iCalendar fields.");
}

for (const marker of [
  "data-recovery-start-form", "data-recovery-code-form", "data-recovery-complete",
  "whether or not the details match", "never confirms an order number",
]) {
  if (!recovery.includes(marker)) throw new Error(`Enumeration-safe recovery UI marker missing: ${marker}`);
}
for (const marker of [
  "data-feedback-panel", 'data-satisfaction="satisfied"', 'data-satisfaction="needs_follow_up"',
  "data-feedback-review-link",
]) {
  if (!status.includes(marker)) throw new Error(`Post-service feedback control missing: ${marker}`);
}
for (const marker of [
  "submitFeedback", 'stableActionKey("feedback"', "value.canSubmitFeedback === true",
  "feedbackResult.googleReviewUrl", "supportRequested",
]) {
  if (!statusJs.includes(marker)) throw new Error(`Post-service feedback behavior missing: ${marker}`);
}
const feedbackMarkup = status.match(/<section class="pud-status-section pud-feedback"[\s\S]*?<\/section>/)?.[0] || "";
if (/textarea|type="number"|star|rating/i.test(feedbackMarkup)) {
  throw new Error("Post-service feedback must remain one private binary question without free text or rating gates.");
}
if (!apiJs.includes('postContract("/api/pud/orders/feedback"')) {
  throw new Error("Feedback must use the bounded idempotent browser request contract.");
}
for (const marker of [
  "statusRecoveryEnabled", "startStatusRecovery", "verifyStatusRecovery", "clearMemory",
  'addEventListener("pagehide", clearMemory', "history.replaceState", "window.top !== window.self",
  "submitting", '"error-callback"', '"expired-callback"', '"timeout-callback"',
]) {
  if (!recoveryJs.includes(marker)) throw new Error(`Private recovery control missing: ${marker}`);
}
if (/\b(?:localStorage|sessionStorage)\b/.test(recoveryJs) || /trackFunnel|SnappyAnalytics|gtag\(/.test(recoveryJs)) {
  throw new Error("Recovery identifiers and outcomes must remain memory-only and outside analytics.");
}
if (/location\.(?:search|hash)/.test(recoveryJs) ||
    !recoveryJs.includes('history.replaceState(null, "",') || !recoveryJs.includes("location.pathname")) {
  throw new Error("Recovery must remove URL query/fragment material before accepting identity details.");
}
if (/innerHTML|insertAdjacentHTML|document\.write/.test(recoveryJs)) {
  throw new Error("Recovery UI must render messages without HTML injection sinks.");
}
for (const directive of ["script-src", "connect-src", "frame-src"]) {
  const csp = recovery.match(/Content-Security-Policy[^>]+content="([^"]+)"/)?.[1] || recovery;
  if (!new RegExp(`${directive}[^;]*https://challenges\\.cloudflare\\.com`).test(csp)) {
    throw new Error(`Recovery CSP must allow Turnstile in ${directive}.`);
  }
}

for (const marker of [
  "pud-reschedule-form", "pud-payment-method-form", "pud-tip-form", "pud-recurring-create-form",
  "pud-step-up-phone-form", "pud-step-up-code-form", "data-receipt-weight-charge",
  "pud-preferences-form", "data-history-list", 'data-action="history-more"',
  'data-action="payment-replace"', 'data-action="reorder"', 'data-action="cancel"',
  'data-action="open-claim"', 'data-action="rotate-status-token"', 'data-action="revoke-status-token"',
  "data-loyalty-panel", "data-loyalty-balance", "data-loyalty-history",
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
  if (!bookingJs.includes(callback) || !statusJs.includes(callback)) throw new Error(`Booking/status Turnstile callback missing: ${callback}`);
}
for (const directive of ["script-src", "connect-src", "frame-src"]) {
  const csp = status.match(/Content-Security-Policy[^>]+content="([^"]+)"/)?.[1] || status;
  if (!new RegExp(`${directive}[^;]*https://challenges\\.cloudflare\\.com`).test(csp)) {
    throw new Error(`Status CSP must allow Turnstile in ${directive}.`);
  }
}
for (const marker of ['utm_source: "utmSource"', "selfReportedSource", "currentPath"]) {
  if (!attributionJs.includes(marker)) throw new Error(`Attribution contract marker missing: ${marker}`);
}
for (const marker of ["prepareAttributionQueryForProviders", "Object.hasOwn(queryFieldMap", "window.history.replaceState"]) {
  if (!attributionJs.includes(marker)) throw new Error(`Safe campaign-query preparation marker missing: ${marker}`);
}
if (attributionJs.includes("referrerDomain") || attributionJs.includes("selfReported:")) throw new Error("Attribution includes a non-contract field.");
if (attributionJs.includes('`${url.pathname}${url.search}`') || attributionJs.includes("referrer.slice")) {
  throw new Error("Attribution must persist only a pathname and referrer origin, never arbitrary URL query data.");
}
for (const marker of ["safePath", "safeReferrerOrigin", "safeCampaignValue", "containsSensitiveUrlMaterial"]) {
  if (!attributionJs.includes(marker)) throw new Error(`Privacy-safe attribution marker missing: ${marker}`);
}

if (statusJs.includes("location.search") || claimsJs.includes("location.search")) throw new Error("Private pages must strip URL query strings.");
for (const marker of ["en-US", "es-US", "America/Chicago", "USD", "LOCALE_STORAGE_KEY", "withLocalePath"]) {
  if (!i18nJs.includes(marker)) throw new Error(`Locale contract marker missing: ${marker}`);
}
if (/translate\.google|deepl|microsofttranslator|fetch\s*\(/i.test(i18nJs)) {
  throw new Error("Customer localization must use the reviewed local catalog, not a machine-translation service.");
}
if (/trackFunnel|SnappyAnalytics|gtag\(/.test(statusJs + claimsJs)) throw new Error("Private pages must not invoke analytics.");
if (/innerHTML|insertAdjacentHTML|document\.write/.test(statusJs)) throw new Error("Status controls must construct safe DOM nodes.");
if (!statusJs.includes("history.replaceState") || !claimsJs.includes("history.replaceState")) throw new Error("Private pages must normalize private URL fragments.");
if (!claimsJs.includes('history.replaceState(null, "", withLocalePath(location.pathname))')) throw new Error("Claim page must remove the status bearer fragment while preserving the safe locale choice.");
if (!claims.includes('name="description" rows="7" maxlength="4000"')) throw new Error("Claim description limit must match the backend contract.");
if (!claims.includes('name="evidence"') || !claims.includes("multiple") || !claims.includes("5 MB")) {
  throw new Error("Claim page must offer up to five bounded optional evidence files.");
}
if (!apiJs.includes('postContract("/api/pud/orders/status", { token })')) throw new Error("Status token must be sent in a JSON request body.");
if (/apiUrl\([^\n]*(?:token|clientSecret|setupIntentClientSecret)/.test(apiJs + statusJs)) throw new Error("Tokens or client secrets must not enter an API URL.");
if (!statusJs.includes("PUD_VERSION_CONFLICT") || !statusJs.includes("await refresh()")) throw new Error("Status actions must recover version conflicts with a server refresh.");
if (!statusJs.includes("actionInFlight") || !claimsJs.includes("submitting") || !bookingJs.includes("submissionInFlight")) {
  throw new Error("Booking and private actions need double-submit protection.");
}

for (const scope of ["cancel", "reschedule", "payment-method", "tip", "recurring-create", "preferences"]) {
  if (!statusJs.includes(`stableActionKey("${scope}"`)) throw new Error(`Stable action key missing: ${scope}`);
}
for (const purpose of [
  "cancel_order", "reschedule_order", "payment_session", "replace_payment_method", "reorder", "add_tip",
  "open_claim", "create_recurring", "pause_recurring", "skip_recurring", "resume_recurring",
  "update_preferences", "rotate_status_token", "revoke_status_token",
  "upload_claim_evidence",
]) {
  if (!statusJs.includes(`"${purpose}"`)) throw new Error(`Protected action is missing a purpose-bound capability: ${purpose}`);
}
for (const marker of ["createStatusSession", "issueActionCapability", "verifiedSession", "sessionExpiryTimer", "PUD_STATUS_SESSION_INVALID"]) {
  if (!statusJs.includes(marker)) throw new Error(`In-memory step-up marker missing: ${marker}`);
}
for (const marker of ["pendingRotation", "pending.actionCapability", "error?.status !== 0"]) {
  if (!statusJs.includes(marker)) throw new Error(`Rotation response-loss recovery missing: ${marker}`);
}
if (/\b(?:localStorage|sessionStorage)\b/.test(statusJs)) {
  throw new Error("Status page must keep its status token, phone proof, and verified session out of browser storage.");
}
if (!claimCapabilityJs.includes("sessionStorage.setItem") || !claimCapabilityJs.includes("sessionStorage.removeItem")) {
  throw new Error("Claim capability handoff must use one-time session storage.");
}
if (!claimCapabilityJs.includes("getOrCreateClaimAttemptId") || !claimsJs.includes('stableActionKey("claim", attemptId)')) {
  throw new Error("Claim retry identity must remain stable across capability/session renewal.");
}
if (!preferenceAttemptJs.includes("getOrCreatePreferenceAttemptId") || !preferenceAttemptJs.includes("sessionStorage.setItem")) {
  throw new Error("Preference retry identity must remain stable across capability/session renewal.");
}
if (/statusSession|phoneProof|statusToken|actionCapability|detergent|softenerPref|specialInstructions/.test(preferenceAttemptJs.replace(/\*[^]*?\*\//g, ""))) {
  throw new Error("Preference attempt storage must contain no credential or preference value.");
}
for (const forbidden of ["statusSession", "phoneProof", "statusToken"]) {
  const persisted = new RegExp(`sessionStorage\\.setItem\\([^\\n]+${forbidden}`, "i");
  if (persisted.test(claimCapabilityJs + claimsJs)) throw new Error(`${forbidden} must not be persisted during claim navigation.`);
}
if (!claimsJs.includes("takeClaimCapabilities") || !claimsJs.includes("createClaim(token, capabilities.claimActionCapability")) {
  throw new Error("Claim page must consume the purpose-bound capabilities and send the claim capability with the in-memory status token.");
}
for (const marker of [
  "Array.from({ length: 5 }", "issueClaimEvidenceCapability", "evidenceCapabilities",
  "validateClaimEvidenceFiles", "prepareClaimEvidence", "createClaimEvidenceGrant",
  "uploadClaimEvidence", "claimEvidenceReference", "evidence: uploadedEvidence",
]) {
  if (!statusJs.includes(marker) && !claimsJs.includes(marker) && !claimEvidenceJs.includes(marker)) {
    throw new Error(`Claim evidence integration missing: ${marker}`);
  }
}
if (!claimsJs.includes("uploadedEvidence = await uploadEvidenceFiles(evidenceFiles)")) {
  throw new Error("Evidence must finish before the single idempotent claim request.");
}
if (!claimsJs.includes("!uploadedEvidence.length") || !claimsJs.includes("same in-memory references will be reused")) {
  throw new Error("A claim retry must reuse finalized evidence references without duplicate uploads.");
}
if (!claimsJs.includes("!error?.retryable") || !claimsJs.includes("evidence: uploadedEvidence")) {
  throw new Error("Retryable claim failures must retain the same in-memory evidence references.");
}
if (!claimsJs.includes("pendingClaimInput = Object.freeze") || !claimsJs.includes("...pendingClaimInput")) {
  throw new Error("An ambiguous claim retry must also reuse the exact original claim fields.");
}
if (!claimEvidenceJs.includes('digest("SHA-256"') || !claimEvidenceJs.includes("CLAIM_EVIDENCE_MAX_BYTES") ||
    !claimEvidenceJs.includes("CLAIM_EVIDENCE_MAX_FILES")) {
  throw new Error("Claim evidence needs client-side hashing and count/size bounds before network use.");
}
for (const marker of ["portalHistory", "updatePreferences", "renderPortalDetails", "renderPreferences", "prior.nextCursor", "append: true"]) {
  if (!statusJs.includes(marker)) throw new Error(`Verified portal integration missing: ${marker}`);
}
for (const marker of ["loyaltySummary", "loadLoyaltySummary", "renderLoyaltySummary", "clearLoyaltySummary", "loyaltyEnabled"]) {
  if (!statusJs.includes(marker)) throw new Error(`Verified loyalty portal integration missing: ${marker}`);
}
if (!statusJs.includes('addEventListener("pagehide", clearMemoryCredentials);') ||
    !statusJs.includes("clearVerifiedSession();") || !statusJs.includes("clearLoyaltySummary();")) {
  throw new Error("Verified loyalty data must be cleared on every page exit and credential reset.");
}
for (const marker of ['option[data-pud-dynamic]', '[data-preferences-source]', '[data-preferences-note]']) {
  if (!statusJs.includes(marker)) throw new Error(`Expired portal preference DOM cleanup missing: ${marker}`);
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
const attributionPreparation = siteAnalyticsJs.indexOf("providerLocationSafe = prepareAttributionQueryForProviders();");
const analyticsInit = siteAnalyticsJs.indexOf("function init() {");
const initializationPreparation = siteAnalyticsJs.indexOf("prepareProviderLocation();", analyticsInit);
const optionalInitialization = siteAnalyticsJs.indexOf("initOptionalAnalytics();", analyticsInit);
if (attributionPreparation < 0 || initializationPreparation < analyticsInit || initializationPreparation > optionalInitialization) {
  throw new Error("Allowlisted attribution must be captured and scrubbed before provider SDK bootstrap.");
}
const providerUrlSuppression = "if (window.location.search || window.location.hash) return null;";
if (!siteAnalyticsJs.includes(providerUrlSuppression)) {
  throw new Error("Analytics providers must be suppressed before loading on an unscrubbed query or fragment.");
}
const siteAnalyticsWithoutSuppressionGuard = siteAnalyticsJs.replace(providerUrlSuppression, "");
if (siteAnalyticsWithoutSuppressionGuard.includes("window.location.href") || siteAnalyticsWithoutSuppressionGuard.includes("window.location.hash")) {
  throw new Error("Analytics must never receive URL fragments or a raw browser URL.");
}
if (!contractJs.includes('"waitlistContinuationToken"') || !paymentJs.includes("waitlistContinuationToken ?")) {
  throw new Error("Waitlist continuation token must be an optional payment-setup contract field.");
}
if (/trackFunnel\([^)]*waitlistContinuation/i.test(bookingJs)) {
  throw new Error("Waitlist continuation tokens must never enter analytics.");
}
if (!contractJs.includes('["token", "actionCapability", "cadence", "preferredRouteRule"') || contractJs.includes('["token", "addressId", "cadence"')) {
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

const { requestJson, requestRaw } = await import("../assets/js/pud-api.js");
let rawUploadOptions;
globalThis.fetch = async (_url, options) => {
  rawUploadOptions = options;
  return new Response(JSON.stringify({
    ok: true,
    data: {
      assetId: "asset_reference_1234",
      sha256: "a".repeat(64),
      mimeType: "image/png",
      byteSize: 3,
      retentionUntil: "2027-07-15T00:00:00Z",
    },
  }), { status: 201, headers: { "content-type": "application/json" } });
};
const rawBytes = new Uint8Array([1, 2, 3]);
await requestRaw("/api/pud/orders/claim-evidence/upload", {
  body: rawBytes,
  contentType: "image/png",
  headers: { "x-pud-upload-grant": "upload-grant-at-least-sixteen" },
  timeoutMs: 100,
});
if (rawUploadOptions?.credentials !== "omit" || rawUploadOptions?.cache !== "no-store" ||
    rawUploadOptions?.referrerPolicy !== "no-referrer" || rawUploadOptions?.body !== rawBytes ||
    rawUploadOptions?.headers?.["x-pud-upload-grant"] !== "upload-grant-at-least-sixteen") {
  throw new Error("Raw evidence upload did not preserve the private request policy, grant header, and exact bytes.");
}
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
