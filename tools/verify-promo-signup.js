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
    "promo-verification": new ElementMock("promo-verification", { hidden: true }),
    "promo-claim-id": new ElementMock("promo-claim-id"),
    "promo-turnstile": new ElementMock("promo-turnstile"),
    "promo-offer": new ElementMock("promo-offer")
  };

  return {
    referrer: "https://ads.example/campaign",
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
    querySelector() {
      return null;
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
    community: "Test Apartments",
    phoneVerificationConsent: "on",
    emailMarketingConsent: ""
  };
  const document = makeDocument(formFields);
  const timers = [];
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
    setTimeout(fn) {
      timers.push(fn);
      return timers.length;
    },
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

  await Promise.resolve();
  await Promise.resolve();

  for (const timer of timers.splice(0)) timer();

  await document.elements["promo-signup-form"].listeners.submit({
    preventDefault() {}
  });

  await Promise.resolve();

  return { document, fetchCalls, localStorage, sessionStorage };
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
  assert(!/name=["']attribution/i.test(html), "attribution must not be exposed as a hidden field");
}

async function verifySignupStartPayload() {
  const { document, fetchCalls, localStorage, sessionStorage } = await runSignupScenario((url, options) => {
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
  assert(document.elements["promo-verification"].hidden === false, "verification panel did not open");
}

async function verifyPhoneVerificationPayload() {
  const { document, fetchCalls } = await runSignupScenario((url) => {
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
  assert(document.elements["promo-verify-message"].textContent === "Your coupon code was emailed.", "verify success message was not displayed");
  assert(document.elements["promo-signup-form"].hidden === true, "signup form did not hide after verification");
  assert(document.elements["promo-verify-form"].hidden === true, "verify form did not hide after verification");
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
    runConfigForHost("snappycoin-promo-test.pages.dev").apiBase === "https://api.snappycoinlaundry.com",
    "Pages test site should use production API"
  );
  assert(
    runConfigForHost("snappycoin-promo-test.pages.dev").turnstileSiteKey === "",
    "Pages test site should load Turnstile key from production metadata"
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
  await verifyFirstTouchPersistence();
  await verifyDuplicateMessagePassthrough();
  console.log("promo signup verification passed");
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
