import { autocompleteAddress, checkAddress, selectAutocompleteAddress } from "./pud-api.js";

export function addressFromForm(form) {
  const data = new FormData(form);
  return normalizeAddressEntry({
    line1: data.get("line1"),
    line2: data.get("line2"),
    city: data.get("city"),
    state: data.get("state"),
    postalCode: data.get("postalCode"),
  });
}

export function normalizeAddressEntry(input) {
  let line1 = String(input.line1 || "").trim().replace(/\s+/g, " ");
  let line2 = String(input.line2 || "").trim().replace(/\s+/g, " ");
  if (/^(?:n\/?a|none|not applicable)$/i.test(line2)) line2 = "";
  const unitToken = unitIdentifier(line2);
  if (unitToken) {
    // Customers commonly enter the apartment in both fields. Remove repeated
    // trailing unit phrases from line 1 while preserving the dedicated field.
    let match = trailingUnit(line1);
    while (match && match.token === unitToken) {
      line1 = line1.slice(0, match.index).replace(/[\s,]+$/, "");
      match = trailingUnit(line1);
    }
  }
  return {
    line1,
    ...(line2 ? { line2 } : {}),
    city: String(input.city || "").trim().replace(/\s+/g, " "),
    state: String(input.state || "MO").trim().toUpperCase(),
    postalCode: String(input.postalCode || "").trim(),
  };
}

function unitIdentifier(value) {
  const match = String(value || "").match(/(?:^|\s)(?:apt(?:artment)?|unit|#)?\s*#?\s*([A-Za-z0-9-]+)\s*$/i);
  return match?.[1]?.toUpperCase() || "";
}

function trailingUnit(value) {
  const match = /(?:\s|,)+(?:apt(?:artment)?|unit|#)\s*#?\s*([A-Za-z0-9-]+)\s*$/i.exec(value);
  return match ? { index: match.index, token: match[1].toUpperCase() } : null;
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
  if (!(line1 instanceof HTMLInputElement) || !(list instanceof HTMLElement) || !(status instanceof HTMLElement)) return;
  const sessionToken = createAutocompleteSessionToken();
  let choices = new Map();
  let requestController = null;
  let timer = null;

  const clearSuggestions = () => {
    choices = new Map();
    list.replaceChildren();
    list.hidden = true;
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
      form.dataset.addressSuggestionSelected = "true";
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
      choices = new Map(result.suggestions.map((suggestion) => [suggestion.placeId, suggestion]));
      list.replaceChildren(...result.suggestions.map((suggestion) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "pud-address-suggestion";
        option.dataset.placeId = suggestion.placeId;
        option.setAttribute("role", "option");
        option.append(
          Object.assign(document.createElement("span"), { textContent: suggestion.text }),
          Object.assign(document.createElement("strong"), { textContent: "Use this address" })
        );
        return option;
      }));
      list.hidden = result.suggestions.length === 0;
      status.textContent = result.suggestions.length ? "Select the correct address below. This helps us confirm your pickup location." : "No close match found. Check the address or continue for staff review.";
    } catch (error) {
      if (error?.code === "PUD_CLIENT_ABORTED") return;
      clearSuggestions();
      status.textContent = "Address suggestions are unavailable. Enter the address manually.";
    }
  };
  line1.addEventListener("input", () => {
    delete form.dataset.addressSuggestionSelected;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void loadSuggestions(); }, 250);
  });
  list.addEventListener("click", (event) => {
    const option = event.target.closest("[data-place-id]");
    if (!option || !choices.has(option.dataset.placeId)) return;
    void choose(option.dataset.placeId);
  });
}

function createAutocompleteSessionToken() {
  const token = globalThis.crypto?.randomUUID?.().replace(/-/g, "");
  if (token) return token;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
