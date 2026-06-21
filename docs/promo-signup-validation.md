# Promo Signup Validation

The promo signup form is embedded in the main static site at `/#free-weekday-wash`.

Run the public-site verifier from the public repository root:

```sh
node tools/verify-promo-signup.js
```

This check does not send PII, does not call the network, and does not solve Turnstile. It verifies:

- `assets/js/promo-config.js` loads before Turnstile and `assets/js/promo-signup.js`.
- The form posts `claim/start` and `verify-phone` to the staging Worker when served from `localhost` or `127.0.0.1`.
- First-touch attribution persists through `localStorage` and `sessionStorage`.
- The required attribution keys are sent in the `claim/start` body.
- Meta ad attribution fields are sent when present, including `fbclid`, common Meta ad URL parameters, and `_fbp` / `_fbc` browser cookie values.
- Google Ads attribution fields are sent when present, including `gclid`, `gbraid`, `wbraid`, `gclsrc`, common ValueTrack URL parameters, and `_gcl_*` browser cookie values when optional cookies are accepted.
- Phone verification consent is separate from optional email marketing consent.
- The Turnstile site key is not hardcoded into the HTML widget.
- Duplicate claim messages are displayed as returned by the backend, without identifying whether email or phone was duplicated.

This verifier complements the live manual staging test in the backend repository's `docs/promo-manual-e2e.md`. Live SMS delivery, SMS code verification, coupon email delivery, and real duplicate-claim behavior still require a staff-owned test phone and email.
