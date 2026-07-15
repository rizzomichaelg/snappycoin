import assert from "node:assert/strict";
import test from "node:test";
import {
  assertLoyaltySummary,
  assertPublicConfig,
  contractBody,
} from "../assets/js/pud-contract.js";

test("loyalty summary validates bounded customer-safe balance history", () => {
  const summary = {
    currency: "USD",
    balanceCents: 500,
    status: "active",
    history: [{
      transactionId: "loyalty_tx_1",
      type: "manual_credit",
      amountCents: 500,
      balanceAfterCents: 500,
      orderNumber: null,
      expiresAt: null,
      createdAt: "2026-07-15T12:00:00Z",
    }],
  };
  assert.equal(assertLoyaltySummary(summary), summary);
  assert.throws(() => assertLoyaltySummary({ ...summary, balanceCents: -1 }), /nonnegative/);
  assert.throws(() => assertLoyaltySummary({ ...summary, status: "internal_hold" }), /not supported/);
  assert.throws(() => assertLoyaltySummary({ ...summary, history: [{ ...summary.history[0], createdAt: "yesterday" }] }), /UTC timestamp/);
});

test("loyalty request strips unknown data and public config requires both new flags", () => {
  assert.deepEqual(contractBody("/api/pud/loyalty", {
    token: "status-token-memory-only",
    statusSession: "verified-session-memory-only",
    limit: 25,
    privateNote: "must-not-leak",
  }), {
    token: "status-token-memory-only",
    statusSession: "verified-session-memory-only",
    limit: 25,
  });

  const config = {
    publicEnabled: true,
    bookingEnabled: true,
    recurringEnabled: true,
    tipsEnabled: true,
    referralsEnabled: true,
    claimsEnabled: true,
    loyaltyEnabled: true,
    claimEvidenceEnabled: true,
    stripePublishableKey: null,
    turnstileSiteKey: "site-key",
    timezone: "America/Chicago",
    pricing: { pricePerLbCents: 199, minimumCents: 2500, deliveryFeeCents: 0, version: "2026-07" },
    consentVersions: { privacy: "2026-07" },
  };
  assert.equal(assertPublicConfig(config), config);
  assert.throws(() => assertPublicConfig({ ...config, loyaltyEnabled: undefined }), /must be a boolean/);
  assert.throws(() => assertPublicConfig({ ...config, claimEvidenceEnabled: undefined }), /must be a boolean/);
});
