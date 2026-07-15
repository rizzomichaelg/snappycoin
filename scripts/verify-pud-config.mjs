import { readFile } from "node:fs/promises";

const [source, api, status, claims, claimCapability, claimEvidence, preferenceAttempt, statusHtml, claimsHtml] = await Promise.all([
  readFile(new URL("../assets/js/pud-config.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-api.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-status.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-claims.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-claim-capability.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-claim-evidence.js", import.meta.url), "utf8"),
  readFile(new URL("../assets/js/pud-preference-attempt.js", import.meta.url), "utf8"),
  readFile(new URL("../pickup-delivery/status/index.html", import.meta.url), "utf8"),
  readFile(new URL("../pickup-delivery/claims/index.html", import.meta.url), "utf8"),
]);

for (const expected of ["https://api.snappycoinlaundry.com", "https://api-staging.snappycoinlaundry.com"]) {
  if (!source.includes(expected)) throw new Error(`Missing API environment: ${expected}`);
}
if (!source.includes('"http://127.0.0.1:8787"')) throw new Error("Missing deterministic local Worker origin.");
for (const expected of ['bookingPath: "/pickup-delivery/"', 'statusPath: "/pickup-delivery/status/"', 'claimPath: "/pickup-delivery/claims/"']) {
  if (!source.includes(expected)) throw new Error(`Missing route configuration: ${expected}`);
}
if (!claimCapability.includes("claimCapabilityStorageKey") || !claimCapability.includes("sessionStorage.removeItem") ||
    !claimCapability.includes("evidenceCapabilities.length > 5")) {
  throw new Error("One-time claim and evidence capability transit is not configured for bounded removal before use.");
}
if (!preferenceAttempt.includes("preferenceAttemptStorageKey") || !preferenceAttempt.includes("sessionStorage.removeItem")) {
  throw new Error("Preference retry identity is not configured for bounded cleanup.");
}
if (/sessionStorage\.setItem\([^\n]+(?:statusSession|phoneProof|statusToken)/i.test(claimCapability + claims)) {
  throw new Error("Status, session, and phone proof bearer values must not be persisted by the claim handoff.");
}
if (/sk_(live|test)_|pk_(live|test)_[A-Za-z0-9]{20,}/.test(source)) throw new Error("Stripe key must come from public config.");
if (/token|clientSecret|setupIntentClientSecret/i.test(source)) throw new Error("Bearer tokens and Stripe secrets do not belong in static configuration.");
if (!source.includes('return `${PUD_CONFIG.apiBase}${path.startsWith("/") ? path : `/${path}`}`;')) {
  throw new Error("apiUrl must append path-only API routes to the configured origin.");
}

for (const marker of ['credentials: "omit"', 'cache: "no-store"', 'referrerPolicy: "no-referrer"']) {
  if (!api.includes(marker)) throw new Error(`Public API fetch policy is missing ${marker}.`);
}
if (!api.includes('requestJson("/api/pud/public-config")')) throw new Error("Runtime feature and payment configuration must come from public-config.");
for (const marker of [
  '"/api/pud/loyalty"', '"/api/pud/orders/claim-evidence/capability"',
  '"/api/pud/orders/claim-evidence/grant"', '"/api/pud/orders/claim-evidence/upload"',
  '"x-pud-upload-grant"', "requestRaw",
]) {
  if (!api.includes(marker)) throw new Error(`Customer portal API integration is missing ${marker}.`);
}
if (!claimEvidence.includes('digest("SHA-256"') || !claimEvidence.includes("CLAIM_EVIDENCE_MAX_FILES")) {
  throw new Error("Evidence files must be bounded and hashed before upload.");
}
if (/apiUrl\([^\n]*(?:token|clientSecret|setupIntentClientSecret)/.test(api + status + claims)) {
  throw new Error("Private tokens or Stripe secrets must not be interpolated into API URLs.");
}
for (const [name, script, html] of [["status", status, statusHtml], ["claims", claims, claimsHtml]]) {
  if (!script.includes("history.replaceState") || script.includes("location.search")) {
    throw new Error(`${name} must normalize to a fragment-only URL without reading a query token.`);
  }
  if (!html.includes('meta name="referrer" content="no-referrer"') || html.includes("site-analytics.js")) {
    throw new Error(`${name} must be no-referrer and analytics-free.`);
  }
}

console.log("PUD config verification passed (origins, path-only API URLs, private-page policy, and runtime keys validated).");
