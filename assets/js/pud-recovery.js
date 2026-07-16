import { getPublicConfig, startStatusRecovery, verifyStatusRecovery } from "./pud-api.js";
import { PUD_CONFIG } from "./pud-config.js";
import { normalizeUsPhone } from "./pud-phone.js";
import { translateExternalText, withLocalePath } from "./site-i18n.js";

const root = document.querySelector("[data-recovery-root]");

if (root && window.top !== window.self) {
  root.replaceChildren(Object.assign(document.createElement("p"), {
    className: "pud-alert",
    textContent: "Private recovery pages cannot be opened inside another site.",
  }));
} else if (root) {
  history.replaceState(null, "", withLocalePath(location.pathname));
  const startPanel = root.querySelector("[data-recovery-start]");
  const codePanel = root.querySelector("[data-recovery-code]");
  const completePanel = root.querySelector("[data-recovery-complete]");
  const completeActions = root.querySelector("[data-complete-actions]");
  const startForm = root.querySelector("[data-recovery-start-form]");
  const codeForm = root.querySelector("[data-recovery-code-form]");
  let recoveryId = "";
  let recoveryExpiresAt = 0;
  let turnstileSiteKey = "";
  let expiryTimer = 0;
  let submitting = false;

  window.addEventListener("pagehide", clearMemory, { once: true });
  root.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="restart"]')) restart();
  });

  startForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    let phone;
    try {
      phone = normalizeUsPhone(startForm.elements.namedItem("phone").value);
    } catch (error) {
      showMessage(error?.message || "Enter a valid mobile number.");
      return;
    }
    const email = String(startForm.elements.namedItem("email").value || "").trim();
    let turnstileToken;
    try {
      turnstileToken = turnstileValue(startForm);
    } catch (error) {
      showMessage(error.message);
      return;
    }
    setBusy(startForm, true);
    submitting = true;
    try {
      const result = await startStatusRecovery({ email, phone, turnstileToken });
      recoveryId = result.recoveryId;
      recoveryExpiresAt = Date.parse(result.expiresAt);
      startForm.reset();
      resetTurnstile(startForm);
      root.querySelector("[data-phone-last4]").textContent = result.phoneLast4;
      startPanel.hidden = true;
      codePanel.hidden = false;
      completePanel.hidden = true;
      completeActions.hidden = true;
      showMessage(result.message, "success");
      codeForm.elements.namedItem("code").focus();
      scheduleExpiry();
    } catch (error) {
      resetTurnstile(startForm);
      showMessage(error?.message || "The verification request could not be started. Try again.");
    } finally {
      submitting = false;
      setBusy(startForm, false);
    }
  });

  codeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!recoveryId || recoveryExpiresAt <= Date.now()) {
      restart("This recovery request expired. Start again for a new code.");
      return;
    }
    const code = String(codeForm.elements.namedItem("code").value || "").trim();
    if (!/^\d{4,10}$/.test(code)) {
      showMessage("Enter the numeric verification code from the text message.");
      return;
    }
    setBusy(codeForm, true);
    submitting = true;
    try {
      const result = await verifyStatusRecovery(recoveryId, code);
      if (result.verified) {
        clearMemory();
        codeForm.reset();
        startPanel.hidden = true;
        codePanel.hidden = true;
        completePanel.hidden = false;
        completeActions.hidden = false;
        showMessage(result.message, "success");
        completePanel.focus?.();
      } else if (result.complete) {
        restart(result.message);
      } else {
        codeForm.elements.namedItem("code").value = "";
        showMessage(result.message);
        codeForm.elements.namedItem("code").focus();
      }
    } catch (error) {
      showMessage(error?.message || "The code could not be checked. Try again.");
    } finally {
      submitting = false;
      setBusy(codeForm, false);
    }
  });

  initialize().catch((error) => disableRecovery(error?.message || "Private-link recovery is unavailable right now."));

  async function initialize() {
    const config = await getPublicConfig();
    if (!config.statusRecoveryEnabled) throw new Error("Private-link recovery is not available right now. Call the store if you need help with an order.");
    await setupTurnstile(config.turnstileSiteKey);
    ensureTurnstile(startForm);
  }

  function restart(text = "") {
    clearMemory();
    codeForm.reset();
    codePanel.hidden = true;
    completePanel.hidden = true;
    completeActions.hidden = true;
    startPanel.hidden = false;
    resetTurnstile(startForm);
    if (text) showMessage(text);
    else clearMessage();
    startForm.elements.namedItem("email").focus();
  }

  function clearMemory() {
    recoveryId = "";
    recoveryExpiresAt = 0;
    if (expiryTimer) window.clearTimeout(expiryTimer);
    expiryTimer = 0;
  }

  function scheduleExpiry() {
    if (expiryTimer) window.clearTimeout(expiryTimer);
    const delay = Math.max(0, Math.min(recoveryExpiresAt - Date.now(), 15 * 60 * 1000));
    expiryTimer = window.setTimeout(() => restart("This recovery request expired. Start again for a new code."), delay);
  }

  function disableRecovery(text) {
    startForm.querySelectorAll("input, button").forEach((control) => { control.disabled = true; });
    showMessage(text);
  }

  function setBusy(form, busy) {
    form.setAttribute("aria-busy", String(busy));
    form.querySelectorAll("button").forEach((control) => { control.disabled = busy; });
  }

  function showMessage(text, variant = "error") {
    const node = root.querySelector("[data-message]");
    node.textContent = translateExternalText(text);
    node.dataset.variant = variant;
    node.hidden = !text;
    if (text) node.focus();
  }

  function clearMessage() {
    showMessage("");
  }

  async function setupTurnstile(siteKey) {
    if (!siteKey) throw new Error("Phone verification protection is not configured.");
    turnstileSiteKey = siteKey;
    if (globalThis.turnstile) return;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${PUD_CONFIG.turnstileScript}"]`);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("The anti-bot check could not load.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = PUD_CONFIG.turnstileScript;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("The anti-bot check could not load.")), { once: true });
      document.head.append(script);
    });
  }

  function ensureTurnstile(form) {
    const node = form.querySelector("[data-turnstile]");
    if (!node || node.dataset.widgetId || !globalThis.turnstile?.render) return;
    let widgetId;
    const resetWithMessage = (text, delay = 0) => {
      showMessage(text);
      window.setTimeout(() => {
        try { globalThis.turnstile.reset(widgetId); } catch (_error) { /* widget may be gone */ }
      }, delay);
    };
    widgetId = globalThis.turnstile.render(node, {
      sitekey: turnstileSiteKey,
      theme: "light",
      "error-callback": () => resetWithMessage("The anti-bot check could not complete. It has been reset; please try again.", 500),
      "expired-callback": () => resetWithMessage("The anti-bot check expired. Complete the refreshed check and try again."),
      "timeout-callback": () => resetWithMessage("The anti-bot check timed out. Complete the refreshed check and try again."),
    });
    node.dataset.widgetId = String(widgetId);
  }

  function turnstileValue(form) {
    const value = String(new FormData(form).get("cf-turnstile-response") || "");
    if (!value) throw new Error("Complete the anti-bot check and try again.");
    return value;
  }

  function resetTurnstile(form) {
    const widget = form.querySelector("[data-turnstile]");
    if (!widget?.dataset.widgetId || !globalThis.turnstile?.reset) return;
    try { globalThis.turnstile.reset(widget.dataset.widgetId); } catch (_error) { /* no-op */ }
  }
}
