import { PUD_CONFIG } from "./pud-config.js";
import { createOrder, getPublicConfig, joinWaitlist } from "./pud-api.js";
import { attribution, setSelfReportedSource, trackFunnel } from "./pud-attribution.js";
import { displayAddress, validateAddress } from "./pud-address.js";
import { formatRoute, renderRoutes, routeOptions } from "./pud-scheduling.js";
import { beginPhoneVerification, confirmPhoneVerification, normalizeUsPhone, resendPhoneVerification } from "./pud-phone.js";
import { confirmPayment, destroyPayment, preparePayment } from "./pud-payment.js";
import { stableActionKey } from "./pud-idempotency.js";
import { clearReorderBootstrap, prefillReorderAddress, prefillReorderDetails, takeReorderBootstrap } from "./pud-reorder.js";
import { downloadPickupCalendar } from "./pud-calendar.js";
import { formatCurrencyCents, getLocale, translateExternalText, translateText, withLocalePath } from "./site-i18n.js";

const waitlistBootstrap = takeWaitlistContinuation();
const root = document.querySelector("[data-pud-booking]");

const state = {
  step: "address",
  config: null,
  attribution: attribution(),
  address: null,
  addressProof: "",
  routes: [],
  routeId: "",
  verificationId: "",
  phoneProof: "",
  setupIntentId: "",
  checkoutProof: "",
  reorderBootstrap: null,
  waitlistContinuationToken: waitlistBootstrap?.token || "",
  waitlistRouteId: waitlistBootstrap?.routeId || "",
  calendarPickup: null,
};

const steps = ["address", "details", "phone", "payment", "review", "complete"];
const $ = (selector) => root.querySelector(selector);
let turnstileSiteKey = "";
let submissionInFlight = false;
if (root && window.top !== window.self) fatal(new Error("Booking is available only in a full browser window."));
else if (root) boot().catch((error) => fatal(error));

async function boot() {
  bind();
  state.reorderBootstrap = takeReorderBootstrap();
  if (state.reorderBootstrap) {
    prefillReorderAddress($("#pud-address-form"), state.reorderBootstrap);
    showMessage(state.reorderBootstrap.recurringProposalId
      ? `Reviewing a recurring pickup from ${state.reorderBootstrap.priorOrderNumber}. Recheck the address, route, phone, and card before confirming it.`
      : `Reordering ${state.reorderBootstrap.priorOrderNumber}. Recheck the address, phone, and card to create a new order.`, "success");
  } else if (state.waitlistContinuationToken) {
    showMessage("Your waitlist invitation is ready. Recheck the address, verify the invited phone, and complete secure checkout for the reserved pickup window.", "success");
  }
  state.config = await getPublicConfig();
  configureCodeFields();
  if (!state.config.publicEnabled) return showUnavailable(state.config.message || "Pickup and delivery is not accepting bookings yet.");
  const price = state.config.pricing || {};
  $("[data-pud-price]").textContent = `${money(price.pricePerLbCents ?? 199)}/lb · ${money(price.minimumCents ?? 3500)} minimum${price.deliveryFeeCents ? ` · ${money(price.deliveryFeeCents)} delivery` : ""}`;
  $("[data-pud-service-area-offer]").hidden = price.deliveryFeeCents !== 0;
  if (!state.config.bookingEnabled) return showUnavailable("Online booking is temporarily paused. Existing orders remain available from the status page.");
  await setupTurnstile(state.config.turnstileSiteKey);
  showStep(state.step);
  trackFunnel("pud_page_viewed");
}

function bind() {
  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  window.addEventListener("popstate", () => showStep(history.state?.pudStep || state.step, false));
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || submissionInFlight) return;
  submissionInFlight = true;
  clearMessage();
  setBusy(form, true);
  try {
    if (form.id === "pud-address-form") await submitAddress(form);
    if (form.id === "pud-details-form") await submitDetails(form);
    if (form.id === "pud-phone-form") await submitPhone(form);
    if (form.id === "pud-code-form") await submitCode(form);
    if (form.id === "pud-payment-form") await submitPayment();
    if (form.id === "pud-review-form") await submitOrder();
    if (form.id === "pud-waitlist-form") await submitWaitlist(form);
  } catch (error) {
    resetTurnstile(form);
    showError(error);
  } finally {
    submissionInFlight = false;
    setBusy(form, false);
  }
}

