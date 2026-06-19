const fs = require("fs");
const vm = require("vm");

const attributionKeys = [
  "landing_url",
  "landing_path",
  "referrer",
  "referrer_domain",
  "client_captured_at",
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class StorageMock {
  constructor() {
    this.items = new Map();
  }

  getItem(key) {
    return this.items.has(key) ? this.items.get(key) : null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }
}

class ElementMock {
  constructor(id, options = {}) {
    this.id = id;
    this.dataset = {};
    this.hidden = !!options.hidden;
    this.value = options.value || "";
    this.textContent = options.textContent || "";
    this.listeners = {};
    this.fields = options.fields || {};
    this.disabled = false;
    this.valid = options.valid !== false;
    this.scrolledIntoView = false;
    this.attributes = {};
    this.controls = options.controls || [];
    this.classList = {
      toggles: {},
      toggle: (name, force) => {
        this.classList.toggles[name] = force === undefined ? !this.classList.toggles[name] : !!force;
      }
    };
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  reportValidity() {
    return this.valid;
  }

  scrollIntoView() {
    this.scrolledIntoView = true;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  reset() {
    Object.keys(this.fields).forEach((key) => {
      this.fields[key] = "";
    });
  }

  querySelectorAll() {
    return this.controls;
  }
}

class FormDataMock {
  constructor(form) {
    this.fields = form.fields || {};
  }

  get(name) {
    return Object.prototype.hasOwnProperty.call(this.fields, name) ? this.fields[name] : "";
  }
}

function makeDocument(formFields = {}) {
  const elements = {
    "promo-signup-form": new ElementMock("promo-signup-form", { fields: formFields }),
    "promo-verify-form": new ElementMock("promo-verify-form", {
      fields: {
        claimId: "claim_test",
        phoneCode: "123456"
      }
    }),
    "promo-message": new ElementMock("promo-message", { hidden: true }),
    "promo-verify-message": new ElementMock("promo-verify-message", { hidden: true }),
    "promo-submit": new ElementMock("promo-submit", { textContent: "Send verification code" }),
    "promo-verify-submit": new ElementMock("promo-verify-submit", { textContent: "Verify and email coupon" }),
    "promo-resend": new ElementMock("promo-resend", { textContent: "Resend code in 60s" }),
    "promo-resend-status": new ElementMock("promo-resend-status", { textContent: "Didn't get a text? You can resend in 60s." }),
    "promo-verification": new ElementMock("promo-verification", { hidden: true }),
    "promo-success": new ElementMock("promo-success", { hidden: true }),
    "promo-success-message": new ElementMock("promo-success-message"),
    "promo-claim-id": new ElementMock("promo-claim-id"),
    "promo-phoneCode": new ElementMock("promo-phoneCode", { value: "123456" }),
    "promo-turnstile": new ElementMock("promo-turnstile"),
    "promo-offer": new ElementMock("promo-offer"),
    "promo-paused": new ElementMock("promo-paused", { hidden: true }),
    "promo-nav-item": new ElementMock("promo-nav-item"),
    "hero-promo-cta": new ElementMock("hero-promo-cta", { textContent: "Claim Free Wash" }),
    "hero-plan-cta": new ElementMock("hero-plan-cta", { textContent: "Plan Your Visit" }),
    "newsletter-signup-form": new ElementMock("newsletter-signup-form", {
      fields: {
        firstName: "Ada",
        email: "ada@example.test"
      }
    }),
    "newsletter-submit": new ElementMock("newsletter-submit", { textContent: "Join email list" }),
    "newsletter-message": new ElementMock("newsletter-message", { hidden: true }),
    "newsletter-turnstile": new ElementMock("newsletter-turnstile"),
    "promo-section": new ElementMock("promo-section"),
    "promo-layout": new ElementMock("promo-layout"),
    "promo-copy": new ElementMock("promo-copy"),
    "promo-card": new ElementMock("promo-card")
  };
  elements["promo-signup-form"].controls = [elements["promo-submit"]];
  elements["promo-verify-form"].controls = [elements["promo-phoneCode"], elements["promo-verify-submit"], elements["promo-resend"]];
  elements["newsletter-signup-form"].controls = [
    elements["newsletter-submit"],
    elements["newsletter-turnstile"]
  ];

  return {
    referrer: "https://ads.example/campaign",
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector(selector) {
      if (selector === "[data-promo-section]") return elements["promo-section"];
      if (selector === ".promo-embed-layout") return elements["promo-layout"];
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-promo-active-content]") return [elements["promo-copy"], elements["promo-card"]];
      return [];
    }
  };
}

function runConfigForHost(hostname) {
  const configCode = fs.readFileSync("assets/js/promo-config.js", "utf8");
  const context = {
    window: {
      location: { hostname }
    }
  };
  vm.createContext(context);
  vm.runInContext(configCode, context);
  return context.window.SNAPPY_PROMO_CONFIG;
}

async function runSignupScenario(fetchHandler, options = {}) {
  const signupCode = fs.readFileSync("assets/js/promo-signup.js", "utf8");
  const firstUrl = "http://127.0.0.1:5500/?utm_source=google&utm_medium=cpc&utm_campaign=freewash&utm_content=ad1&utm_term=laundry&utm_id=utm-1&gclid=gclid-1&gbraid=gbraid-1&wbraid=wbraid-1&fbclid=fbclid-1&ttclid=ttclid-1&msclkid=msclkid-1&li_fat_id=li-1#free-weekday-wash";
  const currentUrl = options.currentUrl || firstUrl;
  const localStorage = options.localStorage || new StorageMock();
  const sessionStorage = options.sessionStorage || new StorageMock();
  const analyticsCalls = [];
  if (options.firstTouch) {
    const serialized = JSON.stringify(options.firstTouch);
    localStorage.setItem("snappyPromoFirstTouch", serialized);
    sessionStorage.setItem("snappyPromoFirstTouch", serialized);
  }
  const formFields = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.test",
    phone: "+15555550123",
    zip: "63043",
    phoneVerificationConsent: "on",
    emailMarketingConsent: ""
  };
  const document = makeDocument(formFields);
  const timers = [];
  const intervals = [];
  const window = {
    SNAPPY_PROMO_CONFIG: {
      apiBase: "https://api-staging.snappycoinlaundry.com",
      turnstileSiteKey: "0x4AAAAAADVlAL_Y3ES5Jk6-"
    },
    location: {
      href: currentUrl,
      hostname: "127.0.0.1",
      pathname: "/",
      search: new URL(currentUrl).search,
      hash: "#free-weekday-wash"
    },
    localStorage,
    sessionStorage,
    SnappyAnalytics: options.SnappyAnalytics || {
      trackCouponClaimSuccess(details) {
        analyticsCalls.push(details);
      }
    },
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
    setInterval(fn) {
      intervals.push(fn);
      return intervals.length;
    },
    clearInterval() {},
    turnstile: {
      render(node) {
        node.dataset.turnstileWidgetId = "widget_1";
        return "widget_1";
      },
      getResponse() {
        return "turnstile-token";
      },
      reset() {}
    }
  };

  const fetchCalls = [];
  const context = {
    URL,
    FormData: FormDataMock,
    document,
    fetch: async (url, options = {}) => {
      fetchCalls.push({ url, options });
      return fetchHandler(url, options);
    },
    window
  };
  vm.createContext(context);
  vm.runInContext(signupCode, context);

  for (let i = 0; i < 10; i += 1) await Promise.resolve();

  for (const timer of timers.splice(0)) timer();

  if (options.autoSubmit !== false) {
    await document.elements["promo-signup-form"].listeners.submit({
      preventDefault() {}
    });
  }

  await Promise.resolve();

  return { document, fetchCalls, localStorage, sessionStorage, analyticsCalls };
}

async function runSiteAnalyticsScenario() {
  const analyticsCode = fs.readFileSync("assets/js/site-analytics.js", "utf8");
  const localStorage = new StorageMock();
  const sessionStorage = new StorageMock();
  const scripts = [];
  const bodyListeners = {};
  const document = {
    readyState: "complete",
    title: "Snappy Coin Laundry",
    body: {
      addEventListener(type, handler) {
        bodyListeners[type] = handler;
      }
    },
    head: {
      appendChild(script) {
        scripts.push(script);
        if (typeof script.onload === "function") script.onload();
        return script;
      }
    },
    createElement(tagName) {
      return {
        tagName: String(tagName || "").toUpperCase(),
        async: false,
        src: "",
        onload: null,
        onerror: null,
        addEventListener(type, handler) {
          if (type === "load") this.onload = handler;
          if (type === "error") this.onerror = handler;
        }
      };
    },
    querySelector(selector) {
      if (selector.includes("connect.facebook.net/en_US/fbevents.js")) {
        return scripts.find((script) => script.src === "https://connect.facebook.net/en_US/fbevents.js") || null;
      }
      if (selector.includes("googletagmanager.com/gtag/js")) {
        return scripts.find((script) => script.src.includes("googletagmanager.com/gtag/js")) || null;
      }
      return null;
    },
    getElementsByTagName(tagName) {
      if (String(tagName).toLowerCase() !== "script") return [];
      return [
        {
          parentNode: {
            insertBefore(script) {
              scripts.unshift(script);
              if (typeof script.onload === "function") script.onload();
            }
          }
        }
      ];
    },
    addEventListener() {}
  };
  const window = {
    location: {
      protocol: "https:",
      href: "https://snappycoinlaundry.com/#free-weekday-wash"
    },
    localStorage,
    sessionStorage
  };
  const context = {
    document,
    window
  };
  vm.createContext(context);
  vm.runInContext(analyticsCode, context);
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
  return { bodyListeners, document, localStorage, scripts, sessionStorage, window };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

function verifyStaticPage() {
  const html = fs.readFileSync("index.html", "utf8");
  const redirectHtml = fs.readFileSync("promos/free-weekday-wash/index.html", "utf8");
  const privacyHtml = fs.readFileSync("privacy.html", "utf8");
  const termsHtml = fs.readFileSync("terms.html", "utf8");
  const cookiesHtml = fs.readFileSync("cookies.html", "utf8");
  const configIndex = html.indexOf("assets/js/promo-config.js");
  const turnstileIndex = html.indexOf("challenges.cloudflare.com/turnstile/v0/api.js");
  const signupIndex = html.indexOf("assets/js/promo-signup.js");
  assert(configIndex > -1, "promo config script is missing");
  assert(turnstileIndex > -1, "Turnstile script is missing");
  assert(signupIndex > -1, "promo signup script is missing");
  assert(configIndex < turnstileIndex, "promo config must load before Turnstile");
  assert(turnstileIndex < signupIndex, "Turnstile must load before promo signup script");
  assert(!html.includes("data-turnstile-site-key"), "HTML must not hardcode the staging Turnstile key");
  assert(html.includes('name="phoneVerificationConsent" required'), "phone verification consent must remain required");
  assert(html.includes('name="emailMarketingConsent"'), "email marketing consent must remain separate");
  assert(html.includes("July 6-30, 2026; Monday-Thursday"), "promo date range is missing");
  assert(html.includes("Redeem between 9 AM and 6 PM"), "promo redemption hours are missing");
  assert(!html.includes("Redeem between 9 AM and 7 PM"), "old promo redemption hours are still present");
  assert(html.includes("Send me future Snappy Coin Laundry deals"), "email marketing consent wording is missing");
  assert(html.includes('id="newsletter-signup-form"'), "newsletter signup form is missing");
  assert(!/name=["']attribution/i.test(html), "attribution must not be exposed as a hidden field");
  assert(html.includes("assets/js/site-analytics.js?v=20260619"), "global analytics script is missing from main page");
  assert(html.includes("connect.facebook.net"), "main page CSP must allow Meta Pixel script");
  assert(html.includes("www.facebook.com"), "main page CSP must allow Meta Pixel beacon");
  assert(html.includes("1554256442781789"), "main page Meta Pixel noscript fallback is missing");
  assert(redirectHtml.includes("../../assets/js/site-analytics.js?v=20260619"), "global analytics script is missing from promo redirect page");
  assert(redirectHtml.includes("connect.facebook.net"), "promo redirect CSP must allow Meta Pixel script");
  assert(redirectHtml.includes("1554256442781789"), "promo redirect Meta Pixel noscript fallback is missing");
  assert(html.includes('href="privacy.html"'), "footer privacy policy link is missing");
  assert(html.includes('href="terms.html"'), "footer terms link is missing");
  assert(html.includes('href="cookies.html"'), "footer cookie statement link is missing");
  assert(html.includes("styles.css?v=20260619"), "main stylesheet cache buster was not updated");
  assert(privacyHtml.includes("Privacy Policy"), "privacy page heading is missing");
  assert(privacyHtml.includes("SMS verification is used only to confirm"), "privacy page must explain SMS verification");
  assert(privacyHtml.includes("We do not send your name, email"), "privacy page must describe Meta Lead privacy limits");
  assert(privacyHtml.includes("assets/js/site-analytics.js?v=20260619"), "privacy page must load global analytics");
  assert(privacyHtml.includes("1554256442781789"), "privacy page Meta Pixel fallback is missing");
  assert(termsHtml.includes("Terms of Use"), "terms page heading is missing");
  assert(termsHtml.includes("limited to one per"), "terms page must describe promo claim limit");
  assert(termsHtml.includes("not integrated with DexterPay"), "terms page must preserve manual redemption boundary");
  assert(termsHtml.includes("assets/js/site-analytics.js?v=20260619"), "terms page must load global analytics");
  assert(cookiesHtml.includes("Cookie Statement"), "cookie statement heading is missing");
  assert(cookiesHtml.includes("Meta Pixel"), "cookie statement must describe Meta Pixel");
  assert(cookiesHtml.includes("It does not include your name, email address, phone number"), "cookie statement must describe Lead event PII limits");
  assert(cookiesHtml.includes("assets/js/site-analytics.js?v=20260619"), "cookie page must load global analytics");
}

async function verifySignupStartPayload() {
  const { document, fetchCalls, localStorage, sessionStorage, analyticsCalls } = await runSignupScenario((url, options) => {
    if (url.endsWith("/public")) {
      return jsonResponse(200, {
        offerLabel: "One free 20- or 30-pound washer load",
        turnstileSiteKey: "0x4AAAAAADVlAL_Y3ES5Jk6-"
      });
    }
    if (url.endsWith("/claim/start")) {
      return jsonResponse(200, {
        claimId: "claim_test",
        message: "Verification code sent."
      });
    }
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  const claimCall = fetchCalls.find((call) => call.url.endsWith("/claim/start"));
  assert(claimCall, "claim/start was not called");
  assert(
    claimCall.url === "https://api-staging.snappycoinlaundry.com/api/promotions/free-weekday-wash/claim/start",
    "claim/start URL is incorrect"
  );

  const body = JSON.parse(claimCall.options.body);
  assert(body.turnstileToken === "turnstile-token", "Turnstile token was not included");
  assert(!Object.prototype.hasOwnProperty.call(body, "community"), "community should not be submitted");
  assert(body.phoneVerificationConsent === true, "phone verification consent was not included");
  assert(body.emailMarketingConsent === false, "email marketing consent should be separate and false here");
  assert(body.attribution && typeof body.attribution === "object", "attribution object is missing");
  for (const key of attributionKeys) {
    assert(Object.prototype.hasOwnProperty.call(body.attribution, key), `missing attribution key ${key}`);
  }
  assert(body.attribution.utm_source === "google", "first-touch utm_source was not captured");
  assert(body.attribution.utm_medium === "cpc", "first-touch utm_medium was not captured");
  assert(body.attribution.utm_campaign === "freewash", "first-touch utm_campaign was not captured");
  assert(body.attribution.gclid === "gclid-1", "first-touch gclid was not captured");
  assert(body.attribution.referrer_domain === "ads.example", "first-touch referrer domain was not captured");
  assert(body.attribution.current_url.includes("127.0.0.1:5500"), "current URL was not captured at submit");
  assert(localStorage.getItem("snappyPromoFirstTouch"), "first-touch attribution was not persisted to localStorage");
  assert(sessionStorage.getItem("snappyPromoFirstTouch"), "first-touch attribution was not persisted to sessionStorage");
  assert(document.elements["promo-claim-id"].value === "claim_test", "claim ID was not stored for verification");
  assert(document.elements["promo-signup-form"].hidden === true, "signup form should hide while awaiting SMS verification");
  assert(document.elements["promo-verification"].hidden === false, "verification panel did not open");
  assert(document.elements["promo-verify-message"].textContent === "Verification code sent.", "verification step did not show SMS sent message");
  assert(document.elements["promo-resend"].disabled === true, "resend button should start disabled");
  assert(document.elements["promo-resend"].textContent === "Resend code in 60s", "resend button did not show cooldown");
  assert(analyticsCalls.length === 0, "Lead tracking must not fire when only an SMS verification code is sent");
}

async function verifyPhoneVerificationPayload() {
  const { document, fetchCalls, analyticsCalls } = await runSignupScenario((url) => {
    if (url.endsWith("/public")) return jsonResponse(200, {});
    if (url.endsWith("/claim/start")) {
      return jsonResponse(200, {
        claimId: "claim_test",
        message: "Verification code sent."
      });
    }
    if (url.endsWith("/claim/verify-phone")) {
      return jsonResponse(200, {
        message: "Your coupon code was emailed."
      });
    }
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  await document.elements["promo-verify-form"].listeners.submit({
    preventDefault() {}
  });

  const verifyCall = fetchCalls.find((call) => call.url.endsWith("/claim/verify-phone"));
  assert(verifyCall, "verify-phone was not called");
  assert(
    verifyCall.url === "https://api-staging.snappycoinlaundry.com/api/promotions/free-weekday-wash/claim/verify-phone",
    "verify-phone URL is incorrect"
  );

  const body = JSON.parse(verifyCall.options.body);
  assert(body.claimId === "claim_test", "verify-phone claim ID was not included");
  assert(body.phoneCode === "123456", "verify-phone SMS code was not included");
  assert(document.elements["promo-success"].hidden === false, "success panel did not open after verification");
  assert(document.elements["promo-success-message"].textContent === "Your coupon code was emailed.", "verify success message was not displayed");
  assert(document.elements["promo-signup-form"].hidden === true, "signup form did not hide after verification");
  assert(document.elements["promo-verification"].hidden === true, "verification panel did not hide after verification");
  assert(analyticsCalls.length === 1, "Lead tracking must fire once after backend-confirmed verification success");
  assert(analyticsCalls[0].promotionSlug === "free-weekday-wash", "Lead tracking promotion slug is incorrect");
  assert(analyticsCalls[0].claimId === "claim_test", "Lead tracking should use the backend claim ID");
  assert(!Object.prototype.hasOwnProperty.call(analyticsCalls[0], "email"), "Lead tracking must not receive email");
  assert(!Object.prototype.hasOwnProperty.call(analyticsCalls[0], "phone"), "Lead tracking must not receive phone");
  assert(!Object.prototype.hasOwnProperty.call(analyticsCalls[0], "phoneCode"), "Lead tracking must not receive verification code");
}

async function verifyPhoneVerificationFailureDoesNotTrack() {
  const { document, analyticsCalls } = await runSignupScenario((url) => {
    if (url.endsWith("/public")) return jsonResponse(200, {});
    if (url.endsWith("/claim/start")) {
      return jsonResponse(200, {
        claimId: "claim_test",
        message: "Verification code sent."
      });
    }
    if (url.endsWith("/claim/verify-phone")) {
      return jsonResponse(400, {
        ok: false,
        error: "invalid_verification_code",
        message: "Invalid verification code."
      });
    }
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  await document.elements["promo-verify-form"].listeners.submit({
    preventDefault() {}
  });

  assert(document.elements["promo-success"].hidden === true, "success panel must not open after failed verification");
  assert(document.elements["promo-verify-message"].textContent === "Invalid verification code.", "failed verification message was not displayed");
  assert(analyticsCalls.length === 0, "Lead tracking must not fire after failed verification");
}

async function verifyFirstTouchPersistence() {
  const firstTouch = {
    landing_url: "http://127.0.0.1:5500/?utm_source=first&utm_medium=cpc&gclid=first-click#free-weekday-wash",
    landing_path: "/?utm_source=first&utm_medium=cpc&gclid=first-click",
    referrer: "https://first.example/ad",
    referrer_domain: "first.example",
    client_captured_at: "2026-05-28T00:00:00.000Z",
    utm_source: "first",
    utm_medium: "cpc",
    utm_campaign: "launch",
    utm_content: "hero",
    utm_term: "laundry",
    utm_id: "first-utm",
    gclid: "first-click",
    gbraid: "",
    wbraid: "",
    fbclid: "",
    ttclid: "",
    msclkid: "",
    li_fat_id: ""
  };
  const { fetchCalls } = await runSignupScenario(
    (url) => {
      if (url.endsWith("/public")) return jsonResponse(200, {});
      if (url.endsWith("/claim/start")) {
        return jsonResponse(200, {
          claimId: "claim_test",
          message: "Verification code sent."
        });
      }
      throw new Error(`Unexpected fetch URL ${url}`);
    },
    {
      firstTouch,
      currentUrl: "http://127.0.0.1:5500/?utm_source=second&utm_medium=email&gclid=second-click#free-weekday-wash"
    }
  );

  const claimCall = fetchCalls.find((call) => call.url.endsWith("/claim/start"));
  const body = JSON.parse(claimCall.options.body);
  assert(body.attribution.utm_source === "first", "first-touch utm_source was not preserved");
  assert(body.attribution.gclid === "first-click", "first-touch gclid was not preserved");
  assert(body.attribution.current_url.includes("utm_source=second"), "current submit URL was not included");
}

async function verifyDuplicateMessagePassthrough() {
  const duplicateMessage = "This offer has already been claimed.";
  const { document } = await runSignupScenario((url) => {
    if (url.endsWith("/public")) return jsonResponse(200, {});
    if (url.endsWith("/claim/start")) {
      return jsonResponse(409, {
        ok: false,
        error: "duplicate_claim",
        message: duplicateMessage
      });
    }
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  assert(document.elements["promo-message"].textContent === duplicateMessage, "duplicate message was not displayed as returned");
  assert(document.elements["promo-message"].scrolledIntoView === true, "submit error message was not scrolled into view");
}

async function verifyResendPayload() {
  const { document, fetchCalls } = await runSignupScenario((url) => {
    if (url.endsWith("/public")) return jsonResponse(200, {});
    if (url.endsWith("/claim/start")) return jsonResponse(200, { claimId: "claim_test", message: "Verification code sent." });
    if (url.endsWith("/claim/resend")) return jsonResponse(200, { claimId: "claim_test", message: "A new verification code was sent." });
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  document.elements["promo-resend"].disabled = false;
  await document.elements["promo-resend"].listeners.click({ preventDefault() {} });

  const resendCall = fetchCalls.find((call) => call.url.endsWith("/claim/resend"));
  assert(resendCall, "claim/resend was not called");
  assert(
    resendCall.url === "https://api-staging.snappycoinlaundry.com/api/promotions/free-weekday-wash/claim/resend",
    "claim/resend URL is incorrect"
  );
  const body = JSON.parse(resendCall.options.body);
  assert(body.claimId === "claim_test", "resend claim ID was not included");
  assert(document.elements["promo-verify-message"].textContent === "A new verification code was sent.", "resend success message was not displayed");
  assert(document.elements["promo-resend"].disabled === true, "resend button did not restart cooldown");
  assert(document.elements["promo-resend"].textContent === "Resend code in 60s", "resend cooldown text did not restart");
}

async function verifyInactivePromotionHidesClaimUi() {
  const { document, fetchCalls } = await runSignupScenario(
    (url) => {
      if (url.endsWith("/public")) {
        return jsonResponse(200, {
          active: false,
          offerLabel: "One free 20- or 30-pound washer load",
          turnstileSiteKey: "0x4AAAAAADVlAL_Y3ES5Jk6-"
        });
      }
      throw new Error(`Unexpected fetch URL ${url}`);
    },
    { autoSubmit: false }
  );

  assert(!fetchCalls.some((call) => call.url.endsWith("/claim/start")), "inactive promo should not submit a claim during load");
  assert(document.elements["promo-copy"].hidden === true, "promo copy should hide when inactive");
  assert(document.elements["promo-card"].hidden === true, "promo claim card should hide when inactive");
  assert(document.elements["promo-paused"].hidden === false, "promo paused panel should show when inactive");
  assert(document.elements["promo-nav-item"].hidden === true, "free wash nav item should hide when inactive");
  assert(document.elements["hero-promo-cta"].textContent === "Plan Your Visit", "hero primary CTA should change when inactive");
  assert(document.elements["hero-promo-cta"].attributes.href === "#contact-section", "hero primary CTA href should change when inactive");
  assert(document.elements["hero-plan-cta"].textContent === "Explore Services", "hero secondary CTA should change when inactive");
  assert(document.elements["promo-layout"].classList.toggles["is-promo-hidden"] === true, "inactive layout class should apply");
}

async function verifyNewsletterSignupPayload() {
  const { document, fetchCalls } = await runSignupScenario(
    (url) => {
      if (url.endsWith("/public")) {
        return jsonResponse(200, {
          active: true,
          turnstileSiteKey: "0x4AAAAAADVlAL_Y3ES5Jk6-"
        });
      }
      if (url.endsWith("/api/marketing/signup")) {
        return jsonResponse(200, {
          ok: true,
          message: "You're on the list."
        });
      }
      throw new Error(`Unexpected fetch URL ${url}`);
    },
    { autoSubmit: false }
  );

  await document.elements["newsletter-signup-form"].listeners.submit({
    preventDefault() {}
  });

  const signupCall = fetchCalls.find((call) => call.url.endsWith("/api/marketing/signup"));
  assert(signupCall, "newsletter signup endpoint was not called");
  assert(
    signupCall.url === "https://api-staging.snappycoinlaundry.com/api/marketing/signup",
    "newsletter signup URL is incorrect"
  );
  const body = JSON.parse(signupCall.options.body);
  assert(body.email === "ada@example.test", "newsletter email was not included");
  assert(body.firstName === "Ada", "newsletter first name was not included");
  assert(body.emailMarketingConsent === true, "newsletter consent should be explicit");
  assert(body.source === "website_contact_section", "newsletter source was not included");
  assert(body.turnstileToken === "turnstile-token", "newsletter Turnstile token was not included");
  assert(body.attribution && typeof body.attribution === "object", "newsletter attribution was not included");
  assert(document.elements["newsletter-message"].textContent === "You're on the list.", "newsletter success message was not displayed");
}

async function verifyStartSubmitGuard() {
  let startCount = 0;
  let resolveStart;
  const startResponse = new Promise((resolve) => {
    resolveStart = resolve;
  });
  const { document } = await runSignupScenario(
    async (url) => {
      if (url.endsWith("/public")) return jsonResponse(200, {});
      if (url.endsWith("/claim/start")) {
        startCount += 1;
        return startResponse;
      }
      throw new Error(`Unexpected fetch URL ${url}`);
    },
    { autoSubmit: false }
  );

  const firstSubmit = document.elements["promo-signup-form"].listeners.submit({ preventDefault() {} });
  const secondSubmit = document.elements["promo-signup-form"].listeners.submit({ preventDefault() {} });
  await Promise.resolve();
  assert(startCount === 1, "claim/start should ignore duplicate submissions while in flight");
  assert(document.elements["promo-submit"].disabled === true, "claim/start button was not disabled while in flight");
  resolveStart(jsonResponse(200, { claimId: "claim_test", message: "Verification code sent." }));
  await firstSubmit;
  await secondSubmit;
}

async function verifyPhoneVerificationSubmitGuard() {
  let verifyCount = 0;
  let resolveVerify;
  const verifyResponse = new Promise((resolve) => {
    resolveVerify = resolve;
  });
  const { document, analyticsCalls } = await runSignupScenario(async (url) => {
    if (url.endsWith("/public")) return jsonResponse(200, {});
    if (url.endsWith("/claim/start")) return jsonResponse(200, { claimId: "claim_test", message: "Verification code sent." });
    if (url.endsWith("/claim/verify-phone")) {
      verifyCount += 1;
      return verifyResponse;
    }
    throw new Error(`Unexpected fetch URL ${url}`);
  });

  const firstSubmit = document.elements["promo-verify-form"].listeners.submit({ preventDefault() {} });
  const secondSubmit = document.elements["promo-verify-form"].listeners.submit({ preventDefault() {} });
  await Promise.resolve();
  assert(verifyCount === 1, "verify-phone should ignore duplicate submissions while in flight");
  assert(document.elements["promo-verify-submit"].disabled === true, "verify button was not disabled while in flight");
  resolveVerify(jsonResponse(200, { message: "Your coupon code was emailed." }));
  await firstSubmit;
  await secondSubmit;
  assert(analyticsCalls.length === 1, "Lead tracking must fire once for duplicate verify submissions sharing one backend success");
}

async function verifySiteAnalyticsMetaPixel() {
  const { localStorage, scripts, sessionStorage, window } = await runSiteAnalyticsScenario();
  assert(typeof window.fbq === "function", "Meta Pixel fbq function was not initialized");
  assert(
    scripts.some((script) => script.src === "https://connect.facebook.net/en_US/fbevents.js"),
    "Meta Pixel script was not loaded"
  );

  const queuedCalls = () => window.fbq.queue.map((args) => Array.from(args));
  assert(
    queuedCalls().some((call) => call[0] === "init" && call[1] === "1554256442781789"),
    "Meta Pixel was not initialized with the expected pixel ID"
  );
  assert(
    queuedCalls().some((call) => call[0] === "track" && call[1] === "PageView"),
    "Meta Pixel PageView was not queued"
  );

  const firstTracked = window.SnappyAnalytics.trackCouponClaimSuccess({
    promotionSlug: "free-weekday-wash",
    claimId: "claim_test",
    successMarker: "Your coupon code was emailed."
  });
  const secondTracked = window.SnappyAnalytics.trackCouponClaimSuccess({
    promotionSlug: "free-weekday-wash",
    claimId: "claim_test",
    successMarker: "Your coupon code was emailed."
  });
  const leadCalls = queuedCalls().filter((call) => call[0] === "track" && call[1] === "Lead");

  assert(firstTracked === true, "first successful claim should track a Meta Lead");
  assert(secondTracked === false, "duplicate successful claim should not track a second Meta Lead");
  assert(leadCalls.length === 1, "Meta Lead should be queued once per claim ID");
  assert(
    JSON.stringify(leadCalls[0][2]) === JSON.stringify({ content_name: "Snappy Promo Coupon Claim" }),
    "Meta Lead payload must contain only generic metadata"
  );
  assert(
    localStorage.getItem("snappyMetaLeadFired:free-weekday-wash:claim:claim_test") === "1",
    "durable Meta Lead guard was not stored in localStorage"
  );
  assert(
    sessionStorage.getItem("snappyMetaLeadFired:free-weekday-wash:claim:claim_test") === "1",
    "Meta Lead guard was not stored in sessionStorage"
  );
}

function verifyHostConfig() {
  assert(
    runConfigForHost("127.0.0.1").apiBase === "https://api-staging.snappycoinlaundry.com",
    "local host should use staging API"
  );
  assert(
    runConfigForHost("127.0.0.1").turnstileSiteKey === "0x4AAAAAADVlAL_Y3ES5Jk6-",
    "local host should use staging Turnstile key"
  );
  assert(
    runConfigForHost("snappycoinlaundry.com").apiBase === "https://api.snappycoinlaundry.com",
    "production host should use production API"
  );
  assert(
    runConfigForHost("www.snappycoinlaundry.com").turnstileSiteKey === "",
    "production host should not use the staging Turnstile key"
  );
  assert(
    runConfigForHost("snappycoin-promo-test.pages.dev").apiBase === "https://api-staging.snappycoinlaundry.com",
    "Pages test site should use staging API"
  );
  assert(
    runConfigForHost("snappycoin-promo-test.pages.dev").turnstileSiteKey === "0x4AAAAAADVlAL_Y3ES5Jk6-",
    "Pages test site should use staging Turnstile key"
  );
  assert(
    runConfigForHost("test.snappycoinlaundry.com").apiBase === "https://api-staging.snappycoinlaundry.com",
    "test subdomains should use staging API"
  );
  assert(
    runConfigForHost("test.snappycoinlaundry.com").turnstileSiteKey === "0x4AAAAAADVlAL_Y3ES5Jk6-",
    "test subdomains should use staging Turnstile key"
  );
}

(async () => {
  verifyStaticPage();
  verifyHostConfig();
  await verifySignupStartPayload();
  await verifyPhoneVerificationPayload();
  await verifyPhoneVerificationFailureDoesNotTrack();
  await verifyFirstTouchPersistence();
  await verifyDuplicateMessagePassthrough();
  await verifyResendPayload();
  await verifyInactivePromotionHidesClaimUi();
  await verifyNewsletterSignupPayload();
  await verifyStartSubmitGuard();
  await verifyPhoneVerificationSubmitGuard();
  await verifySiteAnalyticsMetaPixel();
  console.log("promo signup verification passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
