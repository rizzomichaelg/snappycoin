(function () {
  const promotionSlug = "free-weekday-wash";
  const defaultApiBase = "https://api.snappycoinlaundry.com";
  const config = window.SNAPPY_PROMO_CONFIG || {};
  const apiBase = (config.apiBase || defaultApiBase).replace(/\/+$/, "");
  const turnstileSiteKey = config.turnstileSiteKey || "";
  const turnstileLoadWarningMs = 8000;

  const els = {
    form: document.getElementById("promo-signup-form"),
    verifyForm: document.getElementById("promo-verify-form"),
    message: document.getElementById("promo-message"),
    verifyMessage: document.getElementById("promo-verify-message"),
    submit: document.getElementById("promo-submit"),
    verifySubmit: document.getElementById("promo-verify-submit"),
    verificationPanel: document.getElementById("promo-verification"),
    claimId: document.getElementById("promo-claim-id"),
    turnstile: document.getElementById("promo-turnstile")
  };

  function showMessage(node, text, variant) {
    if (!node) return;
    node.textContent = text || "";
    node.dataset.variant = variant || "info";
    node.hidden = !text;
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    button.disabled = busy;
    if (label) button.textContent = label;
  }

  function attribution() {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id", "gclid", "fbclid"];
    const data = {
      landing_url: url.href,
      landing_path: `${url.pathname}${url.search ? "?..." : ""}`,
      referrer: document.referrer || "",
      client_captured_at: new Date().toISOString()
    };
    keys.forEach((key) => {
      const value = params.get(key);
      if (value) data[key] = value;
    });
    return data;
  }

  function turnstileToken() {
    if (window.turnstile && els.turnstile) {
      const response = window.turnstile.getResponse(els.turnstile);
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
      throw new Error(data.message || data.error || `Request failed with HTTP ${response.status}`);
    }
    return data;
  }

  async function loadPromotion() {
    const data = await requestJson(`/api/promotions/${promotionSlug}/public`, { method: "GET" });
    const offer = document.getElementById("promo-offer");
    if (offer && data.offerLabel) offer.textContent = data.offerLabel;
  }

  function turnstileHasVisibleWidget() {
    return !!document.querySelector("iframe[src*='challenges.cloudflare.com'], iframe[title*='Widget'], iframe[title*='Turnstile']");
  }

  function warnIfTurnstileMissing() {
    if (turnstileToken() || turnstileHasVisibleWidget()) return;
    showMessage(
      els.message,
      "The security check did not load. Refresh the page or try a standard browser with content blockers disabled.",
      "error"
    );
  }

  function renderTurnstile() {
    if (!els.turnstile || !turnstileSiteKey) {
      showMessage(els.message, "The security check is not configured. Please try again later.", "error");
      return;
    }
    if (!window.turnstile) {
      window.setTimeout(renderTurnstile, 200);
      return;
    }
    window.turnstile.render(els.turnstile, {
      sitekey: turnstileSiteKey,
      theme: "light"
    });
  }

  async function startClaim(event) {
    event.preventDefault();
    showMessage(els.message, "", "info");
    const token = turnstileToken();
    if (!token) {
      showMessage(els.message, "Please complete the verification challenge before submitting.", "error");
      return;
    }

    const formData = new FormData(els.form);
    const body = {
      firstName: String(formData.get("firstName") || ""),
      lastName: String(formData.get("lastName") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      zip: String(formData.get("zip") || ""),
      community: String(formData.get("community") || ""),
      emailMarketingConsent: formData.get("emailMarketingConsent") === "on",
      phoneVerificationConsent: formData.get("phoneVerificationConsent") === "on",
      turnstileToken: token,
      attribution: attribution()
    };

    try {
      setBusy(els.submit, true, "Sending code...");
      const data = await requestJson(`/api/promotions/${promotionSlug}/claim/start`, {
        method: "POST",
        body: JSON.stringify(body)
      });
      els.claimId.value = data.claimId || "";
      els.verificationPanel.hidden = false;
      showMessage(els.message, data.message || "Verification code sent.", "success");
      els.verificationPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      showMessage(els.message, error.message, "error");
      if (window.turnstile && els.turnstile) window.turnstile.reset(els.turnstile);
    } finally {
      setBusy(els.submit, false, "Send verification code");
    }
  }

  async function verifyClaim(event) {
    event.preventDefault();
    showMessage(els.verifyMessage, "", "info");
    const formData = new FormData(els.verifyForm);
    try {
      setBusy(els.verifySubmit, true, "Verifying...");
      const data = await requestJson(`/api/promotions/${promotionSlug}/claim/verify-phone`, {
        method: "POST",
        body: JSON.stringify({
          claimId: String(formData.get("claimId") || ""),
          phoneCode: String(formData.get("phoneCode") || "")
        })
      });
      showMessage(els.verifyMessage, data.message || "Your coupon code was emailed.", "success");
      els.form.hidden = true;
      els.verifyForm.hidden = true;
    } catch (error) {
      showMessage(els.verifyMessage, error.message, "error");
    } finally {
      setBusy(els.verifySubmit, false, "Verify and email coupon");
    }
  }

  if (els.form) els.form.addEventListener("submit", startClaim);
  if (els.verifyForm) els.verifyForm.addEventListener("submit", verifyClaim);
  loadPromotion().catch((error) => showMessage(els.message, error.message, "error"));
  renderTurnstile();
  window.setTimeout(warnIfTurnstileMissing, turnstileLoadWarningMs);
})();