async function submitAddress(form) {
  const turnstileToken = turnstileValue(form);
  const { address, result } = await validateAddress(form, turnstileToken, state.attribution);
  resetTurnstile(form);
  if (!result || !["eligible", "out_of_zone", "review_required", "service_paused"].includes(result.eligibility)) {
    throw new Error("The address service returned an invalid eligibility result.");
  }
  state.address = result.normalizedAddress || address;
  renderAddressAttribution(result.addressValidationAttribution);
  state.addressProof = result.addressProof || "";
  state.routeId = "";
  state.phoneProof = "";
  state.checkoutProof = "";
  state.setupIntentId = "";
  destroyPayment();
  state.routes = routeOptions(result);
  if (state.waitlistContinuationToken) {
    const invitedRoute = state.routes.find((route) => route.id === state.waitlistRouteId);
    if (!invitedRoute) {
      throw new Error("The pickup window in this waitlist invitation is no longer available. Ask staff for a refreshed invitation.");
    }
    state.routes = [invitedRoute];
    state.routeId = invitedRoute.id;
  }
  $("[data-normalized-address]").textContent = displayAddress(state.address);
  renderRoutesForSelectedBags();
  const preferredRouteId = state.reorderBootstrap?.preferredRouteId;
  if (preferredRouteId && [...$("#pud-route").options].some((option) => option.value === preferredRouteId)) {
    state.routeId = preferredRouteId;
    $("#pud-route").value = preferredRouteId;
  }
  if (result.eligibility === "out_of_zone") {
    trackFunnel("pud_address_ineligible", { reasonCategory: "outside_area" });
    state.waitlistReason = "out_of_zone";
    $("#pud-waitlist-address").value = displayAddress(state.address);
    $("[data-waitlist-reason]").textContent = translateExternalText(
      result.message || "This address is outside our current service area.",
    );
    return showPanel("waitlist");
  }
  if (result.eligibility === "review_required") {
    trackFunnel("pud_address_ineligible", { reasonCategory: "needs_review" });
    state.waitlistReason = "address_review";
    $("#pud-waitlist-address").value = displayAddress(state.address);
    $("[data-waitlist-reason]").textContent = translateExternalText(
      result.message || "We need to review this address before promising a pickup window.",
    );
    showPanel("waitlist");
    return;
  }
  if (result.eligibility === "service_paused") {
    trackFunnel("pud_address_ineligible", { reasonCategory: "capacity" });
    state.waitlistReason = "service_paused";
    $("#pud-waitlist-address").value = displayAddress(state.address);
    $("[data-waitlist-reason]").textContent = "Pickup service is paused. Join the waitlist and we will contact you when booking reopens.";
    showPanel("waitlist");
    return;
  }
  if (!state.addressProof) throw new Error("The address check expired. Please check the address again.");
  if (!state.routes.length) {
    trackFunnel("pud_address_ineligible", { reasonCategory: "capacity" });
    state.waitlistReason = "route_full";
    $("#pud-waitlist-address").value = displayAddress(state.address);
    $("[data-waitlist-reason]").textContent = "Current pickup routes are full. Join the waitlist and we will contact you if space opens.";
    showPanel("waitlist");
    return;
  }
  if (state.reorderBootstrap) {
    prefillReorderDetails($("#pud-details-form"), state.reorderBootstrap);
    renderRoutesForSelectedBags();
    $("[data-reorder-phone-last4]").textContent = `For security, re-enter and verify the mobile number ending in ${state.reorderBootstrap.customer.phoneLast4}.`;
  }
  trackFunnel("pud_address_eligible");
  go("details");
}

function renderAddressAttribution(attributionValue) {
  const showGoogleMaps = attributionValue === "Google Maps";
  root.querySelectorAll("[data-address-attribution]").forEach((element) => {
    element.hidden = !showGoogleMaps;
  });
}

