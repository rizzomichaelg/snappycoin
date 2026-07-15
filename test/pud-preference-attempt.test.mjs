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
const { completePreferenceAttempt, getOrCreatePreferenceAttemptId } = await import("../assets/js/pud-preference-attempt.js");
const { stableActionKey } = await import("../assets/js/pud-idempotency.js");

test("preference retries reuse only a non-secret attempt id until completion", async () => {
  const attemptId = getOrCreatePreferenceAttemptId();
  assert.match(attemptId, /^preference-attempt:/);
  assert.equal(getOrCreatePreferenceAttemptId(), attemptId);

  const persisted = JSON.parse(stored.get(PUD_CONFIG.preferenceAttemptStorageKey));
  assert.deepEqual(Object.keys(persisted).sort(), ["attemptId", "createdAt"]);
  assert.equal(JSON.stringify(persisted).match(/token|session|proof|capability|detergent|softener/i), null);
  assert.equal(await stableActionKey("preferences", attemptId), await stableActionKey("preferences", attemptId));

  completePreferenceAttempt(attemptId);
  assert.equal(stored.has(PUD_CONFIG.preferenceAttemptStorageKey), false);
  assert.notEqual(getOrCreatePreferenceAttemptId(), attemptId);
});
