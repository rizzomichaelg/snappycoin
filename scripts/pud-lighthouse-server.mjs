import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const status = {
  orderNumber: "PUD-LIGHTHOUSE-12345678901234567890",
  version: 1,
  fulfillmentStatus: "confirmed",
  paymentStatus: "succeeded",
  totalCents: 4000,
  refundedCents: 0,
  receipt: {
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
  },
  paymentAttentionRequired: false,
  operationalAttentionRequired: false,
  canCancel: true,
  canTip: false,
  canClaim: false,
  canCreateRecurring: false,
  canSubmitFeedback: false,
  feedbackSubmitted: false,
  locale: "en-US",
  timezone: "America/Chicago",
  currency: "USD",
  recurringDefaults: null,
  rescheduleOptions: [],
  recurringSchedules: [],
  updatedAt: "2026-07-25T18:00:00Z"
};
const config = {
  publicEnabled: true,
  productAnalyticsEnabled: false,
  productExperimentEnabled: false,
  bookingEnabled: true,
  statusRecoveryEnabled: true,
  feedbackEnabled: false,
  recurringEnabled: false,
  tipsEnabled: false,
  promotionsEnabled: false,
  referralsEnabled: false,
  claimsEnabled: false,
  loyaltyEnabled: false,
  claimEvidenceEnabled: false,
  supportedLocales: ["en-US"],
  defaultLocale: "en-US",
  currency: "USD",
  support: { email: "support@snappycoinlaundry.com", phone: "+13146281001" },
  stripePublishableKey: null,
  turnstileSiteKey: "",
  timezone: "America/Chicago",
  pricing: { pricePerLbCents: 199, minimumCents: 3500, deliveryFeeCents: 0, version: "audit-v1" },
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

const staticServer = createServer(async (request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1:5500");
  const relative = url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
  const file = resolve(root, `.${decodeURIComponent(relative)}`);
  if (file !== root && !file.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const source = await readFile(file);
    const body = url.pathname === "/assets/js/pud-config.js"
      ? source.toString("utf8").replace("http://127.0.0.1:8787", "http://127.0.0.1:8788")
      : source;
    response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

const apiServer = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1:8788");
  const body = url.pathname === "/api/pud/public-config"
    ? { ok: true, data: config }
    : url.pathname === "/api/pud/orders/status"
      ? { ok: true, data: status }
      : { ok: false, error: { code: "AUDIT_NOT_MOCKED", message: "Audit route not mocked." } };
  response.writeHead(body.ok ? 200 : 503, {
    "access-control-allow-origin": "http://127.0.0.1:5500",
    "content-type": "application/json",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(body));
});

await Promise.all([
  new Promise((resolveReady, reject) => staticServer.once("error", reject).listen(5500, "127.0.0.1", resolveReady)),
  new Promise((resolveReady, reject) => apiServer.once("error", reject).listen(8788, "127.0.0.1", resolveReady))
]);
console.log("PUD Lighthouse fixtures listening on http://127.0.0.1:5500 and http://127.0.0.1:8788");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    staticServer.close();
    apiServer.close();
  });
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
