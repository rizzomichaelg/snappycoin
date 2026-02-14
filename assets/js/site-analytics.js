function trackEvent(name, params = {}) {
  if (typeof window.SC_TRACK_EVENT === "function") {
    window.SC_TRACK_EVENT(name, params);
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

function init() {
  if (typeof window.SC_TRACK_EVENT !== "function") {
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
