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

Cloudflare Turnstile is the only third-party script needed by the promo form. It cannot be pinned with Subresource Integrity because Cloudflare serves a changing challenge script. Keep it limited through `script-src` and `frame-src`.

Promo runtime config should stay in same-origin JavaScript or data attributes. The current page loads `assets/js/promo-config.js` before Turnstile and the signup script so production hosts use the production API while local/non-production hosts use staging. Do not add inline JavaScript.

## Self-Hosting Plan

The legacy jQuery dependency has been replaced with native DOM APIs so the public page no longer depends on the jQuery CDN. If new third-party scripts are added later, prefer self-hosting or SRI-pinned assets.

If the site moves behind Cloudflare Pages or a Worker, migrate the meta CSP into real HTTP response headers and add `frame-ancestors 'none'`.
