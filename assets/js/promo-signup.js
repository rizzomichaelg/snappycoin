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
    "meta_source",
    "meta_placement",
    "meta_campaign_id",
    "meta_adset_id",
    "meta_ad_id",
    "gclsrc",
    "gad_source",
    "gad_campaignid",
    "gad_adgroupid",
    "campaignid",
    "adgroupid",
    "creative",
    "keyword",
    "matchtype",
    "device",
    "network",
    "targetid",
    "loc_physical_ms",
    "loc_interest_ms",
    "adposition",
    "feeditemid",
    "extensionid",
    "ifmobile",
    "ifnotmobile",
    "devicemodel",
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "placement",
    "site_source_name",
    "fb_source",
    "fb_ref",
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
    turnstile: document.getElementById("promo-turnstile"),
    promoSection: document.querySelector("[data-promo-section]"),
    promoLayout: document.querySelector(".promo-embed-layout"),
    promoPaused: document.getElementById("promo-paused"),
    promoNavItem: document.getElementById("promo-nav-item"),
    heroPromoCta: document.getElementById("hero-promo-cta"),
    heroPlanCta: document.getElementById("hero-plan-cta"),
    newsletterForm: document.getElementById("newsletter-signup-form"),
    newsletterSubmit: document.getElementById("newsletter-submit"),
    newsletterMessage: document.getElementById("newsletter-message"),
    newsletterTurnstile: document.getElementById("newsletter-turnstile")
  };

  if (!els.form && !els.verifyForm && !els.newsletterForm) return;
  let claimRequestInFlight = false;
  let verifyRequestInFlight = false;
  let resendRequestInFlight = false;
  let newsletterRequestInFlight = false;
  let resendTimerId = 0;
  let promoIsActive = true;

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
    if (window.turnstile && els.turnstile) window.turnstile.reset(turnstileWidgetId(els.turnstile) || els.turnstile);
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

  function cookieValue(name) {
    const cookieText = document.cookie || "";
    const prefix = `${encodeURIComponent(name)}=`;
    const pair = cookieText
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.indexOf(prefix) === 0);
    if (!pair) return "";
    try {
      return decodeURIComponent(pair.slice(prefix.length));
    } catch (error) {
      return pair.slice(prefix.length);
    }
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

  function metaAttribution(currentSnapshot) {
    const analytics = window.SnappyAnalytics || {};
    const optionalCookieConsent =
      typeof analytics.hasOptionalCookieConsent === "function"
        ? analytics.hasOptionalCookieConsent()
        : false;

    return {
      meta_click_id: firstTouchAttribution.fbclid || currentSnapshot.fbclid || "",
      meta_fbp: cookieValue("_fbp"),
      meta_fbc: cookieValue("_fbc"),
      meta_optional_cookie_consent: optionalCookieConsent,
      meta_pixel_loaded: typeof window.fbq === "function"
    };
  }

  function googleAdsAttribution(currentSnapshot) {
    const analytics = window.SnappyAnalytics || {};
    const optionalCookieConsent =
      typeof analytics.hasOptionalCookieConsent === "function"
        ? analytics.hasOptionalCookieConsent()
        : false;

    return {
      google_click_id: firstTouchAttribution.gclid || currentSnapshot.gclid || "",
      google_gbraid: firstTouchAttribution.gbraid || currentSnapshot.gbraid || "",
      google_wbraid: firstTouchAttribution.wbraid || currentSnapshot.wbraid || "",
      google_gclsrc: firstTouchAttribution.gclsrc || currentSnapshot.gclsrc || "",
      google_ads_source: firstTouchAttribution.gad_source || currentSnapshot.gad_source || "",
      google_ads_campaign_id:
        firstTouchAttribution.gad_campaignid ||
        firstTouchAttribution.campaignid ||
        currentSnapshot.gad_campaignid ||
        currentSnapshot.campaignid ||
        "",
      google_ads_ad_group_id:
        firstTouchAttribution.gad_adgroupid ||
        firstTouchAttribution.adgroupid ||
        currentSnapshot.gad_adgroupid ||
        currentSnapshot.adgroupid ||
        "",
      google_gcl_aw: optionalCookieConsent ? cookieValue("_gcl_aw") : "",
      google_gcl_dc: optionalCookieConsent ? cookieValue("_gcl_dc") : "",
      google_gcl_au: optionalCookieConsent ? cookieValue("_gcl_au") : "",
      google_optional_cookie_consent: optionalCookieConsent,
      google_ads_loaded: typeof window.gtag === "function"
    };
  }

  function attribution() {
    const currentUrl = new URL(window.location.href);
    const referrer = document.referrer || "";
    const currentSnapshot = captureAttributionSnapshot();

    return {
      ...currentSnapshot,
      ...firstTouchAttribution,
      ...metaAttribution(currentSnapshot),
      ...googleAdsAttribution(currentSnapshot),
      current_url: currentUrl.href,
      current_path: pagePath(currentUrl),
      current_referrer: referrer,
      current_referrer_domain: referrerDomain(referrer),
      submitted_at: new Date().toISOString()
    };
  }

  function turnstileWidgetId(node) {
    if (!node) return "";
    return node.dataset.turnstileWidgetId || "";
  }

  function turnstileSiteKey() {
    return resolvedTurnstileSiteKey || els.turnstile?.dataset.turnstileSiteKey || "";
  }

  function turnstileToken(node) {
    if (window.turnstile && node) {
      const response = window.turnstile.getResponse(turnstileWidgetId(node) || node);
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

  function trackCouponClaimSuccess(data, formData) {
    const analytics = window.SnappyAnalytics;
    if (!analytics || typeof analytics.trackCouponClaimSuccess !== "function") return;

    const claimId = String(
      data.claimId ||
        formData.get("claimId") ||
        els.claimId?.value ||
        ""
    ).trim();

    try {
      analytics.trackCouponClaimSuccess({
        promotionSlug,
        claimId,
        successMarker: "coupon-claim-success"
      });
    } catch (_error) {
      // Tracking must never block a completed coupon claim.
    }
  }

  function turnstileHasVisibleWidget() {
    return !!document.querySelector("iframe[src*='challenges.cloudflare.com'], iframe[title*='Widget'], iframe[title*='Turnstile']");
  }

  function warnIfTurnstileMissing() {
    if (!promoIsActive || turnstileToken(els.turnstile) || turnstileWidgetId(els.turnstile) || turnstileHasVisibleWidget()) return;
    showMessage(
      els.message,
      "The security check did not load. Refresh the page or try a standard browser with content blockers disabled.",
      "error"
    );
  }

  function renderTurnstile(node, messageNode, callback) {
    const sitekey = turnstileSiteKey();
    if (!node) return;
    if (!sitekey) {
      showMessage(messageNode, "The security check is not configured. Please try again later.", "error");
      return;
    }
    if (turnstileWidgetId(node)) return;
    if (!window.turnstile) {
      window.setTimeout(() => renderTurnstile(node, messageNode, callback), 200);
      return;
    }
    const widgetId = window.turnstile.render(node, {
      sitekey,
      theme: "light",
      callback: function () {
        showMessage(messageNode, "", "info");
        if (callback) callback();
      }
    });
    node.dataset.turnstileWidgetId = widgetId;
  }

  function renderConfiguredTurnstiles() {
    if (promoIsActive) renderTurnstile(els.turnstile, els.message);
    renderTurnstile(els.newsletterTurnstile, els.newsletterMessage);
  }

  function setPromoActiveState(active) {
    promoIsActive = active;
    document.querySelectorAll("[data-promo-active-content]").forEach((node) => {
      node.hidden = !active;
    });
    if (els.promoPaused) els.promoPaused.hidden = active;
    if (els.promoLayout) els.promoLayout.classList.toggle("is-promo-hidden", !active);
    if (els.promoNavItem) els.promoNavItem.hidden = !active;
    if (els.heroPromoCta) {
      els.heroPromoCta.textContent = active ? "Claim Free Wash" : "Plan Your Visit";
      els.heroPromoCta.setAttribute("href", active ? "#free-weekday-wash" : "#contact-section");
    }
    if (els.heroPlanCta) {
      els.heroPlanCta.textContent = active ? "Plan Your Visit" : "Explore Services";
      els.heroPlanCta.setAttribute("href", active ? "#contact-section" : "#services");
    }
  }

  async function loadPromotion() {
    const data = await requestJson(`/api/promotions/${promotionSlug}/public`, { method: "GET" });
    const offer = document.getElementById("promo-offer");
    if (offer && data.offerLabel) offer.textContent = data.offerLabel;
    setPromoActiveState(data.active !== false);
    if (!resolvedTurnstileSiteKey && data.turnstileSiteKey) {
      resolvedTurnstileSiteKey = String(data.turnstileSiteKey);
    }
  }

  async function startClaim(event) {
    event.preventDefault();
    if (claimRequestInFlight) return;
    showMessage(els.message, "", "info");
    if (els.form && !els.form.reportValidity()) return;
    const token = turnstileToken(els.turnstile);
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
      if (window.turnstile && els.turnstile) window.turnstile.reset(turnstileWidgetId(els.turnstile) || els.turnstile);
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
          phoneCode: String(formData.get("phoneCode") || ""),
          attribution: attribution()
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
      trackCouponClaimSuccess(data, formData);
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

  async function joinNewsletter(event) {
    event.preventDefault();
    if (newsletterRequestInFlight) return;
    showMessage(els.newsletterMessage, "", "info");
    if (els.newsletterForm && !els.newsletterForm.reportValidity()) return;
    const token = turnstileToken(els.newsletterTurnstile);
    if (!token) {
      showMessageInView(els.newsletterMessage, "Please complete the verification challenge before joining.", "error");
      return;
    }

    const formData = new FormData(els.newsletterForm);
    const body = {
      firstName: String(formData.get("firstName") || ""),
      email: String(formData.get("email") || ""),
      source: "website_contact_section",
      emailMarketingConsent: true,
      turnstileToken: token,
      attribution: attribution()
    };

    try {
      newsletterRequestInFlight = true;
      setFormDisabled(els.newsletterForm, true);
      setBusy(els.newsletterSubmit, true, "Joining...");
      const data = await requestJson("/api/marketing/signup", {
        method: "POST",
        body: JSON.stringify(body)
      });
      if (els.newsletterForm && typeof els.newsletterForm.reset === "function") els.newsletterForm.reset();
      showMessageInView(els.newsletterMessage, data.message || "You're on the list.", "success");
      if (window.turnstile && els.newsletterTurnstile) {
        window.turnstile.reset(turnstileWidgetId(els.newsletterTurnstile) || els.newsletterTurnstile);
      }
    } catch (error) {
      showMessageInView(els.newsletterMessage, error.message, "error");
      if (window.turnstile && els.newsletterTurnstile) {
        window.turnstile.reset(turnstileWidgetId(els.newsletterTurnstile) || els.newsletterTurnstile);
      }
    } finally {
      newsletterRequestInFlight = false;
      setFormDisabled(els.newsletterForm, false);
      setBusy(els.newsletterSubmit, false, "Join email list");
    }
  }

  if (els.form) els.form.addEventListener("submit", startClaim);
  if (els.verifyForm) els.verifyForm.addEventListener("submit", verifyClaim);
  if (els.resend) els.resend.addEventListener("click", resendVerification);
  if (els.newsletterForm) els.newsletterForm.addEventListener("submit", joinNewsletter);
  loadPromotion()
    .catch((error) => {
      if (!turnstileSiteKey()) showMessage(els.message, error.message, "error");
    })
    .finally(renderConfiguredTurnstiles);
  window.setTimeout(warnIfTurnstileMissing, turnstileLoadWarningMs);
})();
