import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("address validation stays first and exposes clear eligible and ineligible paths", async () => {
  const [html, booking] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8")
  ]);
  assert.ok(html.indexOf('data-step="address"') < html.indexOf('data-step="details"'));
  assert.match(html, /We check service area and route availability before asking for personal or payment details/);
  assert.match(booking, /result\.eligibility === "out_of_zone"/);
  assert.match(booking, /result\.eligibility === "review_required"/);
  assert.match(booking, /go\("details"\)/);
  assert.match(html, /Join waitlist/);
  assert.match(html, /Check another address/);
  assert.match(html, /See self-service hours and directions/);
});

test("Google attribution is conditional, adjacent to address results, and not localized", async () => {
  const [html, booking, css] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8"),
    readFile(new URL("assets/css/pud.css", root), "utf8")
  ]);
  assert.equal((html.match(/data-address-attribution/g) || []).length, 2);
  assert.match(html, /translate="no" data-i18n-skip>Google Maps</);
  assert.match(booking, /attributionValue === "Google Maps"/);
  assert.match(booking, /element\.hidden = !showGoogleMaps/);
  assert.match(css, /\.pud-address-attribution[\s\S]*font-size: \.75rem/);
  assert.match(css, /\[translate="no"\][\s\S]*white-space: nowrap/);
});

test("free pickup and delivery copy only appears for an explicit zero delivery fee", async () => {
  const [html, booking] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8")
  ]);
  assert.match(html, /data-pud-service-area-offer hidden>Free pickup and delivery within our service area/);
  assert.match(booking, /price\.deliveryFeeCents !== 0/);
});

test("pickup privacy and terms reference Google Maps terms and privacy", async () => {
  for (const path of ["pickup-delivery/privacy/index.html", "pickup-delivery/terms/index.html"]) {
    const html = await readFile(new URL(path, root), "utf8");
    assert.match(html, /Google Address Validation/);
    assert.match(html, /https:\/\/cloud\.google\.com\/maps-platform\/terms/);
    assert.match(html, /https:\/\/policies\.google\.com\/privacy/);
  }
});
