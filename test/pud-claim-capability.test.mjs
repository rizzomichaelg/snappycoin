import assert from "node:assert/strict";
import test from "node:test";

globalThis.window = { location: { hostname: "localhost" } };
const stored = new Map();
globalThis.sessionStorage = {
  getItem: (key) => stored.get(key) || null,
  setItem: (key, value) => stored.set(key, value),
  removeItem: (key) => stored.delete(key),
};

const { PUD_CONFIG } = await import("../assets/js/pud-config.js");
const {
  completeClaimAttempt,
  getOrCreateClaimAttemptId,
  storeClaimCapabilities,
  takeClaimCapabilities,
} = await import("../assets/js/pud-claim-capability.js");
const { stableActionKey } = await import("../assets/js/pud-idempotency.js");

const expiry = (minutes = 5) => new Date(Date.now() + minutes * 60 * 1000).toISOString();
const evidenceCapabilities = () => Array.from({ length: 5 }, (_, index) => ({
  actionCapability: `evidence-capability-${index}-at-least-sixteen`,
  expiresAt: expiry(),
}));

test("claim transit persists only purpose-bound capabilities and removes them before use", () => {
  const attemptId = getOrCreateClaimAttemptId();
  const evidence = evidenceCapabilities();
  storeClaimCapabilities({
    claimActionCapability: "claim-capability-value-at-least-sixteen",
    claimExpiresAt: expiry(),
    evidenceCapabilities: evidence,
    attemptId,
  });
  const raw = stored.get(PUD_CONFIG.claimCapabilityStorageKey);
  assert.ok(raw);
  const persisted = JSON.parse(raw);
  assert.deepEqual(Object.keys(persisted).sort(), [
    "attemptId", "claimActionCapability", "claimExpiresAt", "evidenceCapabilities",
  ]);
  assert.equal(persisted.evidenceCapabilities.length, 5);
  persisted.evidenceCapabilities.forEach((capability) => {
    assert.deepEqual(Object.keys(capability).sort(), ["actionCapability", "expiresAt"]);
  });
  for (const forbidden of ["statusSession", "phoneProof", "statusToken", "token", "form", "description", "assetId", "sha256", "mimeType"]) {
    assert.equal(raw.includes(forbidden), false);
  }

  assert.deepEqual(takeClaimCapabilities(), {
    claimActionCapability: "claim-capability-value-at-least-sixteen",
    claimExpiresAt: persisted.claimExpiresAt,
    evidenceCapabilities: evidence,
    attemptId,
  });
  assert.equal(stored.has(PUD_CONFIG.claimCapabilityStorageKey), false);
  assert.equal(takeClaimCapabilities(), null);

  const pending = JSON.parse(stored.get(PUD_CONFIG.claimAttemptStorageKey));
  assert.deepEqual(Object.keys(pending).sort(), ["attemptId", "createdAt"]);
  assert.equal(pending.attemptId, attemptId);
  assert.equal(getOrCreateClaimAttemptId(), attemptId);
  completeClaimAttempt(attemptId);
  assert.equal(stored.has(PUD_CONFIG.claimAttemptStorageKey), false);
});

test("claim transit allows feature-disabled evidence but rejects expired, long-lived, or excess capabilities", () => {
  storeClaimCapabilities({
    claimActionCapability: "claim-capability-value-at-least-sixteen",
    claimExpiresAt: expiry(),
    evidenceCapabilities: [],
  });
  assert.deepEqual(takeClaimCapabilities().evidenceCapabilities, []);

  assert.throws(
    () => storeClaimCapabilities({
      claimActionCapability: "claim-capability-value-at-least-sixteen",
      claimExpiresAt: new Date(Date.now() - 1000).toISOString(),
    }),
    /claim authorization expiry is invalid/,
  );
  assert.throws(
    () => storeClaimCapabilities({
      claimActionCapability: "claim-capability-value-at-least-sixteen",
      claimExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    /claim authorization expiry is invalid/,
  );
  assert.throws(
    () => storeClaimCapabilities({
      claimActionCapability: "claim-capability-value-at-least-sixteen",
      claimExpiresAt: expiry(),
      evidenceCapabilities: Array.from({ length: 6 }, (_, index) => ({
        actionCapability: `evidence-capability-${index}-at-least-sixteen`,
        expiresAt: expiry(),
      })),
    }),
    /No more than five/,
  );

  stored.set(PUD_CONFIG.claimCapabilityStorageKey, JSON.stringify({
    claimActionCapability: "claim-capability-value-at-least-sixteen",
    claimExpiresAt: expiry(),
    evidenceCapabilities: [],
    attemptId: getOrCreateClaimAttemptId(),
    statusSession: "must-be-rejected",
  }));
  assert.equal(takeClaimCapabilities(), null);
});

test("claim attempt identity survives replacement capability bundles", async () => {
  const attemptId = getOrCreateClaimAttemptId();
  storeClaimCapabilities({
    claimActionCapability: "first-claim-capability-sixteen",
    claimExpiresAt: expiry(4),
    evidenceCapabilities: evidenceCapabilities(),
    attemptId,
  });
  assert.equal(takeClaimCapabilities().attemptId, attemptId);

  storeClaimCapabilities({
    claimActionCapability: "replacement-claim-capability-sixteen",
    claimExpiresAt: expiry(8),
    evidenceCapabilities: evidenceCapabilities(),
    attemptId: getOrCreateClaimAttemptId(),
  });
  assert.equal(takeClaimCapabilities().attemptId, attemptId);
  assert.equal(await stableActionKey("claim", attemptId), await stableActionKey("claim", attemptId));
});
