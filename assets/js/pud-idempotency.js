import { randomIdempotencyKey } from "./pud-api.js";

const storageKey = "snappyPudActionKeysV1";
const ttlMs = 24 * 60 * 60 * 1000;
const maxEntries = 40;
let memoryEntries = {};

/**
 * Returns one browser-session key for the same logical action. Only a compact
 * non-reversible fingerprint is persisted; tokens, client secrets, proofs, and
 * form text never enter storage.
 */
export async function stableActionKey(scope, signature = "") {
  const entryKey = `${safeScope(scope)}:${await fingerprint(String(signature))}`;
  const entries = readEntries();
  const existing = entries[entryKey];
  if (existing?.key && Number.isFinite(existing.createdAt) && Date.now() - existing.createdAt <= ttlMs) {
    return existing.key;
  }
  const key = randomIdempotencyKey(`pud-${safeScope(scope)}`);
  entries[entryKey] = { key, createdAt: Date.now() };
  writeEntries(entries);
  return key;
}

export async function retireActionKey(scope, signature = "") {
  const entryKey = `${safeScope(scope)}:${await fingerprint(String(signature))}`;
  const entries = readEntries();
  if (!Object.hasOwn(entries, entryKey)) return;
  delete entries[entryKey];
  writeEntries(entries);
}

function readEntries() {
  let parsed = {};
  try {
    const candidate = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) parsed = candidate;
  } catch (_error) { /* memory fallback */ }
  const fresh = Object.entries({ ...memoryEntries, ...parsed })
    .filter(([, value]) => value && typeof value.key === "string" && Number.isFinite(value.createdAt) && Date.now() - value.createdAt <= ttlMs)
    .sort((left, right) => right[1].createdAt - left[1].createdAt)
    .slice(0, maxEntries);
  memoryEntries = Object.fromEntries(fresh);
  return { ...memoryEntries };
}

function writeEntries(entries) {
  memoryEntries = { ...entries };
  try { sessionStorage.setItem(storageKey, JSON.stringify(memoryEntries)); } catch (_error) { /* memory fallback remains */ }
}

function safeScope(value) {
  return String(value || "action").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "action";
}

async function fingerprint(value) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure retry protection is unavailable in this browser.");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