async function submitDetails(form) {
  const data = new FormData(form);
  const estimatedBags = Number(data.get("estimatedBags") || 1);
  const availableRoutes = routesForBagCount(estimatedBags);
  state.routeId = state.waitlistContinuationToken
    ? state.waitlistRouteId
    : String(data.get("routeId") || "");
  if (!state.routeId) throw new Error("Choose a pickup window.");
  if (!availableRoutes.some((route) => route.id === state.routeId)) {
    throw new Error(`That pickup window does not have room for ${estimatedBags} estimated bag${estimatedBags === 1 ? "" : "s"}. Choose another window or a lower bag estimate.`);
  }
  state.customer = {
    firstName: String(data.get("firstName") || "").trim(),
    lastName: String(data.get("lastName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: normalizeUsPhone(data.get("phone")),
  };
  setSelfReportedSource(state.attribution, data.get("selfReportedSource"));
  state.order = {
    estimatedBags,
    detergent: String(data.get("detergent") || "standard"),
    softenerPref: String(data.get("softenerPref") || "none"),
    specialInstructions: String(data.get("specialInstructions") || "").trim(),
    unattendedPickup: data.get("unattendedPickup") === "yes",
    accessNotes: String(data.get("accessNotes") || "").trim(),
  };
  state.consents = {
    terms: data.get("terms") === "yes",
    privacy: data.get("privacy") === "yes",
    transactionalSms: data.get("transactionalSms") === "yes",
    savedPaymentMethod: data.get("savedPaymentMethod") === "yes",
    unattendedPickup: data.get("unattendedPickup") === "yes",
    marketingEmail: data.get("marketingEmail") === "yes",
    marketingSms: data.get("marketingSms") === "yes",
    consentVersion: state.config.consentVersion || "owner-approval-required",
  };
  if (!state.consents.terms || !state.consents.privacy || !state.consents.transactionalSms || !state.consents.savedPaymentMethod) {
    throw new Error("Accept the required service, privacy, messaging, and saved-card terms.");
  }
  const result = await beginPhoneVerification(state.customer.phone, turnstileValue(form));
  resetTurnstile(form);
  state.verificationId = result.verificationId;
  $("[data-phone-last4]").textContent = state.customer.phone.slice(-4);
  trackFunnel("pud_booking_started");
  go("phone");
}

async function submitPhone(_form) {
  return submitCode($("#pud-code-form"));
}

async function submitCode(form) {
  const code = String(new FormData(form).get("code") || "").trim();
  const result = await confirmPhoneVerification(state.verificationId, code);
  state.phoneProof = result.phoneProof;
  trackFunnel("pud_phone_verified");
  go("payment");
  const paymentMount = $("#pud-payment-element");
  paymentMount.replaceChildren();
  const route = state.routes.find((item) => item.id === state.routeId);
  if (!route?.routeProof) throw new Error("The selected pickup window expired. Please check the address again.");
  // These proofs are hashed into the browser-session action fingerprint; they
  // are never persisted by stableActionKey.
  const setupSignature = JSON.stringify([
    state.phoneProof, state.addressProof, route.routeProof,
    state.customer.firstName, state.customer.lastName, state.customer.email,
    state.waitlistContinuationToken || null,
  ]);
  const setupKey = await stableActionKey("payment-setup", setupSignature);
  const checkoutAttemptId = await stableActionKey("checkout-attempt", setupSignature);
  const prepared = await preparePayment({
    publicConfig: state.config,
    checkoutAttemptId,
    phoneProof: state.phoneProof,
    addressProof: state.addressProof,
    routeProof: route.routeProof,
    firstName: state.customer.firstName,
    lastName: state.customer.lastName,
    email: state.customer.email || undefined,
    attribution: state.attribution,
    waitlistContinuationToken: state.waitlistContinuationToken || undefined,
    idempotencyKey: setupKey,
    mount: paymentMount,
  });
  state.setupIntentId = prepared.setupIntentId;
  state.checkoutProof = prepared.checkoutProof;
}

async function submitPayment() {
  const setupIntent = await confirmPayment(`${location.origin}${withLocalePath(PUD_CONFIG.statusPath)}`);
  state.setupIntentId = setupIntent.id;
  populateReview();
  trackFunnel("pud_card_saved");
  go("review");
}

async function submitOrder() {
  const consentVersion = state.config.consentVersions || {};
  const intent = {
    firstName: state.customer.firstName,
    lastName: state.customer.lastName,
    email: state.customer.email,
    address: state.address,
    routeId: state.routeId,
    setupIntentId: state.setupIntentId,
    checkoutProof: state.checkoutProof,
    preferences: {
      estimatedBags: state.order.estimatedBags,
      detergent: state.order.detergent,
      softenerPref: state.order.softenerPref,
      unattendedPickup: state.order.unattendedPickup,
      unattendedDelivery: false,
      ...(state.order.specialInstructions ? { specialInstructions: state.order.specialInstructions } : {}),
      ...(state.order.accessNotes ? { accessNotes: state.order.accessNotes } : {}),
    },
    consents: {
      terms: { accepted: state.consents.terms, version: consentVersion.terms || state.consents.consentVersion },
      privacy: { accepted: state.consents.privacy, version: consentVersion.privacy || state.consents.consentVersion },
      transactional_sms: { accepted: state.consents.transactionalSms, version: consentVersion.transactional_sms || state.consents.consentVersion },
      saved_payment_method: { accepted: state.consents.savedPaymentMethod, version: consentVersion.saved_payment_method || state.consents.consentVersion },
      unattended_pickup: { accepted: state.consents.unattendedPickup, version: consentVersion.unattended_pickup || state.consents.consentVersion },
      unattended_delivery: { accepted: false, version: consentVersion.unattended_delivery || state.consents.consentVersion },
      marketing_email: { accepted: state.consents.marketingEmail, version: consentVersion.marketing_email || state.consents.consentVersion },
      marketing_sms: { accepted: state.consents.marketingSms, version: consentVersion.marketing_sms || state.consents.consentVersion },
    },
    attribution: state.attribution,
    promotionCode: state.config.promotionsEnabled === true ? $("#pud-promotion-code")?.value.trim() || undefined : undefined,
    referralCode: state.config.referralsEnabled === true ? $("#pud-referral-code")?.value.trim() || undefined : undefined,
    recurringProposalId: state.reorderBootstrap?.recurringProposalId || undefined,
    locale: getLocale?.() || undefined,
  };
  const orderKey = await stableActionKey("order", JSON.stringify([state.checkoutProof, state.setupIntentId, intent]));
  const result = await createOrder({ idempotencyKey: orderKey, ...intent }, orderKey);
  const token = result.statusToken;
  if (!token || !result.orderNumber) throw new Error("The order was created without a private status link. Contact support with the request ID.");
  $("[data-order-number]").textContent = result.orderNumber;
  const selectedRoute = state.routes.find((item) => item.id === state.routeId);
  state.calendarPickup = selectedRoute?.windowStartAt && selectedRoute?.windowEndAt
    ? Object.freeze({
        orderNumber: result.orderNumber,
        windowStartAt: selectedRoute.windowStartAt,
        windowEndAt: selectedRoute.windowEndAt,
        locale: getLocale?.() || undefined,
      })
    : null;
  $("[data-action=add-pickup-calendar]").hidden = !state.calendarPickup;
  const link = $("[data-status-link]");
  link.href = `${withLocalePath(PUD_CONFIG.statusPath)}#${encodeURIComponent(token)}`;
  sessionStorage.removeItem(PUD_CONFIG.storageKey);
  clearWaitlistContinuation();
  clearReorderBootstrap();
  trackFunnel("pud_order_submitted", { duplicate: Boolean(result.duplicate) });
  go("complete");
}

async function submitWaitlist(form) {
  const data = new FormData(form);
  setSelfReportedSource(state.attribution, data.get("selfReportedSource"));
  const intent = {
    firstName: String(data.get("firstName") || "").trim(),
    lastName: String(data.get("lastName") || "").trim(),
    phone: normalizeUsPhone(data.get("phone")),
    email: String(data.get("email") || "").trim(),
    address: state.address,
    addressProof: state.addressProof,
    turnstileToken: turnstileValue(form),
    reason: state.waitlistReason || "out_of_zone",
    marketingEmailConsent: data.get("marketingEmail") === "yes",
    marketingSmsConsent: data.get("marketingSms") === "yes",
    locale: getLocale?.() || undefined,
    attribution: state.attribution,
    consentVersions: state.config.consentVersions || { marketing_email: state.config.consentVersion || "owner-approval-required", marketing_sms: state.config.consentVersion || "owner-approval-required" },
  };
  const waitlistKey = await stableActionKey("waitlist", JSON.stringify(intent));
  await joinWaitlist(intent, waitlistKey);
  trackFunnel("pud_waitlist_joined");
  form.replaceChildren(Object.assign(document.createElement("p"), { textContent: "You’re on the list. We’ll contact you if service opens for your address." }));
}

async function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "copy-status-link") {
    const value = $("[data-status-link]")?.href || "";
    const status = $("[data-confirmation-action-status]");
    try {
      await navigator.clipboard.writeText(value);
      if (status) status.textContent = "Private link copied. Store it somewhere only you can access.";
    } catch (_error) {
      if (status) status.textContent = "Your browser could not copy the link. Open order status and copy the address from the browser bar.";
    }
  }
  if (button.dataset.action === "copy-order-number") {
    const value = $("[data-order-number]")?.textContent?.trim() || "";
    const status = $("[data-confirmation-action-status]");
    try {
      await navigator.clipboard.writeText(value);
      if (status) status.textContent = "Order number copied.";
    } catch (_error) {
      if (status) status.textContent = "Your browser could not copy the order number.";
    }
  }
  if (button.dataset.action === "add-pickup-calendar") {
    const status = $("[data-confirmation-action-status]");
    try {
      downloadPickupCalendar(state.calendarPickup);
      if (status) status.textContent = "Calendar file downloaded. It contains only the pickup window and order number.";
    } catch (_error) {
      if (status) status.textContent = "Your browser could not create the calendar file. Keep the pickup window from your private order page handy.";
    }
  }
  if (button.dataset.action === "print-confirmation") window.print();
  if (button.dataset.action === "back") go(button.dataset.step || steps[Math.max(0, steps.indexOf(state.step) - 1)]);
  if (button.dataset.action === "edit") go(button.dataset.step);
  if (button.dataset.action === "resend") {
    const resendForm = $("#pud-resend-form");
    button.disabled = true;
    try { await resendPhoneVerification(state.verificationId, turnstileValue(resendForm)); showMessage("A new code was sent.", "success"); }
    catch (error) { showError(error); }
    finally {
      resetTurnstile(resendForm);
      window.setTimeout(() => { button.disabled = false; }, 60000);
    }
  }
  if (button.dataset.action === "retry-booking") location.reload();
  if (button.dataset.action === "start-over") {
    sessionStorage.removeItem(PUD_CONFIG.storageKey);
    clearWaitlistContinuation();
    clearReorderBootstrap();
    location.reload();
  }
}

