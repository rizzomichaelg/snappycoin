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
let usingFirebase = false;
let firebaseTrack = null;

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

function removeCookieBanner() {
  const banner = document.querySelector(".cookie-consent-banner");
  if (banner && typeof banner.remove === "function") {
    banner.remove();
  }
}

function renderCookieBanner() {
  if (hasCookieConsentChoice() || document.querySelector(".cookie-consent-banner")) {
    return;
  }

  const banner = document.createElement("section");
  banner.className = "cookie-consent-banner";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-live", "polite");
  banner.setAttribute("aria-label", "Cookie consent");
  banner.innerHTML = `
    <div class="cookie-consent-copy">
      <strong>Cookie choices</strong>
      <p>
        We use optional analytics and advertising cookies to measure visits and promo claims.
        Essential security and form tools still run either way.
        <a href="cookies.html">Cookie Statement</a>
      </p>
    </div>
    <div class="cookie-consent-actions">
      <button class="cookie-consent-button secondary" type="button" data-cookie-consent="decline">Decline optional</button>
      <button class="cookie-consent-button primary" type="button" data-cookie-consent="accept">Accept optional cookies</button>
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
      setCookieConsent(COOKIE_CONSENT_DECLINED);
      removeCookieBanner();
    });
  }

  document.body.appendChild(banner);
}

function bootstrapMetaPixel() {
  if (!hasOptionalCookieConsent()) {
    return;
  }

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
    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

function trackMetaLead() {
  if (!hasOptionalCookieConsent()) return false;
  if (typeof window.fbq !== "function") bootstrapMetaPixel();
  if (typeof window.fbq !== "function") return false;
  window.fbq("track", "Lead", {
    content_name: META_LEAD_CONTENT_NAME
  });
  return true;
}

function trackGoogleAdsSignupConversion() {
  if (!hasOptionalCookieConsent()) return false;

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
  hasOptionalCookieConsent
};

function bootstrapGtag() {
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
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load GA script"));
    document.head.appendChild(script);
  });
}

function initGoogleAnalytics() {
  return bootstrapGtag()
    .then(() => {
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID);
      window.gtag("config", GOOGLE_ADS_ID);
      initialized = true;
    })
    .catch(() => {
      initialized = false;
    });
}

async function tryInitFirebase() {
  const cfg = window.__SNAPPY_ANALYTICS_CONFIG__;
  if (!cfg || !cfg.apiKey || !cfg.appId || !cfg.projectId) {
    return false;
  }

  try {
    const appMod = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js");
    const analyticsMod = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js");
    const app = appMod.initializeApp(cfg);
    const analytics = analyticsMod.getAnalytics(app);
    firebaseTrack = (name, params) => analyticsMod.logEvent(analytics, name, params);
    usingFirebase = true;
    initialized = true;
    return true;
  } catch (_err) {
    return false;
  }
}

function trackEvent(name, params = {}) {
  if (!initialized) return;

  if (usingFirebase && typeof firebaseTrack === "function") {
    firebaseTrack(name, params);
    return;
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

function trackCtaClicks() {
  if (ctaTrackingAttached) return;
  ctaTrackingAttached = true;
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest(".btn-cta");
    if (!target) return;

    trackEvent("cta_click", {
      link_text: (target.textContent || "").trim(),
      link_href: target.getAttribute("href") || "",
    });
  });
}

async function initOptionalAnalytics() {
  if (optionalAnalyticsStarted || !hasOptionalCookieConsent()) {
    return;
  }

  optionalAnalyticsStarted = true;
  bootstrapMetaPixel();

  const firebaseConfigured = await tryInitFirebase();
  if (!firebaseConfigured) {
    await initGoogleAnalytics();
  }

  if (!initialized) {
    return;
  }

  trackCtaClicks();
  trackEvent("page_view", {
    page_title: document.title,
    page_location: `${window.location.origin}${window.location.pathname}${window.location.search}`,
  });
  processPendingCouponClaimSuccess();
}

function init() {
  renderCookieBanner();
  initOptionalAnalytics();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();
