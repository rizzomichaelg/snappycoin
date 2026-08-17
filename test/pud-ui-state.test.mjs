import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("booking progress exposes the four-step Square card-on-file flow", async () => {
  const [booking, payment] = await Promise.all([
    source("assets/js/pud-booking.js"),
    source("assets/js/pud-payment.js"),
  ]);
  assert.match(booking, /const allSteps = \["address", "details", "phone", "review", "complete"\]/);
  assert.match(booking, /root\.dataset\.paymentCollection = "square_card_on_file"/);
  assert.match(booking, /function allowedBookingSteps\(\)[\s\S]*"complete"/);
  assert.match(booking, /--pud-progress-count/);
  assert.match(booking, /data-step-position/);
  assert.match(booking, /item\.hidden = !visible/);
  assert.match(booking, /progress\.hidden = step === "complete"/);
  assert.match(booking, /visible && item\.dataset\.progressStep === step/);
  assert.match(booking, /translateText\("Step"\).*translateText\("of"\)/);
  assert.match(booking, /prepareSquareCard\(state\.config, paymentMount\)/);
  assert.match(booking, /tokenizeSquareCard/);
  assert.match(booking, /turnstileToken: turnstileValue/);
  assert.doesNotMatch(booking, /source === "other" && !sourceDetail/);
  assert.match(booking, /function configureReferralOther[\s\S]*input\.required = false/);
  assert.match(payment, /squareCard\.attach\(squareMountSelector\(mount\)\)/);
  assert.match(payment, /replacementSquareCard\.attach\(squareMountSelector\(mount\)\)/);
  assert.match(booking, /showResumeMessage\(\)/);
  assert.match(booking, /Recheck the address, pickup and delivery times, phone, and card before confirming it\./);
  assert.match(booking, /Recheck the address, schedule, phone, and card to create a new order\./);
});

test("booking errors keep a top summary and add accessible field-level guidance", async () => {
  const [booking, css] = await Promise.all([
    source("assets/js/pud-booking.js"),
    source("assets/css/pud.css"),
  ]);
  assert.match(booking, /clearFieldErrors\(form\)/);
  assert.match(booking, /renderFieldErrors\(form, error\?\.fieldErrors\)/);
  assert.match(booking, /field\.setAttribute\("aria-invalid", "true"\)/);
  assert.match(booking, /field\.setAttribute\("aria-describedby"/);
  assert.match(booking, /showMessage\(error\?\.message \|\| "Something went wrong\. Please try again\."\)/);
  assert.match(css, /\.pud-form \.pud-field-error[\s\S]*var\(--pud-danger\)/);
  assert.match(css, /\.pud-form \[aria-invalid="true"\]/);
});

test("status clears non-silent stale guidance and exposes loaded state without altering timeline semantics", async () => {
  const status = await source("assets/js/pud-status.js");
  assert.match(status, /render\(status\);\s*if \(!silent\) message\(""\);/);
  assert.match(status, /root\.dataset\.orderLoaded = "true"/);
  assert.match(status, /function clearOrderLoadedState\(\)[\s\S]*delete root\.dataset\.orderLoaded/);
  assert.match(status, /PUD_ORDER_TOKEN_INVALID[\s\S]*clearOrderLoadedState\(\)/);
  assert.match(status, /state === "current"\) step\.setAttribute\("aria-current", "step"\)/);
});

test("PUD header starts substantial and condenses from scroll without overlapping mobile controls", async () => {
  const [header, css, bookingHtml] = await Promise.all([
    source("assets/js/pud-header.js"),
    source("assets/css/pud.css"),
    source("pickup-delivery/index.html"),
  ]);
  assert.match(header, /window\.scrollY > condensedThreshold/);
  assert.match(header, /classList\.toggle\("is-condensed", condensed\)/);
  assert.match(header, /requestAnimationFrame\(renderHeaderState\)/);
  assert.match(header, /addEventListener\("scroll", scheduleHeaderState, \{ passive: true \}\)/);
  assert.match(css, /\.pud-brand img\s*\{[^}]*width:\s*64px;[^}]*height:\s*64px;/s);
  assert.match(css, /\.pud-header\.is-condensed \.pud-brand img\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/s);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.pud-header\.is-condensed \.pud-header__inner\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/);
  assert.match(bookingHtml, /assets\/js\/pud-header\.js/);
});

