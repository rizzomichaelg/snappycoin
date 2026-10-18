import assert from "node:assert/strict";
import test from "node:test";
import { readHandoffChoices, handoffConsentDecisions } from "../assets/js/pud-booking-handoff.js";

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ pickupHandoff: "attended", deliveryHandoff: "attended", ...overrides })) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}

for (const pickup of [false, true]) {
  for (const delivery of [false, true]) {
    test(`independent booking handoffs: unattended pickup ${pickup}, delivery ${delivery}`, () => {
      const choices = readHandoffChoices(form({
        pickupHandoff: pickup ? "unattended" : "attended",
        deliveryHandoff: delivery ? "unattended" : "attended",
        unattendedPickupAuthorization: pickup ? "yes" : undefined,
        unattendedDeliveryAuthorization: delivery ? "yes" : undefined,
        pickupAccessNotes: pickup ? "  Pickup porch box  " : undefined,
        deliveryAccessNotes: delivery ? "  Delivery side shelf  " : undefined,
      }));
      assert.deepEqual(choices, {
        unattendedPickup: pickup, unattendedDelivery: delivery,
        pickupAccessNotes: pickup ? "Pickup porch box" : "",
        deliveryAccessNotes: delivery ? "Delivery side shelf" : "",
        accessNotes: [pickup ? "Pickup instructions: Pickup porch box" : "", delivery ? "Delivery instructions: Delivery side shelf" : ""].filter(Boolean).join("\n"),
      });
      assert.deepEqual(handoffConsentDecisions(choices, { unattended_pickup: "pickup-v3", unattended_delivery: "delivery-v7" }, "general-v1"), {
        unattended_pickup: { accepted: pickup, version: "pickup-v3" },
        unattended_delivery: { accepted: delivery, version: "delivery-v7" },
      });
    });
  }
}

test("new booking requires an explicit delivery choice", () => {
  for (const value of [undefined, "", "same_as_pickup", "true"]) {
    assert.throws(() => readHandoffChoices(form({ deliveryHandoff: value })), (error) => Boolean(error.fieldErrors.deliveryHandoff));
  }
});

test("each unattended choice requires its own authorization and location", () => {
  const pickupOnly = { pickupHandoff: "unattended", unattendedPickupAuthorization: "yes", pickupAccessNotes: "Porch" };
  assert.throws(() => readHandoffChoices(form({ ...pickupOnly, deliveryHandoff: "unattended" })), (error) => Boolean(error.fieldErrors.unattendedDeliveryAuthorization));
  assert.throws(() => readHandoffChoices(form({ ...pickupOnly, deliveryHandoff: "unattended", unattendedDeliveryAuthorization: "yes" })), (error) => Boolean(error.fieldErrors.deliveryAccessNotes));
  assert.throws(() => readHandoffChoices(form({ pickupHandoff: "unattended", deliveryHandoff: "unattended", unattendedDeliveryAuthorization: "yes", deliveryAccessNotes: "Side door" })), (error) => Boolean(error.fieldErrors.unattendedPickupAuthorization));
});

test("attended choices discard stale checkbox values and private notes", () => {
  const choices = readHandoffChoices(form({ unattendedPickupAuthorization: "yes", unattendedDeliveryAuthorization: "yes", pickupAccessNotes: "OLD_PICKUP_ACCESS", deliveryAccessNotes: "OLD_DELIVERY_ACCESS", accessNotes: "AMBIGUOUS_OLD_NOTES" }));
  assert.deepEqual(choices, { unattendedPickup: false, unattendedDelivery: false, pickupAccessNotes: "", deliveryAccessNotes: "", accessNotes: "" });
  assert.equal(JSON.stringify(choices).includes("OLD_"), false);
});

test("instruction bounds reject whitespace and keep both labeled notes within the shared limit", () => {
  for (const notes of ["    ", "x".repeat(501)]) {
    assert.throws(() => readHandoffChoices(form({ deliveryHandoff: "unattended", unattendedDeliveryAuthorization: "yes", deliveryAccessNotes: notes })), (error) => Boolean(error.fieldErrors.deliveryAccessNotes));
    assert.throws(() => readHandoffChoices(form({ pickupHandoff: "unattended", unattendedPickupAuthorization: "yes", pickupAccessNotes: notes })), (error) => Boolean(error.fieldErrors.pickupAccessNotes));
  }
  const longest = readHandoffChoices(form({ pickupHandoff: "unattended", deliveryHandoff: "unattended", unattendedPickupAuthorization: "yes", unattendedDeliveryAuthorization: "yes", pickupAccessNotes: "P".repeat(500), deliveryAccessNotes: "D".repeat(500) }));
  assert.ok(longest.accessNotes.length <= 2000);
  assert.ok(longest.accessNotes.includes("Pickup instructions: "));
  assert.ok(longest.accessNotes.includes("\nDelivery instructions: "));
});

test("version fallback preserves the contract without borrowing the other consent version", () => {
  const choices = readHandoffChoices(form({ deliveryHandoff: "unattended", unattendedDeliveryAuthorization: "yes", deliveryAccessNotes: "Secure shelf" }));
  assert.deepEqual(handoffConsentDecisions(choices, { unattended_pickup: "pickup-only-version" }, "general-current"), {
    unattended_pickup: { accepted: false, version: "pickup-only-version" },
    unattended_delivery: { accepted: true, version: "general-current" },
  });
  assert.deepEqual(handoffConsentDecisions(choices, {}, "general-current"), {
    unattended_pickup: { accepted: false, version: "general-current" },
    unattended_delivery: { accepted: true, version: "general-current" },
  });
});
