(function () {
  const promotionSlug = "free-weekday-wash";
  const isProductionHost = /(^|\.)snappycoinlaundry\.com$/i.test(window.location.hostname);
  const defaultApiBase = isProductionHost ? "https://api.snappycoinlaundry.com" : "https://api-staging.snappycoinlaundry.com";
  const config = window.SNAPPY_PROMO_CONFIG || {};
  const apiBase = (config.apiBase || defaultApiBase).replace(/\/+$/, "");
  let resolvedTurnstileSiteKey = config.turnstileSiteKey || "";
  const turnstileLoadWarningMs = 8000;
  const resendCooldownSeconds = 60;
  const attributionStorageKey = "snappyPromoFirstTouch";
  const attributionKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
    "gclid",
    "gbraid",
    "wbraid",
    "fbclid",
    "ttclid",
    "msclkid",
    "li_fat_id"
  ];

  const els = {
    form: document.getElementById("promo-signup-form"),
    verifyForm: document.getElementById("promo-verify-form"),
    message: document.getElementById("promo-message"),
    verifyMessage: document.getElementById("promo-verify-message"),
    submit: document.getElementById("promo-submit"),
    verifySubmit: document.getElementById("promo-verify-submit"),
    resend: document.getElementById("promo-resend"),
    resendStatus: document.getElementById("promo-resend-status"),
    verificationPanel: document.getElementById("promo-verification"),
    successPanel: document.getElementById("promo-success"),
    successMessage: document.getElementById("promo-success-message"),
    claimId: document.getElementById("promo-claim-id"),
    phoneCode: document.getElementById("promo-phoneCode"),
    turnstile: document.getElementById("promo-turnstile")
  };

  if (!els.form && !els.verifyForm) return;
  let claimRequestInFlight = false;
  let verifyRequestInFlight = false;
  let resendRequestInFlight = false;
  let resendTimerId = 0;

  function showMessage(node, text, variant) {
    if (!node) return;
    node.textContent = text || "";
    node.dataset.variant = variant || "info";
    node.hidden = !text;
  }

  function showMessageInView(node, text, variant) {
    showMessage(node, text, variant);
    if (text && node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    button.setAttribute("aria-busy", busy ? "true" : "false");
    if (label) button.textContent = label;
  }

  function setFormDisabled(form, disabled) {
    if (!form || typeof form.querySelectorAll !== "function") return;
    form.querySelectorAll("input, button, select, textarea").forEach((control) => {
      control.disabled = disabled;
    });
    form.setAttribute("aria-busy", disabled ? "true" : "false");
  }

  function setResendState(remainingSeconds) {
    if (!els.resend) return;
    if (remainingSeconds > 0) {
      els.resend.disabled = true;
      els.resend.textContent = `Resend code in ${remainingSeconds}s`;
      if (els.resendStatus) els.resendStatus.textContent = `Didn't get a text? You can resend in ${remainingSeconds}s.`;
    } else {
      els.resend.disabled = false;
      els.resend.textContent = "Resend code";
      if (els.resendStatus) els.resendStatus.textContent = "Didn't get a text? You can resend now.";
    }
  }

  function stopResendCooldown() {
    if (resendTimerId) {
      window.clearInterval(resendTimerId);
      resendTimerId = 0;
    }
  }

  function startResendCooldown(seconds) {
    let remaining = seconds || resendCooldownSeconds;
    stopResendCooldown();
    setResendState(remaining);
    resendTimerId = window.setInterval(() => {
      remaining -= 1;
      setResendState(remaining);
      if (remaining <= 0) stopResendCooldown();
    }, 1000);
  }

  function returnToSignup(message, variant) {
    stopResendCooldown();
    if (els.verificationPanel) els.verificationPanel.hidden = true;
    if (els.successPanel) els.successPanel.hidden = true;
    if (els.form) {
      els.form.hidden = false;
      setFormDisabled(els.form, false);
    }
    if (window.turnstile && els.turnstile) window.turnstile.reset(turnstileWidgetId() || els.turnstile);
    showMessageInView(els.message, message, variant || "error");
  }

  function browserStorage(name) {
    try {
      return window[name];
    } catch (error) {
      return null;
    }
  }

  function storageGet(storage, key) {
    if (!storage) return "";
    try {
      return storage.getItem(key);
    } catch (error) {
      return "";
    }
  }

  function storageSet(storage, key, value) {
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch (error) {
      // Storage may be unavailable in private browsing or strict privacy modes.
    }
  }

  function referrerDomain(referrer) {
    if (!referrer) return "";
    try {
      return new URL(referrer).hostname;
    } catch (error) {
      return "";
    }
  }

  function pagePath(url) {
    return `${url.pathname}${url.search}`;
  }

  function captureAttributionSnapshot() {
    const url = new URL(window.location.href);
    const referrer = document.referrer || "";
    const params = url.searchParams;
    const data = {
      landing_url: url.href,
      landing_path: pagePath(url),
      referrer,
      referrer_domain: referrerDomain(referrer),
      client_captured_at: new Date().toISOString()
    };

    attributionKeys.forEach((key) => {
      data[key] = params.get(key) || "";
    });

    return data;
  }

  function storedFirstTouchAttribution() {
    const localStore = browserStorage("localStorage");
    const sessionStore = browserStorage("sessionStorage");
    const stored =
      storageGet(localStore, attributionStorageKey) ||
      storageGet(sessionStore, attributionStorageKey);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (error) {
        // Fall through and replace malformed stored attribution.
      }
    }

    const firstTouch = captureAttributionSnapshot();
    const serialized = JSON.stringify(firstTouch);
    storageSet(localStore, attributionStorageKey, serialized);
    storageSet(sessionStore, attributionStorageKey, serialized);
    return firstTouch;
  }

  const firstTouchAttribution = storedFirstTouchAttribution();

  function attribution() {
    const currentUrl = new URL(window.location.href);
    const referrer = document.referrer || "";

    return {
      ...captureAttributionSnapshot(),
      ...firstTouchAttribution,
      current_url: currentUrl.href,
      current_path: pagePath(currentUrl),
      current_referrer: referrer,
      current_referrer_domain: referrerDomain(referrer),
      submitted_at: new Date().toISOString()
    };
  }

  function turnstileWidgetId() {
    if (!els.turnstile) return "";
    return els.turnstile.dataset.turnstileWidgetId || "";
  }

  function turnstileSiteKey() {
    return resolvedTurnstileSiteKey || els.turnstile?.dataset.turnstileSiteKey || "";
  }

  function turnstileToken() {
    if (window.turnstile && els.turnstile) {
      const response = window.turnstile.getResponse(turnstileWidgetId() || els.turnstile);
      if (response) return response;
    }
    const field = document.querySelector("[name='cf-turnstile-response']");
    return field ? field.value : "";
  }

  async function requestJson(path, options) {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(options && options.headers ? options.headers : {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || data.error || `Request failed with HTTP ${response.status}`);
      error.code = data.error || "";
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function turnstileHasVisibleWidget() {
    return !!document.querySelector("iframe[src*='challenges.cloudflare.com'], iframe[title*='Widget'], iframe[title*='Turnstile']");
  }

  function warnIfTurnstileMissing() {
    if (turnstileToken() || turnstileWidgetId() || turnstileHasVisibleWidget()) return;
    showMessage(
      els.message,
      "The security check did not load. Refresh the page or try a standard browser with content blockers disabled.",
      "error"
    );
  }

  function renderTurnstile() {
    const sitekey = turnstileSiteKey();
    if (!els.turnstile || !sitekey) {
      showMessage(els.message, "The security check is not configured. Please try again later.", "error");
      return;
    }
    if (turnstileWidgetId()) return;
    if (!window.turnstile) {
      window.setTimeout(renderTurnstile, 200);
      return;
    }
    const widgetId = window.turnstile.render(els.turnstile, {
      sitekey,
      theme: "light",
      callback: function () {
        showMessage(els.message, "", "info");
      }
    });
    els.turnstile.dataset.turnstileWidgetId = widgetId;
  }

  async function loadPromotion() {
    const data = await requestJson(`/api/promotions/${promotionSlug}/public`, { method: "GET" });
    const offer = document.getElementById("promo-offer");
    if (offer && data.offerLabel) offer.textContent = data.offerLabel;
    if (!resolvedTurnstileSiteKey && data.turnstileSiteKey) {
      resolvedTurnstileSiteKey = String(data.turnstileSiteKey);
    }
  }

  async function startClaim(event) {
    event.preventDefault();
    if (claimRequestInFlight) return;
    showMessage(els.message, "", "info");
    if (els.form && !els.form.reportValidity()) return;
    const token = turnstileToken();
    if (!token) {
      showMessageInView(els.message, "Please complete the verification challenge before submitting.", "error");
      return;
    }

    const formData = new FormData(els.form);
    const body = {
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      zip: String(formData.get("zip") || ""),
      emailMarketingConsent: formData.get("emailMarketingConsent") === "on",
      phoneVerificationConsent: formData.get("phoneVerificationConsent") === "on",
      turnstileToken: token,
      attribution: attribution()
    };

    try {
      claimRequestInFlight = true;
      setFormDisabled(els.form, true);
      setBusy(els.submit, true, "Sending code...");
      const data = await requestJson(`/api/promotions/${promotionSlug}/claim/start`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      els.claimId.value = data.claimId || "";
      els.form.hidden = true;
      els.verificationPanel.hidden = false;
      showMessage(els.verifyMessage, data.message || "Verification code sent. Enter the code from your text message.", "success");
      startResendCooldown(resendCooldownSeconds);
      els.verificationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      showMessageInView(els.message, error.message, "error");
      if (window.turnstile && els.turnstile) window.turnstile.reset(turnstileWidgetId() || els.turnstile);
    } finally {
      claimRequestInFlight = false;
      if (els.form && !els.form.hidden) {
        setFormDisabled(els.form, false);
        setBusy(els.submit, false, "Send verification code");
      }
    }
  }

  async function verifyClaim(event) {
    event.preventDefault();
    if (verifyRequestInFlight) return;
    showMessage(els.verifyMessage, "", "info");
    if (els.verifyForm && !els.verifyForm.reportValidity()) return;
    const formData = new FormData(els.verifyForm);
    try {
      verifyRequestInFlight = true;
      setFormDisabled(els.verifyForm, true);
      setBusy(els.verifySubmit, true, "Verifying...");
      const data = await requestJson(`/api/promotions/${promotionSlug}/claim/verify-phone`, {
        method: "POST",
        body: JSON.stringify({
          claimId: String(formData.get("claimId") || ""),
          phoneCode: String(formData.get("phoneCode") || "")
        })
      });
      if (els.successMessage) {
        els.successMessage.textContent = data.message || "Your coupon code was emailed.";
      }
      els.form.hidden = true;
      els.verificationPanel.hidden = true;
      if (els.successPanel) {
        els.successPanel.hidden = false;
        els.successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      stopResendCooldown();
    } catch (error) {
      showMessage(els.verifyMessage, error.message, "error");
    } finally {
      verifyRequestInFlight = false;
      if (els.verificationPanel && !els.verificationPanel.hidden) {
        setFormDisabled(els.verifyForm, false);
        setBusy(els.verifySubmit, false, "Verify and email coupon");
      }
    }
  }

  async function resendVerification(event) {
    event.preventDefault();
    if (resendRequestInFlight || !els.claimId?.value || els.resend?.disabled) return;
    try {
      resendRequestInFlight = true;
      setBusy(els.resend, true, "Sending...");
      const data = await requestJson(`/api/promotions/${promotionSlug}/claim/resend`, {
        method: "POST",
        body: JSON.stringify({
          claimId: String(els.claimId.value || "")
        })
      });
      if (els.phoneCode) els.phoneCode.value = "";
      showMessageInView(els.verifyMessage, data.message || "A new verification code was sent.", "success");
      startResendCooldown(resendCooldownSeconds);
    } catch (error) {
      if (error.code === "verification_expired" || error.status === 410) {
        returnToSignup(error.message || "Verification expired. Please submit the form again.", "error");
        return;
      }
      showMessageInView(els.verifyMessage, error.message, "error");
      setResendState(0);
    } finally {
      resendRequestInFlight = false;
    }
  }

  if (els.form) els.form.addEventListener("submit", startClaim);
  if (els.verifyForm) els.verifyForm.addEventListener("submit", verifyClaim);
  if (els.resend) els.resend.addEventListener("click", resendVerification);
  loadPromotion()
    .catch((error) => {
      if (!turnstileSiteKey()) showMessage(els.message, error.message, "error");
    })
    .finally(renderTurnstile);
  window.setTimeout(warnIfTurnstileMissing, turnstileLoadWarningMs);
})();
