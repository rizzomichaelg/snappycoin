import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { eligibleDeliveryRoutes } from "../assets/js/pud-scheduling.js";

const root = new URL("../", import.meta.url);

test("delivery choices begin 24 hours after the selected pickup timestamp", () => {
  const pickup = { routeDate: "2026-08-18", windowStartAt: "2026-08-18T22:00:00.000Z" };
  const routes = [
    { id: "too-early", routeDate: "2026-08-19", windowStartAt: "2026-08-19T21:59:59.000Z" },
    { id: "exactly-24-hours", routeDate: "2026-08-19", windowStartAt: "2026-08-19T22:00:00.000Z" },
    { id: "later", routeDate: "2026-08-20", windowStartAt: "2026-08-20T14:00:00.000Z" },
  ];
  assert.deepEqual(eligibleDeliveryRoutes(routes, pickup).map((route) => route.id), ["exactly-24-hours", "later"]);
});

test("booking shows the promotional hierarchy without technical delivery counts", async () => {
  const [html, home, booking] = await Promise.all([
    readFile(new URL("pickup-delivery/index.html", root), "utf8"),
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-booking.js", root), "utf8"),
  ]);
  assert.match(html, /data-pud-current-price>\$1\.35\/lb/);
  assert.match(html, /data-pud-minimum>\$15 minimum/);
  assert.match(html, /<s>\$1\.50\/lb<\/s>[\s\S]*10% off through August 31st\./);
  assert.match(html, /class="pud-price-note">Comforters &amp; bulky items priced separately\. Call for pricing\.<\/span>/);
  assert.match(html, /Pricing<\/dt><dd>\$1\.35\/lb · \$15 minimum through August 31st\./);
  assert.match(booking, /compactMoney\(price\.minimumCents \?\? 1500\)/);
  assert.match(home, /Pickup &amp; delivery from your door\./);
  assert.doesNotMatch(home, /\$1\.35 per pound|\$15 minimum|\$1\.50 per pound|10% off through August 31st/);
  assert.doesNotMatch(booking, /delivery window.*available at least 24 hours after pickup/);
  assert.match(booking, /Choose a delivery day and time\./);
});