function onChange(event) {
  if (event.target?.matches?.('[name="estimatedBags"]')) renderRoutesForSelectedBags();
}

function go(step, push = true) {
  if (!steps.includes(step)) return;
  state.step = step;
  showStep(step);
  if (push) history.pushState({ pudStep: step }, "", `#${step}`);
}

function showStep(step) {
  root.querySelectorAll("[data-step]").forEach((panel) => { panel.hidden = panel.dataset.step !== step; });
  root.querySelectorAll("[data-progress-step]").forEach((item) => {
    const active = steps.indexOf(item.dataset.progressStep) <= steps.indexOf(step);
    item.dataset.complete = active ? "true" : "false";
    if (item.dataset.progressStep === step) item.setAttribute("aria-current", "step"); else item.removeAttribute("aria-current");
  });
  root.querySelector(`[data-step="${step}"] h2`)?.focus?.();
  ensureTurnstile(root.querySelector(`[data-step="${step}"]`));
}

function showPanel(name) {
  root.querySelectorAll("[data-booking-panel]").forEach((panel) => { panel.hidden = panel.dataset.bookingPanel !== name; });
  ensureTurnstile(root.querySelector(`[data-booking-panel="${name}"]`));
}

function configureCodeFields() {
  const promotionField = $("[data-promotion-field]");
  const referralField = $("[data-referral-field]");
  const codeFields = $("[data-code-fields]");
  if (promotionField) promotionField.hidden = state.config?.promotionsEnabled !== true;
  if (referralField) referralField.hidden = state.config?.referralsEnabled !== true;
  if (codeFields) codeFields.hidden = promotionField?.hidden !== false && referralField?.hidden !== false;
}

