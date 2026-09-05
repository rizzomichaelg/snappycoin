import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fireWdfPickupBookingCompleted } from "../assets/js/pud-google-ads.js";

test("WDF pickup conversion fires once with the exact Google Ads payload", () => {
  const calls = [];
  const localStore = memoryStorage();
  const sessionStore = memoryStorage();
  const input = {
    orderNumber: "PUD-20260816-ADS00001",
    duplicate: false,
    gtag: (...args) => calls.push(args),
    localStore,
    sessionStore,
  };

  assert.equal(fireWdfPickupBookingCompleted(input), true);
  assert.equal(fireWdfPickupBookingCompleted(input), false);
  assert.deepEqual(calls, [[
    "event",
    "conversion",
    { send_to: "AW-18256973572/iBh5CJP45OIcEISezYFE" },
  ]]);
});

test("WDF pickup conversion rejects replayed and invalid order responses", () => {
  const calls = [];
  const common = {
    gtag: (...args) => calls.push(args),
    localStore: memoryStorage(),
    sessionStore: memoryStorage(),
  };

  assert.equal(fireWdfPickupBookingCompleted({
    ...common,
    orderNumber: "PUD-20260816-ADS00002",
    duplicate: true,
  }), false);
  assert.equal(fireWdfPickupBookingCompleted({
    ...common,
    orderNumber: "",
    duplicate: false,
  }), false);
  assert.deepEqual(calls, []);
});

test("booking invokes the conversion only after validating a successful backend order", async () => {
  const source = await readFile(new URL("../assets/js/pud-booking.js", import.meta.url), "utf8");
  const createOrderAt = source.indexOf("result = await createOrder(");
  const validateOrderAt = source.indexOf("if (!token || !result.orderNumber)", createOrderAt);
  const conversionAt = source.indexOf("trackWdfPickupBookingCompleted", validateOrderAt);
  const completeAt = source.indexOf('go("complete")', conversionAt);

  assert.ok(createOrderAt >= 0);
  assert.ok(validateOrderAt > createOrderAt);
  assert.ok(conversionAt > validateOrderAt);
  assert.ok(completeAt > conversionAt);
  assert.match(source.slice(validateOrderAt, completeAt), /duplicate: result\.duplicate === true/);
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}
