import { autocompleteAddress, checkAddress, selectAutocompleteAddress } from "./pud-api.js";

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
  const result = await checkAddress({ address, ...(turnstileToken ? { turnstileToken } : {}), attribution });
  return { address, result };
}

export function displayAddress(address) {
  if (!address) return "";
  return [address.line1, address.line2, [address.city, address.state, address.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
}

export function enableAddressAutocomplete(form, enabled) {
  if (!enabled) return;
  const line1 = form.elements.namedItem("line1");
  const list = form.querySelector("[data-address-autocomplete-list]");
  const status = form.querySelector("[data-address-autocomplete-status]");
  if (!(line1 instanceof HTMLInputElement) || !(list instanceof HTMLDataListElement) || !(status instanceof HTMLElement)) return;
  const sessionToken = createAutocompleteSessionToken();
  let choices = new Map();
  let requestController = null;
  let timer = null;

  const clearSuggestions = () => {
    choices = new Map();
    list.replaceChildren();
  };
  const choose = async (placeId) => {
    requestController?.abort();
    status.textContent = "Filling in your address…";
    try {
      const result = await selectAutocompleteAddress({ placeId, sessionToken });
      const address = result.address;
      for (const [name, value] of Object.entries(address)) {
        const field = form.elements.namedItem(name);
        if (field instanceof HTMLInputElement) field.value = value;
      }
      status.textContent = "Address selected. Please confirm the unit number, if any.";
      clearSuggestions();
    } catch (_error) {
      status.textContent = "Address suggestions are unavailable. Enter the address manually.";
    }
  };
  const loadSuggestions = async () => {
    const query = line1.value.trim();
    if (query.length < 3) {
      clearSuggestions();
      status.textContent = "";
      return;
    }
    requestController?.abort();
    requestController = new AbortController();
    try {
      const result = await autocompleteAddress({ query, sessionToken }, { signal: requestController.signal, timeoutMs: 8_000 });
      if (line1.value.trim() !== query) return;
      choices = new Map(result.suggestions.map((suggestion) => [suggestion.text, suggestion.placeId]));
      list.replaceChildren(...result.suggestions.map((suggestion) => {
        const option = document.createElement("option");
        option.value = suggestion.text;
        return option;
      }));
      status.textContent = result.suggestions.length ? "Choose an address suggestion or continue entering it manually." : "";
    } catch (error) {
      if (error?.code === "PUD_CLIENT_ABORTED") return;
      clearSuggestions();
      status.textContent = "Address suggestions are unavailable. Enter the address manually.";
    }
  };
  line1.addEventListener("input", () => {
    const placeId = choices.get(line1.value.trim());
    if (placeId) {
      void choose(placeId);
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void loadSuggestions(); }, 250);
  });
}

function createAutocompleteSessionToken() {
  const token = globalThis.crypto?.randomUUID?.().replace(/-/g, "");
  if (token) return token;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
