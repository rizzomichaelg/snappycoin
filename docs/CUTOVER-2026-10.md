# October 2026 marketing cutover

Prepared locally on `cutover-2026-10` from public-site main `21d483909aec2444a4f4f6031dc702ba583aa596`. This branch is a release candidate, not a deployed cutover. Do not merge or push main until Michael/Nick explicitly says go. The preceding redesign release authorization does not authorize this later booking cutover.

## Included

- Every marketing booking and order entry points to `https://book.snappycoinlaundry.com`, with pickup priced at $30 per bag. Self-service and drop-off descriptions retain their own terms.
- Six retired entry/step/policy documents become static zero-delay redirects to the new root, each with `noindex`, a visible fallback link, and no scripts, forms, or capability forwarding. The old browser application, styles, dependencies, and obsolete tests/tooling are removed. Git retains the entire previous application for rollback.
- Robots allows crawling; the old entry is removed from the sitemap. The five existing marketing Content Security Policies are unchanged.
- Free Wash content and navigation are forcibly hidden at Michael's direction, even if the historical promotion API reports active. The newsletter moves outside that hidden section. The coupon form code, signup conversion, attribution, production/staging API selection, and Turnstile widget remain unchanged. The old ad alias returns to the homepage without advertising an ended offer.
- The shared analytics module authors one Google loader for `G-7RE3YVW1DR`, configures it and `AW-18256973572` once with personalization disabled, and lets config send the page view. Google Signals is disabled. There is no manually emitted Google page view, no page-view suppression, no alternate SDK initialization, and no cookie-choice gate. The Meta PageView and existing secondary signup conversion are retained, without contact matching.
- Google's own library may automatically fetch an Ads destination script after receiving the Ads config. The site does not author a second Ads loader. Local evidence distinguishes these requests.
- The privacy/cookie policy bodies match the revised text supplied and cleared by the user in this conversation. Both effective dates are October 27, 2026, the candidate commit date. Existing terms already contain the requested booking-site Terms of Service link. Marketing footer links remain local, as requested by the supplied legal recommendation. If the clearance requires actual launch-date wording instead, update both dates together at launch.

## Privacy payload verification

Read-only production Worker deployment inspection on October 27 found deployment `370a37a3-1d83-4fcd-96c5-ce53b81f5e98`, version `7af64198-ab2c-4e3f-a40f-d411eefd3c47`, annotated `Square customer merge fix; main 4e62d35; 314 backend and 88 frontend tests passed`.

Compared that source revision's promo router, `PromoService`, and providers with current source; no differences in those files. Promo start/verify/marketing handlers call the promo service, whose providers send to Cloudflare Turnstile, Twilio Verify, and Resend only. This promo flow contains no Meta Conversions API dispatch, so it sends neither plaintext nor hashed contact identifiers to Meta. A separate legacy ordering conversion provider is not part of the promo flow. No Worker settings or code were changed for this check.

## Local checks

Run from the public-site branch checkout:

```sh
node --test test/*.test.mjs
node scripts/verify-public-baseline.mjs
node tools/verify-promo-signup.js
node scripts/cutover-browser-audit.mjs
```

The browser audit requires Playwright with Chromium installed. With the existing backend installation, set `PLAYWRIGHT_MODULE=file:///Users/Mike/Downloads/snappycoin-promo-backend/node_modules/playwright/index.mjs` for that last command. `CUTOVER_AUDIT_OUTPUT` selects the output folder. It starts its own loopback server; no deployment or backend process is required.

The real Google tag library is downloaded. Measurement requests are intercepted locally, and no form submissions or booking/customer mutations are sent. Policy and homepage loads must each request the new GA loader once and emit exactly one GA4 page view. Legacy accepted/declined choices are seeded; the audit verifies the application never accesses those keys or cookie choices. It verifies Google configs, Meta PageView, script-free redirects with query/hash removal, mobile navigation, and an active-promotion fixture that cannot expose Free Wash. The ad alias is transient and returns to the homepage; retired static redirects contain no analytics runtime and measure nothing before leaving.

The five requested checks are recorded in `docs/cutover-verification.json`. Network details and screenshots are local audit artifacts; their request IDs are synthetic test-session identifiers, not customer data. Re-run the audit when changing analytics or redirect behavior.

## Launch, only after explicit go

1. Use a weekday evening after the old system's 14:00 America/Chicago cutoff. Confirm the new booking root is ready with its owner and record the cutover timestamp in UTC. Do not modify DNS, Square credentials, Twilio sender, Turnstile, old Worker, D1, or the separate Cloudflare booking project.
2. Fetch origin in the public-site repository and inspect any intervening main changes. Do not overwrite or force-push. With a clean release checkout, merge the reviewed candidate into local main (fast-forward if main has not changed), then run `git push origin main`. Wait for the actual GitHub Pages deployment, not just a successful Git push.
3. From a physical phone, use the nav, hero, Services, and footer booking/order entries. Each must land at the new root. Check the legacy bookmarks and all former steps; none may expose the old wizard. Browser emulation in the local audit is not physical-phone evidence.
4. In the actual shared GA4 property's Realtime view, verify the visit from marketing into booking remains one user. Local tests prove the marketing hit count, not the live booking site's configuration, shared cookie scope, or Realtime identity. This launch check remains required.
5. For seven days after launch, inspect the old D1 daily for newly created legacy pickup orders and tell Nick if any appear. This monitoring window starts at cutover; it has not started during branch preparation. Existing open tabs can still submit to the old Worker. No production customer data needs to be exported for preparation.

Run the following read-only query from the backend repository, substituting the recorded UTC launch time. Keep the timestamp fixed across the seven daily checks and record the last checked date. Use minimal order metadata, not customer contact fields:

```sh
CLOUDFLARE_ACCOUNT_ID=541abd515c734e93d58f80657dfdabdf npx wrangler d1 execute snappycoin-promo --remote --command "SELECT order_number, created_at, fulfillment_status FROM pud_orders WHERE service_mode = 'pickup_delivery' AND created_at >= 'REPLACE_WITH_UTC_CUTOVER_TIMESTAMP' ORDER BY created_at;"
```

## Rollback

The cutover is a single commit containing link, analytics, and legal changes together. Revert that entire commit on public main and push through GitHub Pages; do not revert just the policy or just the analytics portion. Wait for deployment and verify the legacy wizard and old links return. The prior source and application are preserved in Git, and Worker/D1 remain available. Retain the cutover timestamp and any late-order observations even if rollback is necessary.
