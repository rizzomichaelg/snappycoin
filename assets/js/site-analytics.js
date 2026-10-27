(() => {
  const canTrack =
    window.location &&
    (window.location.protocol === "https:" || window.location.protocol === "http:");

  if (!canTrack) {
    return;
  }

  if (window.__SNAPPY_MARKETING_ANALYTICS_STARTED__) return;
  window.__SNAPPY_MARKETING_ANALYTICS_STARTED__ = true;

  const GA_MEASUREMENT_ID = "G-7RE3YVW1DR";
  const GOOGLE_ADS_ID = "AW-18256973572";
  const GOOGLE_ADS_SIGNUP_SEND_TO = "AW-18256973572/JyFnCPXZx8IcEISezYFE";
  const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  const META_PIXEL_ID = "1554256442781789";
  const META_SRC = "https://connect.facebook.net/en_US/fbevents.js";
  const META_LEAD_STORAGE_PREFIX = "snappyMetaLeadFired";
  const META_LEAD_CONTENT_NAME = "Snappy Promo Coupon Claim";

let initialized = false;
let analyticsStarted = false;
let ctaTrackingAttached = false;

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

function bootstrapMetaPixel() {
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

  // Do not enable automatic form-event collection or advanced matching.
  window.fbq("set", "autoConfig", false, META_PIXEL_ID);
  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

function trackMetaLead() {
  if (typeof window.fbq !== "function") bootstrapMetaPixel();
  if (typeof window.fbq !== "function") return false;
  window.fbq("track", "Lead", {
    content_name: META_LEAD_CONTENT_NAME
  });
  return true;
}

function trackGoogleAdsSignupConversion() {

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

function trackCouponClaimSuccess(details = {}) {
  const target = claimSuccessTrackingTarget(details);
  const localStore = browserStorage("localStorage");
  const sessionStore = browserStorage("sessionStorage");
  const alreadyTracked =
    storageGet(sessionStore, target.key) === "1" ||
    (target.durable && storageGet(localStore, target.key) === "1");

  if (alreadyTracked) return false;

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
  trackCouponClaimSuccess
};

function bootstrapGtag() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  if (!document.querySelector(`script[src="${GA_SRC}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = GA_SRC;
    document.head.appendChild(script);
  }
  // Queue configuration before the asynchronous library arrives.
  return Promise.resolve();
}

function initGoogleAnalytics() {
  return bootstrapGtag()
    .then(() => {
      window.gtag("js", new Date());
      const measurementOptions = {
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: publicPageUrl(window.location.href),
        page_referrer: publicPageUrl(document.referrer)
      };
      window.gtag("config", GA_MEASUREMENT_ID, measurementOptions);
      window.gtag("config", GOOGLE_ADS_ID, measurementOptions);
      initialized = true;
    })
    .catch(() => {
      initialized = false;
    });
}

function trackEvent(name, params = {}) {
  if (!initialized) return;

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

function publicPageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin + url.pathname : "";
  } catch {
    return "";
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
      link_href: publicPageUrl(new URL(target.getAttribute("href") || "", window.location.href).href),
    });
  });
}

async function initAnalytics() {
  if (analyticsStarted) {
    return;
  }

  analyticsStarted = true;
  bootstrapMetaPixel();

  await initGoogleAnalytics();

  if (!initialized) {
    return;
  }

  trackCtaClicks();
}

function init() {
  // Marketing-site notice: tags load on every HTTP(S) page, independently of prior choices.
  initAnalytics();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();
