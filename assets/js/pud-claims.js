import { createClaim } from "./pud-api.js";
import { stableActionKey } from "./pud-idempotency.js";

const form = document.querySelector("[data-pud-claim-form]");
if (form && window.top !== window.self) {
  form.replaceChildren(Object.assign(document.createElement("p"), { className: "pud-alert", textContent: "Private claim pages cannot be opened inside another site." }));
} else if (form) {
  let token = "";
  let submitting = false;
  try { token = decodeURIComponent(location.hash.slice(1)); } catch (_error) { /* invalid private link */ }
  history.replaceState(null, "", `${location.pathname}${token ? `#${encodeURIComponent(token)}` : ""}`);
  const message = document.querySelector("[data-message]");
  if (!token) {
    show("Use the private claim link from your order status page.");
    form.querySelector("button[type=submit]").disabled = true;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!token) { show("Use the private claim link from your order status page."); return; }
    const data = new FormData(form);
    const button = form.querySelector("button[type=submit]");
    submitting = true;
    button.disabled = true;
    try {
      const input = {
        claimType: String(data.get("claimType") || "other"),
        description: String(data.get("description") || "").trim(),
        requestedAmountCents: data.get("requestedAmount") ? Math.round(Number(data.get("requestedAmount")) * 100) : undefined,
      };
      // stableActionKey persists only a compact fingerprint, never this token or form text.
      const key = await stableActionKey("claim", JSON.stringify([token, input]));
      const result = await createClaim(token, input, key);
      form.replaceChildren(Object.assign(document.createElement("p"), { textContent: result.message || "Your claim was received. We will contact you after review." }));
    } catch (error) { show(error.message); }
    finally { submitting = false; button.disabled = false; }
  });
  function show(text) { message.textContent = text; message.hidden = !text; }
}
