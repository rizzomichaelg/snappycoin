(function captureWaitlistContinuation() {
  "use strict";

  const storageKey = "snappy-pud-waitlist-continuation-v1";
  const rawFragment = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  const fragment = new URLSearchParams(rawFragment);
  const token = fragment.get("waitlistContinuation");
  const routeId = fragment.get("waitlistRoute");
  const supplied = token !== null || routeId !== null;
  let memory = null;
  let invalid = false;

  if (supplied) {
    fragment.delete("waitlistContinuation");
    fragment.delete("waitlistRoute");
    const remainder = fragment.toString();
    history.replaceState(history.state, "", `${location.pathname}${location.search}${remainder ? `#${remainder}` : ""}`);

    const validToken = typeof token === "string" && /^pud_wlc_[A-Za-z0-9_-]{60,500}$/.test(token);
    const validRoute = typeof routeId === "string" && /^[A-Za-z0-9_-]{3,200}$/.test(routeId);
    if (validToken && validRoute) {
      memory = { token, routeId };
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(memory));
      } catch (_error) {
        // Memory keeps this navigation usable when session storage is blocked.
      }
    } else {
      invalid = true;
      try { sessionStorage.removeItem(storageKey); } catch (_error) { /* already invalid in memory */ }
    }
  }

  function get() {
    if (memory) return { ...memory };
    try {
      const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (!value || typeof value.token !== "string" || typeof value.routeId !== "string" ||
          !/^pud_wlc_[A-Za-z0-9_-]{60,500}$/.test(value.token) || !/^[A-Za-z0-9_-]{3,200}$/.test(value.routeId)) {
        return null;
      }
      memory = { token: value.token, routeId: value.routeId };
      return { ...memory };
    } catch (_error) {
      return null;
    }
  }

  function clear() {
    memory = null;
    try { sessionStorage.removeItem(storageKey); } catch (_error) { /* memory is already cleared */ }
  }

  Object.defineProperty(window, "SnappyWaitlistContinuation", {
    value: Object.freeze({ get, clear, invalid }),
    configurable: false,
    enumerable: false,
    writable: false,
  });
})();