function routesForBagCount(bagCount) {
  if (state.waitlistContinuationToken) return state.routes;
  return state.routes.filter((route) => {
    const remainingBags = Number(route.remainingBags);
    return !Number.isFinite(remainingBags) || remainingBags >= bagCount;
  });
}

function renderRoutesForSelectedBags() {
  const select = $("#pud-route");
  if (!select) return [];
  const bagCount = Math.max(1, Number($("#pud-estimated-bags")?.value || 1));
  const selectedRouteId = select.value || state.routeId;
  const availableRoutes = routesForBagCount(bagCount);
  renderRoutes(select, availableRoutes);
  if (selectedRouteId && availableRoutes.some((route) => route.id === selectedRouteId)) {
    select.value = selectedRouteId;
  } else if (state.routeId === selectedRouteId) {
    state.routeId = "";
  }
  const note = $("[data-route-capacity-note]");
  if (note) {
    note.textContent = availableRoutes.length
      ? `${availableRoutes.length} pickup window${availableRoutes.length === 1 ? "" : "s"} can currently take ${bagCount} estimated bag${bagCount === 1 ? "" : "s"}.`
      : `No listed pickup window has room for ${bagCount} estimated bag${bagCount === 1 ? "" : "s"}. Choose a lower estimate or call the store.`;
  }
  return availableRoutes;
}

