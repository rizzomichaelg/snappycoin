import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStatusRecoveryStart,
  assertStatusRecoveryVerify,
  contractBody,
} from "../assets/js/pud-contract.js";

test("status-link recovery requests allowlist only identity challenge fields", () => {
  assert.deepEqual(contractBody("/api/pud/orders/status-recovery/start", {
    email: "alex@example.com",
    phone: "+13145550101",
    turnstileToken: "turnstile-token",
    orderNumber: "must-not-send",
  }), {
    email: "alex@example.com",
    phone: "+13145550101",
    turnstileToken: "turnstile-token",
  });
  assert.deepEqual(contractBody("/api/pud/orders/status-recovery/verify", {
    recoveryId: "recovery-1",
    code: "123456",
    statusToken: "must-not-send",
  }), { recoveryId: "recovery-1", code: "123456" });
  assert.throws(
    () => contractBody("/api/pud/orders/status-recovery/start", { email: "alex@example.com", phone: "+13145550101" }),
    /turnstileToken/,
  );
});

test("status-link recovery guards reject match, account, and token disclosures", () => {
  const started = {
    accepted: true,
    recoveryId: "recovery-1",
    phoneLast4: "0101",
    expiresAt: "2026-07-15T12:10:00Z",
    message: "If those details match an order, use the verification code sent to that phone.",
    requestId: "request-1",
  };
  const verified = {
    accepted: true,
    verified: true,
    complete: true,
    message: "If those details matched an order, a fresh private status link has been sent by email and text.",
    requestId: "request-2",
  };
  assert.equal(assertStatusRecoveryStart(started), started);
  assert.equal(assertStatusRecoveryVerify(verified), verified);
  for (const leaked of [
    { matched: true },
    { customerId: "customer-1" },
    { orderNumber: "PUD-PRIVATE" },
    { statusToken: "private-token" },
  ]) {
    assert.throws(() => assertStatusRecoveryVerify({ ...verified, ...leaked }), /unexpected field/);
  }
  assert.throws(() => assertStatusRecoveryStart({ ...started, email: "alex@example.com" }), /unexpected field/);
});
