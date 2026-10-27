import { PUD_CONFIG } from "./pud-config.js";

const transitTtlMs = 10 * 60 * 1000;
const clockSkewMs = 30 * 1000;
const attemptTtlMs = 24 * 60 * 60 * 1000;

/**
 * Carries already-purpose-bound claim capabilities across a same-tab page
 * navigation. The status token, verified session, phone proof, and form data
 * are deliberately excluded. The claim page removes this entry before use.
 */
export function getOrCreateClaimAttemptId() {
  const existing = readAttempt();
  if (existing) return existing.attemptId;
  const attemptId = newAttemptId();
  try {
    sessionStorage.setItem(PUD_CONFIG.claimAttemptStorageKey, JSON.stringify({ attemptId, createdAt: Date.now() }));
  } catch (_error) {
    throw new Error("This browser could not create a protected claim attempt.");
  }
  return attemptId;
}

export function storeClaimCapabilities({
  claimActionCapability,
  claimExpiresAt,
  evidenceCapabilities = [],
  attemptId = getOrCreateClaimAttemptId(),
}) {
  if (typeof claimActionCapability !== "string" || claimActionCapability.length < 16) {
    throw new TypeError("A valid claim authorization is required.");
  }
  assertAttemptId(attemptId);
  assertExpiry(claimExpiresAt, "claim");
  if (!Array.isArray(evidenceCapabilities) || evidenceCapabilities.length > 5) {
    throw new TypeError("No more than five evidence authorizations may be carried.");
  }
  const value = {
    claimActionCapability,
    claimExpiresAt,
    evidenceCapabilities: evidenceCapabilities.map((capability) => {
      if (!capability || typeof capability.actionCapability !== "string" || capability.actionCapability.length < 16) {
        throw new TypeError("A valid evidence authorization is required.");
      }
      assertExpiry(capability.expiresAt, "evidence");
      return { actionCapability: capability.actionCapability, expiresAt: capability.expiresAt };
    }),
    attemptId,
  };
  try {
    sessionStorage.setItem(PUD_CONFIG.claimCapabilityStorageKey, JSON.stringify(value));
  } catch (_error) {
    throw new Error("This browser could not open the protected claim form.");
  }
}

export function takeClaimCapabilities() {
  let raw = "";
  try {
    raw = sessionStorage.getItem(PUD_CONFIG.claimCapabilityStorageKey) || "";
    sessionStorage.removeItem(PUD_CONFIG.claimCapabilityStorageKey);
  } catch (_error) {
    return null;
  }
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value.claimActionCapability !== "string" || value.claimActionCapability.length < 16) return null;
    const allowedKeys = new Set(["claimActionCapability", "claimExpiresAt", "evidenceCapabilities", "attemptId"]);
    if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null;
    assertAttemptId(value.attemptId);
    assertExpiry(value.claimExpiresAt, "claim");
    const result = {
      claimActionCapability: value.claimActionCapability,
      claimExpiresAt: value.claimExpiresAt,
      evidenceCapabilities: [],
      attemptId: value.attemptId,
    };
    if (!Array.isArray(value.evidenceCapabilities) || value.evidenceCapabilities.length > 5) return null;
    result.evidenceCapabilities = Object.freeze(value.evidenceCapabilities.map((capability) => {
      if (Object.keys(capability || {}).some((key) => !["actionCapability", "expiresAt"].includes(key))) return null;
      if (!capability || typeof capability.actionCapability !== "string" || capability.actionCapability.length < 16) {
        throw new TypeError("A valid evidence authorization is required.");
      }
      assertExpiry(capability.expiresAt, "evidence");
      return Object.freeze({ actionCapability: capability.actionCapability, expiresAt: capability.expiresAt });
    }));
    if (result.evidenceCapabilities.some((capability) => capability === null)) return null;
    return Object.freeze(result);
  } catch (_error) {
    return null;
  }
}

export function clearClaimCapability() {
  try { sessionStorage.removeItem(PUD_CONFIG.claimCapabilityStorageKey); } catch (_error) { /* optional */ }
}

export function completeClaimAttempt(attemptId) {
  try {
    const current = readAttempt();
    if (current?.attemptId === attemptId) sessionStorage.removeItem(PUD_CONFIG.claimAttemptStorageKey);
  } catch (_error) { /* optional cleanup */ }
}

function readAttempt() {
  try {
    const value = JSON.parse(sessionStorage.getItem(PUD_CONFIG.claimAttemptStorageKey) || "null");
    if (!value || !Number.isFinite(value.createdAt) || Date.now() - value.createdAt > attemptTtlMs) {
      sessionStorage.removeItem(PUD_CONFIG.claimAttemptStorageKey);
      return null;
    }
    assertAttemptId(value.attemptId);
    return value;
  } catch (_error) {
    try { sessionStorage.removeItem(PUD_CONFIG.claimAttemptStorageKey); } catch (_ignored) { /* optional */ }
    return null;
  }
}

function newAttemptId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `claim-attempt:${uuid}`;
  if (!globalThis.crypto?.getRandomValues) throw new Error("Secure claim retry protection is unavailable in this browser.");
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return `claim-attempt:${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function assertAttemptId(value) {
  if (typeof value !== "string" || !/^claim-attempt:[A-Za-z0-9-]{16,80}$/.test(value)) {
    throw new TypeError("The claim attempt identifier is invalid.");
  }
}

function assertExpiry(value, label) {
  const expiry = Date.parse(value);
  if (!Number.isFinite(expiry) || expiry <= Date.now() || expiry - Date.now() > transitTtlMs + clockSkewMs) {
    throw new TypeError(`The ${label} authorization expiry is invalid.`);
  }
}