test("status-link recovery is fail-closed and follows deployed public configuration", async () => {
  const [status, statusHtml] = await Promise.all([
    source("assets/js/pud-status.js"),
    source("pickup-delivery/status/index.html"),
  ]);
  assert.match(statusHtml, /data-status-recovery-link hidden/);
  assert.match(statusHtml, /data-status-recovery-unavailable/);
  assert.match(status, /config\?\.statusRecoveryEnabled === true/);
  assert.match(status, /link\.hidden = !enabled/);
  assert.match(status, /unavailable\.hidden = enabled/);
});

test("customer-facing scheduling copy uses pickup times instead of route jargon", async () => {
  const [bookingHtml, status, css] = await Promise.all([
    source("pickup-delivery/index.html"),
    source("assets/js/pud-status.js"),
    source("assets/css/pud.css"),
  ]);
  assert.match(bookingHtml, /Enter your address to choose available pickup and delivery times/);
  assert.match(bookingHtml, /Electronic updates as your order moves from pickup through delivery/);
  assert.doesNotMatch(bookingHtml, />Choose a route</);
  assert.doesNotMatch(bookingHtml, />Route availability/);
  assert.match(status, /Continue with proposed pickup time/);
  assert.match(status, /Choose another pickup time/);
  assert.match(status, /Choose a pickup time/);
  assert.doesNotMatch(status, /"Continue with proposed route"/);
  assert.doesNotMatch(status, /"Choose another route"/);
  assert.doesNotMatch(status, /"Choose a route"/);
  assert.doesNotMatch(status, /preparing the return route/);
  assert.match(css, /\.pud-hero\s*\{\s*position:\s*static;/);
  assert.doesNotMatch(css, /\.pud-hero\s*\{[^}]*position:\s*sticky;/s);
  assert.match(css, /\.pud-turnstile:not\(:empty\)\s*\{\s*min-height:\s*65px;/);
  assert.doesNotMatch(css, /\.pud-turnstile\s*\{[^}]*min-height:/s);
  assert.match(css, /\.pud-header__locale\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*2;[^}]*justify-self:\s*end;/s);
  assert.match(bookingHtml, /<label class="pud-check"><input name="terms"[^>]*><span>I accept the <a href="\/pickup-delivery\/terms\//);
  assert.match(css, /\.pud-check > span\s*\{\s*min-width:\s*0;/);
});

test("recovery and claims distinguish unavailable entry from a terminal in-progress attempt", async () => {
  const recovery = await source("assets/js/pud-recovery.js");
  const claims = await source("assets/js/pud-claims.js");
  assert.match(recovery, /\[data-recovery-unavailable\]/);
  assert.match(recovery, /startPanel\.hidden = true;[\s\S]*codePanel\.hidden = true;[\s\S]*unavailablePanel\.hidden = false/);
  assert.match(recovery, /unavailablePanel\.querySelector\("h2"\)\?\.focus/);
  assert.match(claims, /function showClaimUnavailable\(text\)/);
  assert.match(claims, /form\.hidden = true/);
  assert.match(claims, /function lockClaimAttempt\(text\)/);
  assert.match(claims, /form\.hidden = false/);
  assert.match(claims, /function hasClaimAttemptContent\(\)/);
  assert.match(claims, /evidenceUploadTerminalFailure = true;[\s\S]*lockClaimAttempt/);
});

test("PUD hosts and message helpers are deterministic and announce by severity", async () => {
  const [analytics, locale, booking, status, recovery, claims] = await Promise.all([
    source("assets/js/pud-site-analytics.js"),
    source("assets/js/site-i18n.js"),
    source("assets/js/pud-booking.js"),
    source("assets/js/pud-status.js"),
    source("assets/js/pud-recovery.js"),
    source("assets/js/pud-claims.js"),
  ]);
  assert.match(analytics, /document\.querySelector\("\[data-cookie-consent-host\]"\)/);
  assert.match(analytics, /banner\.setAttribute\("role", "region"\)/);
  assert.match(locale, /document\.querySelector\("\[data-locale-switcher-host\]"\)/);
  for (const module of [booking, status, recovery, claims]) {
    assert.match(module, /setAttribute\("role", variant === "error" \? "alert" : "status"\)/);
    assert.match(module, /setAttribute\("aria-live", variant === "error" \? "assertive" : "polite"\)/);
  }
});
