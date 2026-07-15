# Public Site Security Headers

The public site is currently static HTML on GitHub Pages. Static meta CSP tags are included in `index.html` and the promo redirect page as a minimum browser-enforced baseline.

## Current CSP Baseline

- `default-src 'self'`
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- `script-src 'self' https://challenges.cloudflare.com https://connect.facebook.net https://www.googletagmanager.com https://googleads.g.doubleclick.net`
- `frame-src https://challenges.cloudflare.com https://www.google.com`
- `connect-src 'self' https://api.snappycoinlaundry.com https://api-staging.snappycoinlaundry.com https://dexterlive-status.snappycoinlaundry.workers.dev https://www.facebook.com https://www.google-analytics.com https://region1.google-analytics.com https://www.google.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://stats.g.doubleclick.net`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src https://fonts.gstatic.com`

`style-src 'unsafe-inline'` remains only because the site still has legacy inline and Google font CSS patterns. Do not add inline JavaScript.

## Third-Party Scripts

Cloudflare Turnstile is used by the promo form, pickup booking, and private-status phone step-up. It cannot be pinned with Subresource Integrity because Cloudflare serves a changing challenge script. Keep it limited through `script-src`, `connect-src`, and `frame-src`. The private status page separately permits Stripe.js for payment remediation and does not load analytics.

Private status and claim pages use `no-referrer`, `noindex`, and `no-store` metadata. The status token remains in the private status-link fragment and is never copied into Web Storage. A verified phone proof, status session, portal history, saved-preference view, and loyalty summary remain in JavaScript/page memory only and are cleared on expiry, link rotation or revocation, and page exit.

Claim navigation is the narrow credential exception: one short-lived `open_claim` capability and no more than five short-lived `upload_claim_evidence` capabilities cross the same-tab navigation in `sessionStorage`. Each is already purpose-bound, and the claim module removes the complete bundle during initialization, before any submission. The status token fragment is also removed immediately on the claim page. The bundle contains only those action capabilities, their expiries, and a random attempt ID—never the status token, status session, phone proof, customer data, or form values. The optional claim picker accepts at most five JPEG, PNG, or PDF files of at most 5 MB each. The browser hashes each file, the backend quarantines/scans/sanitizes it, and only returned immutable `{assetId, sha256, mimeType}` references are included in the single idempotent claim request. Those references remain page-memory-only and are reused without re-upload after an ambiguous claim response. If an upload fails, the frontend does not open a claim and does not imply that evidence was attached.

Non-secret random claim and preference attempt IDs may remain in same-tab storage for up to 24 hours so an authorized retry keeps the original idempotency identity; they contain no token, session, proof, capability, customer data, form value, evidence reference, or preference value.

Promo runtime config should stay in same-origin JavaScript or data attributes. The current page loads `assets/js/promo-config.js` before Turnstile and the signup script so production hosts use the production API while local/non-production hosts use staging. Do not add inline JavaScript.

## Self-Hosting Plan

The legacy jQuery dependency has been replaced with native DOM APIs so the public page no longer depends on the jQuery CDN. If new third-party scripts are added later, prefer self-hosting or SRI-pinned assets.

If the site moves behind Cloudflare Pages or a Worker, migrate the meta CSP into real HTTP response headers and add `frame-ancestors 'none'`.
