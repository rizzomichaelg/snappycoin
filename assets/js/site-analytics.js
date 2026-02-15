const GA_MEASUREMENT_ID = "G-W0E4GHV24B";
const GA_SRC = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

let initialized = false;
let usingFirebase = false;
let firebaseTrack = null;

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
