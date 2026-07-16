import {
  analyticsPageKey,
  classifyCta,
  isPrivateAnalyticsPath,
  navigationType,
  providerSafeRoute,
  safeProviderEvent,
  trackProductEvent,
} from "./pud-product-analytics.js";
import { prepareAttributionQueryForProviders } from "./pud-attribution.js";
import { translateText } from "./site-i18n.js";

(() => {
  const canTrack =
    window.location &&
    (window.location.protocol === "https:" || window.location.protocol === "http:");

  if (!canTrack) {
    return;
  }

  const GA_MEASUREMENT_ID = "G-W0E4GHV24B";
  const GOOGLE_ADS_ID = "AW-18256973572";
  const GOOGLE_ADS_SIGNUP_SEND_TO = "AW-18256973572/JyFnCPXZx8IcEISezYFE";
  const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  const META_PIXEL_ID = "1554256442781789";
  const META_SRC = "https://connect.facebook.net/en_US/fbevents.js";
  const META_LEAD_STORAGE_PREFIX = "snappyMetaLeadFired";
  const META_LEAD_CONTENT_NAME = "Snappy Promo Coupon Claim";
  const COOKIE_CONSENT_STORAGE_KEY = "snappyCookieConsent:v1";
  const COOKIE_CONSENT_ACCEPTED = "accepted";
  const COOKIE_CONSENT_DECLINED = "declined";
  const PENDING_META_LEAD_KEY = "snappyPendingMetaLead:v1";

let initialized = false;
let optionalAnalyticsStarted = false;
let ctaTrackingAttached = false;
let providerLocationPrepared = false;
let providerLocationSafe = false;

function prepareProviderLocation() {
  if (providerLocationPrepared) return;
  providerLocationSafe = prepareAttributionQueryForProviders();
  providerLocationPrepared = true;
}

function providerSafeContext() {
  if (isPrivateAnalyticsPath() || !providerLocationPrepared || !providerLocationSafe) return null;
  // Provider SDKs can inspect document.location independently of our event
  // fields. Safe campaign queries are captured and removed before this point;
  // unknown, sensitive, or fragment-bearing locations stay blocked.
  if (window.location.search || window.location.hash) return null;
  return providerSafeRoute();
}

function browserStorage(name) {
  try {
    return window[name];
  } catch (_error) {
    return null;
  }
}

function storageGet(storage, key) {
  if (!storage) return "";
  try {
    return storage.getItem(key) || "";
  } catch (_error) {
    return "";
  }
}

function storageSet(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (_error) {
    // Storage may be unavailable in private browsing or strict privacy modes.
  }
}

function storageRemove(storage, key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (_error) {
    // Storage may be unavailable in private browsing or strict privacy modes.
  }
}

function cookieConsentValue() {
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");
  return (
    storageGet(localStore, COOKIE_CONSENT_STORAGE_KEY) ||
    storageGet(sessionStore, COOKIE_CONSENT_STORAGE_KEY)
  );
}

function hasOptionalCookieConsent() {
  return cookieConsentValue() === COOKIE_CONSENT_ACCEPTED;
}

function hasCookieConsentChoice() {
  const value = cookieConsentValue();
  return value === COOKIE_CONSENT_ACCEPTED || value === COOKIE_CONSENT_DECLINED;
}

function setCookieConsent(value) {
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");
  storageSet(localStore, COOKIE_CONSENT_STORAGE_KEY, value);
  storageSet(sessionStore, COOKIE_CONSENT_STORAGE_KEY, value);
}

function analyticsCookieNames() {
  const names = new Set(["_ga", "_gid", "_gat", "_gcl_au", "_fbp", "_fbc"]);
  String(document.cookie || "")
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter((name) => /^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gcl_|_fb[pc]$)/.test(name || ""))
    .forEach((name) => names.add(name));
  return names;
}

function expireAnalyticsCookies() {
  const hostname = String(window.location?.hostname || "").trim();
  const domains = new Set(["", hostname, ".snappycoinlaundry.com"]);
  const secure = window.location?.protocol === "https:" ? "; Secure" : "";
  analyticsCookieNames().forEach((name) => {
    domains.forEach((domain) => {
      const domainAttribute = domain ? `; domain=${domain}` : "";
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domainAttribute}; SameSite=Lax${secure}`;
    });
  });
}

function revokeOptionalAnalytics() {
  initialized = false;
  optionalAnalyticsStarted = false;
  storageRemove(browserStorage("sessionStorage"), PENDING_META_LEAD_KEY);

  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
  if (typeof window.fbq === "function") {
    window.fbq("consent", "revoke");
  }
  expireAnalyticsCookies();
}

function removeCookieBanner() {
  const banner = document.querySelector(".cookie-consent-banner");
  if (banner && typeof banner.remove === "function") {
    banner.remove();
  }
}

function renderCookieBanner(force = false) {
  if ((!force && hasCookieConsentChoice()) || document.querySelector(".cookie-consent-banner")) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "cookie-consent-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-label", translateText("Cookie consent"));
  banner.innerHTML = `
    <div class="cookie-consent-copy">
      <strong>${translateText("Cookie choices")}</strong>
      <p>
        ${translateText("Optional analytics help us measure visits and promo claims. Essential tools work either way.")}
        <a href="/cookies.html">${translateText("Cookie details")}</a>
      </p>
    </div>
    <div class="cookie-consent-actions">
      <button class="cookie-consent-button secondary" type="button" data-cookie-consent="decline">${translateText("Decline")}</button>
      <button class="cookie-consent-button primary" type="button" data-cookie-consent="accept">${translateText("Accept")}</button>
    </div>
  `;

  const accept = banner.querySelector("[data-cookie-consent='accept']");
  const decline = banner.querySelector("[data-cookie-consent='decline']");
  if (accept) {
    accept.addEventListener("click", () => {
      setCookieConsent(COOKIE_CONSENT_ACCEPTED);
      removeCookieBanner();
      initOptionalAnalytics();
    });
  }
  if (decline) {
    decline.addEventListener("click", () => {
      const reloadRequired = hasOptionalCookieConsent() || optionalAnalyticsStarted;
      setCookieConsent(COOKIE_CONSENT_DECLINED);
      revokeOptionalAnalytics();
      removeCookieBanner();
      if (reloadRequired && typeof window.location?.reload === "function") {
        window.location.reload();
      }
    });
  }

  document.body.appendChild(banner);
}

function bootstrapMetaPixel() {
  if (!hasOptionalCookieConsent()) {
    return;
  }

  const route = providerSafeContext();
  if (!route) return;

  if (window.__SNAPPY_META_PIXEL_INITIALIZED__) {
    return;
  }

  window.__SNAPPY_META_PIXEL_INITIALIZED__ = true;

  if (typeof window.fbq !== "function") {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
  }

  const existing = document.querySelector(`script[src="${META_SRC}"]`);
  if (!existing) {
    const script = document.createElement("script");
    script.async = true;
    script.src = META_SRC;
    script.referrerPolicy = "no-referrer";
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  window.fbq("init", META_PIXEL_ID);
  window.fbq("trackCustom", "SitePageViewed", {
    page_key: route.pageKey,
    page_path: route.pagePath,
  });
}

function trackMetaLead() {
  if (!hasOptionalCookieConsent()) return false;
  if (!providerSafeContext()) return false;
  if (typeof window.fbq !== "function") bootstrapMetaPixel();
  if (typeof window.fbq !== "function") return false;
  window.fbq("track", "Lead", {
    content_name: META_LEAD_CONTENT_NAME
  });
  return true;
}

function trackGoogleAdsSignupConversion() {
  if (!hasOptionalCookieConsent()) return false;
  if (!providerSafeContext()) return false;

  const sendConversion = () => {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "conversion", {
      send_to: GOOGLE_ADS_SIGNUP_SEND_TO,
      value: 1.0,
      currency: "USD"
    });
  };

  if (typeof window.gtag === "function") {
    sendConversion();
    return true;
  }

  bootstrapGtag()
    .then(sendConversion)
    .catch(() => {});
  return true;
}

function claimSuccessTrackingTarget(details = {}) {
  const promotionSlug = String(details.promotionSlug || "promo").trim() || "promo";
  const stableClaimId = String(
    details.claimId ||
      details.couponClaimId ||
      details.redemptionId ||
      details.successId ||
      ""
  ).trim();

  if (stableClaimId) {
    return {
      durable: true,
      key: `${META_LEAD_STORAGE_PREFIX}:${promotionSlug}:claim:${stableClaimId}`
    };
  }

  const successMarker = String(details.successMarker || "coupon-claim-success").trim();
  return {
    durable: false,
    key: `${META_LEAD_STORAGE_PREFIX}:${promotionSlug}:success:${successMarker}`
  };
}

function pendingCouponClaimDetails(details = {}) {
  const promotionSlug = String(details.promotionSlug || "promo").trim() || "promo";
  const claimId = String(
    details.claimId ||
      details.couponClaimId ||
      details.redemptionId ||
      details.successId ||
      ""
  ).trim();
  return {
    promotionSlug,
    claimId,
    successMarker: String(details.successMarker || "coupon-claim-success").trim()
  };
}

function storePendingCouponClaimSuccess(details) {
  const sessionStore = browserStorage("sessionStorage");
  storageSet(sessionStore, PENDING_META_LEAD_KEY, JSON.stringify(pendingCouponClaimDetails(details)));
}

function processPendingCouponClaimSuccess() {
  if (!hasOptionalCookieConsent()) return;
  const sessionStore = browserStorage("sessionStorage");
  const pending = storageGet(sessionStore, PENDING_META_LEAD_KEY);
  if (!pending) return;

  storageRemove(sessionStore, PENDING_META_LEAD_KEY);
  try {
    const parsed = JSON.parse(pending);
    if (parsed && typeof parsed === "object") {
      trackCouponClaimSuccess(parsed);
    }
  } catch (_error) {
    // Ignore malformed pending tracking data.
  }
}

function trackCouponClaimSuccess(details = {}) {
  const target = claimSuccessTrackingTarget(details);
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");
  const alreadyTracked =
    storageGet(sessionStore, target.key) === "1" ||
    (target.durable && storageGet(localStore, target.key) === "1");

  if (alreadyTracked) return false;

  if (!hasOptionalCookieConsent()) {
    if (!hasCookieConsentChoice()) storePendingCouponClaimSuccess(details);
    return false;
  }

  const metaTracked = trackMetaLead();
  const googleAdsTracked = trackGoogleAdsSignupConversion();

  if (!metaTracked && !googleAdsTracked) return false;

  storageSet(sessionStore, target.key, "1");
  if (target.durable) storageSet(localStore, target.key, "1");
  return true;
}

window.SnappyAnalytics = {
  ...(window.SnappyAnalytics || {}),
  trackMetaLead,
  trackGoogleAdsSignupConversion,
  trackCouponClaimSuccess,
  hasOptionalCookieConsent,
  trackEvent,
};

function bootstrapGtag() {
  if (!providerSafeContext()) return Promise.resolve();
  if (typeof window.gtag === "function") {
    return Promise.resolve();
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = GA_SRC;
    script.referrerPolicy = "no-referrer";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load GA script"));
    document.head.appendChild(script);
  });
}

function initGoogleAnalytics() {
  const route = providerSafeContext();
  if (!route) {
    initialized = false;
    return Promise.resolve();
  }
  return bootstrapGtag()
    .then(() => {
      if (!hasOptionalCookieConsent()) {
        initialized = false;
        return;
      }
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        send_page_view: false,
        page_location: route.pagePath,
        page_path: route.pagePath,
      });
      window.gtag("config", GOOGLE_ADS_ID, { send_page_view: false });
      initialized = true;
    })
    .catch(() => {
      initialized = false;
    });
}

function trackEvent(name, params = {}) {
  if (!hasOptionalCookieConsent() || !analyticsPageKey()) return false;

  void trackProductEvent(name, params, { consent: true });

  if (!initialized || !providerSafeContext()) return true;

  let providerEvent;
  try { providerEvent = safeProviderEvent(name, params); }
  catch (_error) { return false; }

  if (typeof window.gtag === "function") {
    window.gtag("event", providerEvent.name, providerEvent.parameters);
  }
  return true;
}

function trackCtaClicks() {
  if (ctaTrackingAttached) return;
  ctaTrackingAttached = true;
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("a.button, .btn-cta");
    if (!target) return;

    trackEvent("cta_clicked", classifyCta(target));
  });
}

async function initOptionalAnalytics() {
  if (optionalAnalyticsStarted || !hasOptionalCookieConsent()) {
    return;
  }

  optionalAnalyticsStarted = true;
  if (providerSafeContext()) {
    bootstrapMetaPixel();
    // Firebase Analytics automatically observes the live document URL. The
    // explicit GA path below is used instead so route-only fields are provable.
    await initGoogleAnalytics();
  }

  trackCtaClicks();
  trackEvent("site_page_viewed", { navigationType: navigationType() });
  processPendingCouponClaimSuccess();
}

function init() {
  prepareProviderLocation();
  renderCookieBanner();
  document.querySelectorAll("[data-cookie-preferences]").forEach((button) => {
    button.addEventListener("click", () => renderCookieBanner(true));
  });
  initOptionalAnalytics();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();
