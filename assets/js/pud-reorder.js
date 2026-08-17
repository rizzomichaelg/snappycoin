import { PUD_CONFIG } from "./pud-config.js";

const ttlMs = 30 * 60 * 1000;

export function storeReorderBootstrap(value) {
  assertBootstrap(value);
  try {
    sessionStorage.setItem(PUD_CONFIG.reorderStorageKey, JSON.stringify({ savedAt: Date.now(), value }));
  } catch (_error) {
    throw new Error("This browser could not carry the reorder details to a new booking.");
  }
}

export function takeReorderBootstrap() {
  let payload = null;
  try {
    payload = JSON.parse(sessionStorage.getItem(PUD_CONFIG.reorderStorageKey) || "null");
  } catch (_error) {
    return null;
  }
  if (!payload || !Number.isFinite(payload.savedAt) || Date.now() - payload.savedAt > ttlMs) {
    clearReorderBootstrap();
    return null;
  }
  try {
    assertBootstrap(payload.value);
    return payload.value;
  } catch (_error) {
    clearReorderBootstrap();
    return null;
  }
}

export function clearReorderBootstrap() {
  try { sessionStorage.removeItem(PUD_CONFIG.reorderStorageKey); } catch (_error) { /* optional */ }
}

export function prefillReorderAddress(form, bootstrap) {
  if (!form || !bootstrap) return;
  for (const field of ["line1", "line2", "city", "state", "postalCode"]) {
    const control = form.elements.namedItem(field);
    if (control) control.value = bootstrap.address[field] || "";
  }
}

export function prefillReorderDetails(form, bootstrap) {
  if (!form || !bootstrap) return;
  const values = {
    firstName: bootstrap.customer.firstName,
    lastName: bootstrap.customer.lastName,
    email: bootstrap.customer.email || "",
    detergent: bootstrap.preferences.detergent,
    softenerPref: bootstrap.preferences.softenerPref,
    specialInstructions: bootstrap.preferences.specialInstructions || "",
    accessNotes: bootstrap.preferences.accessNotes || "",
  };
  for (const [field, value] of Object.entries(values)) {
    const control = form.elements.namedItem(field);
    if (!control) continue;
    if (control instanceof HTMLSelectElement && ![...control.options].some((option) => option.value === value)) {
      const label = String(value).replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
      control.add(new Option(label, value));
    }
    control.value = value;
  }
  const unattended = form.elements.namedItem("unattendedPickup");
  if (unattended) unattended.checked = Boolean(bootstrap.preferences.unattendedPickup);
}

function assertBootstrap(value) {
  if (!value || typeof value !== "object" || value.nextStep !== "address_check") throw new TypeError("Invalid reorder bootstrap.");
  if (!value.customer || !value.address || !value.preferences) throw new TypeError("Incomplete reorder bootstrap.");
  if (value.requiresPhoneVerification !== true || value.requiresPaymentSetup !== true) throw new TypeError("Unsafe reorder bootstrap.");
  if (value.recurringProposalId !== undefined && (typeof value.recurringProposalId !== "string" || !value.recurringProposalId)) {
    throw new TypeError("Invalid recurring proposal bootstrap.");
  }
  if (value.preferredRouteId !== undefined && (typeof value.preferredRouteId !== "string" || !value.preferredRouteId)) {
    throw new TypeError("Invalid preferred route bootstrap.");
  }
}
