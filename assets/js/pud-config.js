const productionHost = /^(www\.)?snappycoinlaundry\.com$/i.test(window.location.hostname);
const localHost = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

export const PUD_CONFIG = Object.freeze({
  apiBase: productionHost ? "https://api.snappycoinlaundry.com" : localHost ? "http://127.0.0.1:8787" : "https://api-staging.snappycoinlaundry.com",
  environment: productionHost ? "production" : localHost ? "local" : "staging",
  storageKey: "snappyPudBookingV1",
  firstTouchKey: "snappyPudFirstTouchV1",
  reorderStorageKey: "snappyPudReorderBootstrapV1",
  claimCapabilityStorageKey: "snappyPudClaimCapabilityV1",
  claimAttemptStorageKey: "snappyPudClaimAttemptV1",
  preferenceAttemptStorageKey: "snappyPudPreferenceAttemptV1",
  bookingPath: "/pickup-delivery/",
  statusPath: "/pickup-delivery/status/",
  recoveryPath: "/pickup-delivery/recover/",
  claimPath: "/pickup-delivery/claims/",
  turnstileScript: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  stripeScript: "https://js.stripe.com/v3/",
});

export function apiUrl(path) {
  return `${PUD_CONFIG.apiBase}${path.startsWith("/") ? path : `/${path}`}`;
}
