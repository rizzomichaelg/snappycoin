# Directions chooser candidate

Branch: `directions-chooser`, based on production `913a32e213bb80ca43b68e95409e23f8b8fc6479`.
This is a branch candidate, not a production release. Do not merge or push main until the remaining gates below are satisfied and Michael confirms.

Preview: https://66fe66e3.snappycoin-promo-test.pages.dev/
Branch alias: https://directions-chooser.snappycoin-promo-test.pages.dev/

## Implementation and scope

- The hero, self-service panel and Contact Us directions links open one native dialog. Every opener has the exact Google Maps fallback URL and `aria-haspopup="dialog"`.
- The dialog is centered on desktop and becomes a bottom sheet on phones. It has a labelled heading, address, real app links, Cancel, visible focus, Escape/backdrop dismissal, focus containment and restoration.
- iPhone/iPad: Apple Maps, Google Maps, Waze. iPadOS MacIntel/touch detection is included. Android: Google Maps, Waze. Desktop: Google Maps, Apple Maps.
- The app URLs match the brief exactly. The supplied Waze coordinates are retained after the native iPhone check: their map pin matches the store listing at 2303 McKelvey Road.
- Each option click calls only `gtag('event', 'conversion', { send_to: 'AW-18256973572/dUlhCJ68nK4dEISezYFE' })` when gtag exists. It closes the dialog without preventing the link's default navigation, waiting for a callback, or navigating by script. No value, transaction ID or app name is added.
- The chooser stores no choice and accesses no cookies, local storage or session storage. An absent, blocked or throwing measurement function does not break the map links. Unsupported dialog browsers retain direct Google Maps navigation.
- `script.js` contains the chooser code; no inline script, library, CSP, tag configuration, Meta Pixel, form, Turnstile or booking-project change was made. Existing CTA analytics are preserved; the new app options do not acquire that existing `.btn-cta` tracking.

Whole-repository case-insensitive searches for `directions` and `google.com/maps` found the three marketing openers, the embedded Google map, legacy descriptions/translations, and Google Maps Platform policy links. Only the three openers were enhanced. Google controls the directions action inside the cross-origin embedded map; it is unchanged. Legacy pages and script-free cutover redirects retain their previous analytics behavior.

## Requested tests (section 5)

| Item | Result | Evidence and remaining gate |
| --- | --- | --- |
| a. Chrome + Tag Assistant, three entries, exact conversion, no conversion on open/cancel, screenshot | **Passed on preview; production pending** | Actual desktop Chrome connected to the preview via tagassistant.google.com. One app selection per entry produced three Conversion hits for AW-18256973572. Inspected hit details show label `dUlhCJ68nK4dEISezYFE`, event `conversion`, and `npa=1`. Hero open/cancel produced no Conversion. Automated tests independently check every open/cancel and all visible options. Saved a hit-details screenshot. Michael accepted preview verification as the pre-merge gate on October 29. Repeat the check on production after a separately confirmed release. |
| b. JavaScript disabled | **Passed** | Each of the three entries opened the exact Google Maps directions URL in a new tab. Also checked browsers without dialog support. |
| c. Real iPhone apps and Waze arrival point | **Passed using iPhone Mirroring** | Selecting each app from the deployed preview opened the installed native app. Apple Maps and Google Maps showed driving directions to 2303 McKelvey Rd. Waze started a route; the exact supplied coordinate pin was compared with Waze's Snappy Coin Laundry listing at 2303 McKelvey Road and matches the store location. Test navigation was stopped. The coordinate URL therefore remains unchanged. This verifies the displayed destination, not an actual drive or physical arrival. |
| d. Real Android apps | **Pending physical-device test** | Android emulation passed ordering, URLs and link navigation. Installed Google Maps/Waze handoff requires a real device. |
| e. Keyboard only | **Passed** | Tab/Enter opener, initial focus, forward/backward wrapping, Escape, and exact opener focus restoration passed. Backdrop dismissal and Cancel restoration also passed. |

## Additional validation

- All 12 Node tests passed: directions fallback/link contracts, marketing cutover, legacy endpoint and old tracking-link bridges.
- Promotion/newsletter/conversion verifier passed without changes to the forms or existing analytics. Its stylesheet cache-version assertion was advanced for the new CSS URL.
- Public baseline verified; only the three changed product-file hashes were advanced, with candidate status explicitly labelled.
- Browser audit passed locally and against the deployed preview for desktop, iPhone, iPadOS desktop UA, Android, 320px phone, and 720px zoom-equivalent viewport. Each pass exercised 45 app selections across the three entries. Every selection queued exactly one conversion with the exact payload; load/open/cancel/backdrop/Escape queued none. All controls exceeded 44px, no horizontal overflow or chooser CSP violations occurred, and no page errors occurred.
- Also passed Google-library blocked, gtag absent, gtag throwing, unsupported dialog and JavaScript-disabled scenarios. Browser-audit conversions and customer API requests were intercepted. The three manual Tag Assistant test conversions used the actual Google tag.
- Fresh production checks of `/`, `/privacy.html`, `/cookies.html`, `/terms.html` loaded both actual Google libraries with HTTP 200 and confirmed `allow_ad_personalization_signals: false` for AW-18256973572. Those checks intercepted measurement traffic and observed no conversion on load.
- Scope comparison with production confirms CSP, shared analytics, forms, availability code, all policy pages and all existing script/style behavior remain unchanged outside the chooser additions. No GA4 cross-domain linking was enabled.
- Visual inspection confirmed the desktop modal and phone sheet, including 320px width. The design detector flagged existing page typography/layout patterns outside this feature; no broad visual edits or detector suppressions were introduced.

Evidence is retained in the backend workspace at `artifacts/directions-chooser-20261029/`: local/preview reports and screenshots, production-tag preflight, scope verification, and Tag Assistant screenshot/hit-list evidence. No customer order data or order capabilities are included. Physical-device screenshots are local evidence only: some route previews include the device's starting location and must not be published with the site or committed to its public repository.

## Reproduce

```sh
node --test test/*.test.mjs
node tools/verify-promo-signup.js
node scripts/verify-public-baseline.mjs
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/directions-browser-audit.mjs
# For the deployed preview:
DIRECTIONS_AUDIT_ORIGIN=https://66fe66e3.snappycoin-promo-test.pages.dev PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/directions-browser-audit.mjs
git diff --check
```

Before main: obtain the physical Android result (or an explicit waiver) and Michael's explicit merge confirmation. The physical iPhone check is complete and Michael accepted preview Tag Assistant verification before merge. After a separately confirmed production release, repeat the Tag Assistant check on snappycoinlaundry.com. No main merge, remote Git push or production deployment has occurred for this candidate.
