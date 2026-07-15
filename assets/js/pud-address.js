import { checkAddress } from "./pud-api.js";

export function addressFromForm(form) {
  const data = new FormData(form);
  const line2 = String(data.get("line2") || "").trim();
  return {
    line1: String(data.get("line1") || "").trim(),
    ...(line2 ? { line2 } : {}),
    city: String(data.get("city") || "").trim(),
    state: String(data.get("state") || "MO").trim().toUpperCase(),
    postalCode: String(data.get("postalCode") || "").trim(),
  };
}

export async function validateAddress(form, turnstileToken, attribution) {
  const address = addressFromForm(form);
  const result = await checkAddress({ address, turnstileToken, attribution });
  return { address, result };
}

export function displayAddress(address) {
  if (!address) return "";
  return [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}
