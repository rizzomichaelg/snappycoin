const WDF_PICKUP_BOOKING_STORAGE_PREFIX = "snappyWdfPickupBookingCompleted:v1";
const firedThisPage = new Set();

export function fireWdfPickupBookingCompleted({
  orderNumber,
  duplicate = false,
  gtag = globalThis.window?.gtag,
  localStore = browserStorage("localStorage"),
  sessionStore = browserStorage("sessionStorage"),
} = {}) {
  if (duplicate === true) return false;
  const normalizedOrderNumber = String(orderNumber || "").trim().toUpperCase();
  if (!/^PUD-[A-Z0-9-]{8,60}$/.test(normalizedOrderNumber)) return false;

  const key = `${WDF_PICKUP_BOOKING_STORAGE_PREFIX}:${normalizedOrderNumber}`;
  if (
    firedThisPage.has(key) ||
    storageGet(sessionStore, key) === "1" ||
    storageGet(localStore, key) === "1"
  ) return false;
  if (typeof gtag !== "function") return false;

  gtag("event", "conversion", { send_to: "AW-18256973572/iBh5CJP45OIcEISezYFE" });
  firedThisPage.add(key);
  storageSet(sessionStore, key, "1");
  storageSet(localStore, key, "1");
  return true;
}

function browserStorage(name) {
  try { return globalThis.window?.[name] || null; }
  catch (_error) { return null; }
}

function storageGet(storage, key) {
  try { return storage?.getItem(key) || ""; }
  catch (_error) { return ""; }
}

function storageSet(storage, key, value) {
  try { storage?.setItem(key, value); }
  catch (_error) { /* Storage is optional; the in-page guard still applies. */ }
}
