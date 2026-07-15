import { PUD_CONFIG } from "./pud-config.js";

const queryFieldMap = Object.freeze({
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  utm_id: "utmId",
  gclid: "gclid",
  gbraid: "gbraid",
  wbraid: "wbraid",
  fbclid: "fbclid",
  msclkid: "msclkid",
});
const touchFields = Object.freeze([
  "utmSource", "utmMedium", "utmCampaign", "utmContent", "utmTerm", "utmId",
  "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "referrer", "landingPath",
  "currentPath", "capturedAt",
]);

function safeStorage() {
  try { return window.localStorage; } catch (_error) { return null; }
}

function snapshot() {
  const url = new URL(window.location.href);
  const referrer = document.referrer || "";
  const data = {
    landingPath: safePath(url.pathname),
    currentPath: safePath(url.pathname),
    capturedAt: new Date().toISOString(),
  };
  const referrerOrigin = safeReferrerOrigin(referrer);
  if (referrerOrigin) data.referrer = referrerOrigin;
  Object.entries(queryFieldMap).forEach(([queryKey, contractField]) => {
    const value = url.searchParams.get(queryKey);
    const normalized = safeCampaignValue(value, fieldLimit(contractField));
    if (normalized) data[contractField] = normalized;
  });
  return data;
}

export function attribution() {
  const currentTouch = snapshot();
  const storage = safeStorage();
  let firstTouch = null;
  try { firstTouch = JSON.parse(storage?.getItem(PUD_CONFIG.firstTouchKey) || "null"); } catch (_error) { /* replace */ }
  firstTouch = normalizeTouch(firstTouch);
  if (!firstTouch) {
    firstTouch = currentTouch;
    try { storage?.setItem(PUD_CONFIG.firstTouchKey, JSON.stringify(firstTouch)); } catch (_error) { /* optional */ }
  }
  return { firstTouch, currentTouch };
}

export function trackFunnel(eventName, parameters = {}) {
  const safe = Object.fromEntries(Object.entries(parameters).filter(([key, value]) => (
    !/name|email|phone|address|token|secret|client|proof/i.test(key) &&
    ["string", "number", "boolean"].includes(typeof value)
  )));
  const payload = { pud: true, ...safe };
  const analytics = window.SnappyAnalytics;
  if (typeof analytics?.hasOptionalCookieConsent !== "function" || !analytics.hasOptionalCookieConsent()) return false;
  if (typeof analytics?.trackEvent === "function") {
    analytics.trackEvent(eventName, payload);
    return true;
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, payload);
    return true;
  }
  return false;
}

export function setSelfReportedSource(target, value) {
  const source = String(value || "").trim().slice(0, 200);
  if (source) target.selfReportedSource = source;
  else delete target.selfReportedSource;
  return target;
}

function normalizeTouch(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const normalized = {};
  for (const field of touchFields) {
    const legacyQueryKey = Object.entries(queryFieldMap).find(([, contractField]) => contractField === field)?.[0];
    const item = value[field] ?? (legacyQueryKey ? value[legacyQueryKey] : undefined);
    if (typeof item !== "string" || !item.trim()) continue;
    const safe = field === "referrer"
      ? safeReferrerOrigin(item)
      : ["landingPath", "currentPath"].includes(field)
        ? safePath(item)
        : safeCampaignValue(item, fieldLimit(field));
    if (safe) normalized[field] = safe;
  }
  if (!normalized.capturedAt || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(normalized.capturedAt)) normalized.capturedAt = new Date().toISOString();
  return normalized;
}

function fieldLimit(field) {
  if (["utmSource", "utmMedium", "utmId"].includes(field)) return 200;
  if (["utmCampaign", "utmContent", "utmTerm"].includes(field)) return 300;
  if (["referrer"].includes(field)) return 2048;
  if (["landingPath", "currentPath"].includes(field)) return 1024;
  return 500;
}

function safePath(value) {
  const path = String(value || "").trim().split(/[?#]/, 1)[0];
  if (!path.startsWith("/") || path.startsWith("//") || containsSensitiveUrlMaterial(path)) return "/pickup-delivery/";
  return path.slice(0, 200);
}

function safeReferrerOrigin(value) {
  try {
    const url = new URL(String(value || ""));
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    return url.origin.slice(0, 200);
  } catch (_error) {
    return "";
  }
}

function safeCampaignValue(value, limit) {
  const normalized = String(value || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit);
  return normalized && !containsSensitiveUrlMaterial(normalized) ? normalized : "";
}

function containsSensitiveUrlMaterial(value) {
  let decoded = String(value || "");
  try { decoded = decodeURIComponent(decoded); } catch (_error) { /* inspect the source */ }
  return /(?:^|[?&#/])(?:email|e-mail|phone|mobile|name|address|token|secret|proof|code)=/i.test(decoded) ||
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(decoded);
}

function normalizeAnalyticsUi() {
  document.querySelectorAll('.cookie-consent-copy a[href="cookies.html"]').forEach((link) => {
    link.setAttribute("href", "/cookies.html");
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", normalizeAnalyticsUi, { once: true });
else normalizeAnalyticsUi();
