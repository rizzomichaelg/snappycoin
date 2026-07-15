import { PUD_CONFIG } from "./pud-config.js";

const attemptTtlMs = 24 * 60 * 60 * 1000;

/**
 * Keeps a non-secret logical preference mutation identifier stable while
 * short-lived action capabilities are refreshed. No order, session, proof,
 * capability, or preference value is stored here.
 */
export function getOrCreatePreferenceAttemptId() {
  const existing = readAttempt();
  if (existing) return existing.attemptId;
  const attemptId = newAttemptId();
  try {
    sessionStorage.setItem(PUD_CONFIG.preferenceAttemptStorageKey, JSON.stringify({ attemptId, createdAt: Date.now() }));
  } catch (_error) {
    throw new Error("This browser could not create protected preference retry state.");
  }
  return attemptId;
}

export function completePreferenceAttempt(attemptId) {
  try {
    const current = readAttempt();
    if (current?.attemptId === attemptId) sessionStorage.removeItem(PUD_CONFIG.preferenceAttemptStorageKey);
  } catch (_error) { /* optional cleanup */ }
}

function readAttempt() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PUD_CONFIG.preferenceAttemptStorageKey) || "null");
    if (!value || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt > attemptTtlMs) {
      sessionStorage.removeItem(PUD_CONFIG.preferenceAttemptStorageKey);
      return null;
    }
    assertAttemptId(value.attemptId);
    return value;
  } catch (_error) {
    try { sessionStorage.removeItem(PUD_CONFIG.preferenceAttemptStorageKey); } catch (_ignored) { /* optional */ }
    return null;
  }
}

function newAttemptId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `preference-attempt:${uuid}`;
  if (!globalThis.crypto?.getRandomValues) throw new Error("Secure preference retry protection is unavailable in this browser.");
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return `preference-attempt:${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function assertAttemptId(value) {
  if (typeof value !== "string" || !/^preference-attempt:[A-Za-z0-9-]{16,80}$/.test(value)) {
    throw new TypeError("The preference attempt identifier is invalid.");
  }
}