function money(cents) {
  return formatCurrencyCents(cents);
}

function showUnavailable(message) {
  $("[data-unavailable]").textContent = translateExternalText(message);
  showPanel("unavailable");
}

function populateReview() {
  $("[data-review-address]").textContent = displayAddress(state.address);
  const route = state.routes.find((item) => item.id === state.routeId);
  $("[data-review-route]").textContent = route ? formatRoute(route) : state.routeId;
  $("[data-review-customer]").textContent = `${state.customer.firstName} ${state.customer.lastName} · •••• ${state.customer.phone.slice(-4)}`;
  $("[data-review-bags]").textContent = `${state.order.estimatedBags} estimated bag${state.order.estimatedBags === 1 ? "" : "s"}`;
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach((control) => { control.disabled = busy; });
  form.setAttribute("aria-busy", String(busy));
}

function turnstileValue(form) {
  const token = String(new FormData(form).get("cf-turnstile-response") || "");
  if (!token) throw new Error("Complete the anti-bot check and try again.");
  return token;
}

async function setupTurnstile(siteKey) {
  if (!siteKey) throw new Error("Booking protection is not configured.");
  turnstileSiteKey = siteKey;
  if (!globalThis.turnstile) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = PUD_CONFIG.turnstileScript;
      script.async = true;
      script.defer = true;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("The anti-bot check could not load.")), { once: true });
      document.head.append(script);
    });
  }
}

function ensureTurnstile(container) {
  if (!container || !turnstileSiteKey || !globalThis.turnstile?.render) return;
  container.querySelectorAll("[data-turnstile]").forEach((node) => {
    if (node.dataset.widgetId) return;
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
  });
}

function resetTurnstile(form) {
  const widget = form?.querySelector?.("[data-turnstile]");
  if (!widget?.dataset.widgetId || !globalThis.turnstile?.reset) return;
  try { globalThis.turnstile.reset(widget.dataset.widgetId); } catch (_error) { /* no-op */ }
}

function showMessage(text, variant = "error") {
  const node = $("[data-message]");
  node.textContent = translateExternalText(text);
  node.dataset.variant = variant;
  node.hidden = !text;
  node.focus();
}

function clearMessage() { showMessage(""); }
function showError(error) {
  showMessage(error?.message || "Something went wrong. Please try again.");
}
function fatal(error) {
  if (!root) return;
  const unavailable = $("[data-unavailable]");
  if (!unavailable) {
    root.replaceChildren(Object.assign(document.createElement("p"), {
      className: "pud-alert",
      textContent: translateExternalText(error?.message || "Booking could not load."),
    }));
    return;
  }
  showUnavailable(error?.message || "Booking could not load. Try again or call the store.");
}

function takeWaitlistContinuation() {
  const parsed = window.SnappyWaitlistContinuation?.get?.();
  return parsed && typeof parsed.token === "string" && typeof parsed.routeId === "string" ? parsed : null;
}

function clearWaitlistContinuation() {
  state.waitlistContinuationToken = "";
  state.waitlistRouteId = "";
  window.SnappyWaitlistContinuation?.clear?.();
}
