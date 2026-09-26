import test from "node:test";
import assert from "node:assert/strict";
import { assertItemizedReceipt } from "../assets/js/pud-contract.js";

const receipt = {
  currency: "usd", weightTenths: 645, pricePerLbCents: 150, weightChargeCents: 9675,
  minimumCents: 1500, minimumAdjustmentCents: 0, baseChargeCents: 13275,
  additionalItems: [{ description: "Blankets", quantity: 4, unitPriceCents: 900, lineTotalCents: 3600 }],
  additionalItemsCents: 3600, deliveryFeeCents: 0, discountCents: 0, taxCents: 0, tipCents: 0,
  totalCents: 13275, amountCapturedCents: 13275, refundedCents: 0, netPaidCents: 13275,
  pricingVersion: "v1", taxRuleVersion: "none",
};
test("accepts the itemized blanket receipt and older receipts without item fields", () => {
  assert.equal(assertItemizedReceipt(receipt).totalCents, 13275);
  const old = { ...receipt, baseChargeCents: 9675, totalCents: 9675, amountCapturedCents: 9675, netPaidCents: 9675 };
  delete old.additionalItems; delete old.additionalItemsCents;
  assert.equal(assertItemizedReceipt(old).totalCents, 9675);
});
test("rejects malformed lines and inconsistent item totals before rendering a receipt", () => {
  for (const replacement of [null, {}, Array(21).fill(receipt.additionalItems[0]),
    [{ ...receipt.additionalItems[0], description: " " }],
    [{ ...receipt.additionalItems[0], quantity: 1.5 }],
    [{ ...receipt.additionalItems[0], unitPriceCents: -1 }],
    [{ ...receipt.additionalItems[0], lineTotalCents: 1 }]]) {
    assert.throws(() => assertItemizedReceipt({ ...receipt, additionalItems: replacement }), TypeError);
  }
  assert.throws(() => assertItemizedReceipt({ ...receipt, additionalItemsCents: 3599 }), TypeError);
});
