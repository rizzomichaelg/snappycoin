(() => {
  const canTrack =
    window.location &&
    (window.location.protocol === "https:" || window.location.protocol === "http:");

  if (!canTrack) {
    return;
  }

  const GA_MEASUREMENT_ID = "G-W0E4GHV24B";
  const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  const META_PIXEL_ID = "1554256442781789";
  const META_SRC = "https://connect.facebook.net/en_US/fbevents.js";
  const META_LEAD_STORAGE_PREFIX = "snappyMetaLeadFired";
  const META_LEAD_CONTENT_NAME = "Snappy Promo Coupon Claim";

let initialized = false;
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

  window.fbq("init", META_PIXEL_ID);
  window.fbq("track", "PageView");
}

function trackMetaLead() {
  if (typeof window.fbq !== "function") return false;
  window.fbq("track", "Lead", {
    content_name: META_LEAD_CONTENT_NAME
  });
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

  if (!trackMetaLead()) return false;

  storageSet(sessionStore, target.key, "1");
  if (target.durable) storageSet(localStore, target.key, "1");
  return true;
}

window.SnappyAnalytics = {
  ...(window.SnappyAnalytics || {}),
  trackMetaLead,
  trackCouponClaimSuccess
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
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest(".btn-cta");
    if (!target) return;

    trackEvent("cta_click", {
      link_text: (target.textContent || "").trim(),
      link_href: target.getAttribute("href") || "",
    });
  });
}

async function init() {
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
    page_location: window.location.href,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
})();
