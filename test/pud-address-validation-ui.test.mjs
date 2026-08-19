import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("address validation stays first and exposes clear eligible and ineligible paths", async () => {
  const [html, booking, scheduling] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8"),
    readFile(new URL("assets/js/pud-scheduling.js", root), "utf8")
  ]);
  assert.ok(html.indexOf('data-step="address"') < html.indexOf('data-step="details"'));
  assert.match(html, /We check the service area and available pickup times before asking for contact details/);
  assert.match(booking, /result\.eligibility === "out_of_zone"/);
  assert.match(booking, /result\.eligibility === "review_required"/);
  assert.match(booking, /result\.reviewBookingAllowed === true/);
  assert.match(booking, /showAddressConfirmation/);
  assert.match(html, /Keep mine · pending review/);
  assert.match(booking, /Outside our service area/);
  assert.match(booking, /We do not currently serve this address/);
  assert.match(booking, /We could not locate this address precisely enough/);
  assert.doesNotMatch(booking, /Google couldn’t verify/);
  assert.match(booking, /outcome === "turnaround_unconfigured"/);
  assert.match(booking, /outcome === "cutoff_passed"/);
  assert.doesNotMatch(booking, /currently at capacity|no space available/);
  assert.match(booking, /no valid pickup time is currently available/);
  assert.match(booking, /go\("details"\)/);
  assert.match(booking, /trackFunnel\("pud_order_submitted"[\s\S]*clearMessage\(\);[\s\S]*go\("complete"\)/);
  assert.match(scheduling, /import \{ formatCentralDateTime, translateText \}/);
  assert.match(html, /data-waitlist-title/);
  assert.match(html, /Join waitlist/);
  assert.match(html, /It does not create an order, reserve a pickup/);
  assert.match(html, /Check another address/);
  assert.match(html, /See self-service hours and directions/);
});

test("address checks stay testable while booking is paused", async () => {
  const booking = await readFile(new URL("assets/js/pud-booking.js", root), "utf8");
  assert.match(booking, /Address checks are available, but online booking is temporarily paused/);
  assert.match(booking, /This address is eligible\. Online booking is temporarily paused/);
  assert.doesNotMatch(booking, /if \(!state\.config\.bookingEnabled\) return showUnavailable/);
});

test("Google attribution remains on address suggestions but is absent below confirmed addresses", async () => {
  const [html, booking, css] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8"),
    readFile(new URL("assets/css/pud.css", root), "utf8")
  ]);
  assert.equal((html.match(/data-address-attribution/g) || []).length, 0);
  assert.match(html, /Address suggestions powered by[\s\S]*Google Maps/);
  assert.doesNotMatch(html, /Address validation provided by/);
  assert.match(html, /translate="no" data-i18n-skip>Google Maps</);
  assert.doesNotMatch(booking, /renderAddressAttribution|data-address-attribution/);
  assert.match(css, /\.pud-address-attribution[\s\S]*font-size: 0?\.75rem/);
  assert.match(css, /\[translate="no"\][\s\S]*white-space: nowrap/);
});

test("address autocomplete is server-backed, visually selectable, and preserves a reviewed manual path", async () => {
  const [html, address, booking, api] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-address.js", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8"),
    readFile(new URL("assets/js/pud-api.js", root), "utf8")
  ]);
  assert.match(html, /data-address-autocomplete-list/);
  assert.match(html, /Start typing, then select your address from the matches/);
  assert.match(html, /data-address-confirm-dialog/);
  assert.match(html, /Address suggestions powered by[\s\S]*Google Maps/);
  assert.match(address, /enableAddressAutocomplete/);
  assert.match(address, /pud-address-suggestion/);
  assert.match(address, /Address suggestions are unavailable\. Enter the address manually/);
  assert.match(booking, /addressAutocompleteEnabled === true/);
  assert.match(booking, /state\.address = pending\.enteredAddress/);
  assert.match(booking, /data-normalized-address[\s\S]*displayAddress\(state\.address\)/);
  assert.match(api, /\/api\/pud\/address\/autocomplete/);
  assert.doesNotMatch(html + address + booking + api, /server-only-key|PUD_GEOCODER_API_KEY/);
});

test("manual address cleanup removes duplicated and placeholder unit values", async () => {
  const { normalizeAddressEntry } = await import(`../assets/js/pud-address.js?test=${Date.now()}`);
  assert.deepEqual(normalizeAddressEntry({
    line1: "10010 S Executive Dr Apt 7",
    line2: "Apt 7",
    city: "Saint Ann",
    state: "mo",
    postalCode: "63074",
  }), {
    line1: "10010 S Executive Dr",
    line2: "Apt 7",
    city: "Saint Ann",
    state: "MO",
    postalCode: "63074",
  });
  assert.deepEqual(normalizeAddressEntry({
    line1: "4439 Blair Avenue",
    line2: "N/a",
    city: "St. Louis",
    state: "MO",
    postalCode: "63107",
  }), {
    line1: "4439 Blair Avenue",
    city: "St. Louis",
    state: "MO",
    postalCode: "63107",
  });
});

test("free pickup and delivery copy only appears for an explicit zero delivery fee", async () => {
  const [html, booking] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8")
  ]);
  assert.match(html, /data-pud-service-area-offer hidden>Free pickup and delivery within our service area/);
  assert.match(booking, /price\.deliveryFeeCents !== 0/);
});

test("homepage same-day copy is explicitly limited to in-store drop-off", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(
    html,
    /In-store drop-off: same-day available at no charge when received by 12 noon/
  );
  assert.doesNotMatch(html, />Same-day available, no charge, when received by 12 noon</);
});

test("pickup privacy and terms reference Google Maps terms and privacy", async () => {
  for (const path of ["pickup-delivery/privacy/index.html", "pickup-delivery/terms/index.html"]) {
    const html = await readFile(new URL(path, root), "utf8");
    assert.match(html, /Google Address Validation/);
    assert.match(html, /https:\/\/cloud\.google\.com\/maps-platform\/terms/);
    assert.match(html, /https:\/\/policies\.google\.com\/privacy/);
  }
});
