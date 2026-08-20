import { PUD_CONFIG } from "./pud-config.js";
import { acceptSuggestedAddress, createOrder, getPublicConfig, joinWaitlist } from "./pud-api.js";
import { attribution, setSelfReportedSource, trackFunnel } from "./pud-attribution.js";
import { displayAddress, enableAddressAutocomplete, validateAddress } from "./pud-address.js";
import { eligibleDeliveryRoutes, formatRoute, renderRouteDays, renderRouteTimes, routeOptions } from "./pud-scheduling.js";
import { beginPhoneVerification, bindPhoneFormatting, confirmPhoneVerification, normalizeUsPhone, resendPhoneVerification } from "./pud-phone.js";
import { destroySquareCard, prepareSquareCard, tokenizeSquareCard } from "./pud-payment.js";
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
  addressReviewRequired: false,
  pendingAddressResult: null,
  routes: [],
  deliveryRoutes: [],
  routeId: "",
  deliveryRouteId: "",
  verificationId: "",
  phoneProof: "",
  reorderBootstrap: null,
  waitlistContinuationToken: waitlistBootstrap?.token || "",
  waitlistRouteId: waitlistBootstrap?.routeId || "",
  calendarPickup: null,
};

const allSteps = ["address", "details", "phone", "review", "complete"];
const $ = (selector) => root.querySelector(selector);
let turnstileSiteKey = "";
let submissionInFlight = false;
let addressConfirmationInFlight = false;
if (root && window.top !== window.self) fatal(new Error("Booking is available only in a full browser window."));
else if (root) boot().catch((error) => fatal(error));

async function boot() {
  bind();
  state.reorderBootstrap = takeReorderBootstrap();
  if (state.reorderBootstrap) {
    prefillReorderAddress($("#pud-address-form"), state.reorderBootstrap);
  }
  state.config = await getPublicConfig();
  enableAddressAutocomplete($("#pud-address-form"), state.config.addressAutocompleteEnabled === true);
  root.dataset.paymentCollection = "square_card_on_file";
  showResumeMessage();
  configureCodeFields();
  configureHandoff();
  if (!state.config.publicEnabled) return showUnavailable(state.config.message || "Pickup and delivery is not accepting bookings yet.");
  const price = state.config.pricing || {};
  const pricePerLbCents = price.pricePerLbCents ?? 135;
  $("[data-pud-current-price]").textContent = `${money(pricePerLbCents)}/lb`;
  $("[data-pud-minimum]").textContent = `${compactMoney(price.minimumCents ?? 1500)} minimum`;
  const promotion = $("[data-pud-promotion]");
  if (promotion) promotion.hidden = pricePerLbCents !== 135;
  $("[data-pud-service-area-offer]").hidden = price.deliveryFeeCents !== 0;
  await setupTurnstile(state.config.turnstileSiteKey);
  showStep(state.step);
  if (!state.config.bookingEnabled) {
    showMessage("Address checks are available, but online booking is temporarily paused. You can still see whether an address is eligible or join the waitlist.", "success");
  }
  trackFunnel("pud_page_viewed");
}

function compactMoney(cents) {
  const value = Number(cents);
  return Number.isInteger(value) && value % 100 === 0 ? `$${value / 100}` : money(value);
}

function bind() {
  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  window.addEventListener("popstate", () => showStep(history.state?.pudStep || state.step, true));
  bindPhoneFormatting(root);
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || submissionInFlight) return;
  submissionInFlight = true;
  clearMessage();
  clearFieldErrors(form);
  setBusy(form, true);
  try {
    if (form.id === "pud-address-form") await submitAddress(form);
    if (form.id === "pud-details-form") await submitDetails(form);
    if (form.id === "pud-phone-form") await submitPhone(form);
    if (form.id === "pud-code-form") await submitCode(form);
    if (form.id === "pud-review-form") await submitOrder();
    if (form.id === "pud-waitlist-form") await submitWaitlist(form);
  } catch (error) {
    resetTurnstile(form);
    showError(error, form);
  } finally {
    submissionInFlight = false;
    setBusy(form, false);
  }
}

async function submitAddress(form) {
  const { address, result } = await validateAddress(form, undefined, state.attribution);
  return processAddressResult(address, result);
}

function processAddressResult(address, result, { confirmedSuggestion = false } = {}) {
  if (!result || !["eligible", "out_of_zone", "review_required", "service_paused"].includes(result.eligibility)) {
    throw new Error("The address service returned an invalid eligibility result.");
  }
  state.address = result.normalizedAddress || address;
  state.addressProof = result.addressProof || "";
  state.addressReviewRequired = false;
  state.pendingAddressResult = null;
  state.routeId = "";
  state.deliveryRouteId = "";
  state.phoneProof = "";
  destroySquareCard();
  state.routes = routeOptions(result);
  state.deliveryRoutes = routeOptions(result, "deliveryRoutes");
  if (state.waitlistContinuationToken) {
    const invitedRoute = state.routes.find((route) => route.id === state.waitlistRouteId);
    if (!invitedRoute) {
      throw new Error("The pickup window in this waitlist invitation is no longer available. Ask staff for a refreshed invitation.");
    }
    state.routes = [invitedRoute];
    state.routeId = invitedRoute.id;
  }
  $("[data-normalized-address]").textContent = displayAddress(state.address);
  renderSchedulingChoices();
  const preferredRouteId = state.reorderBootstrap?.preferredRouteId;
  if (preferredRouteId && [...$("#pud-route").options].some((option) => option.value === preferredRouteId)) {
    state.routeId = preferredRouteId;
    $("#pud-route").value = preferredRouteId;
  }
  if (result.eligibility === "out_of_zone") {
    trackFunnel("pud_address_ineligible", { reasonCategory: "outside_area" });
    return showWaitlist({
      reason: "out_of_zone",
      title: "Outside our service area",
      message: "We do not currently serve this address. Joining the waitlist records your interest but does not reserve a pickup time or promise future service."
    });
  }
  if (result.eligibility === "review_required") {
    if (result.reviewBookingAllowed === true && state.routes.length && state.config.bookingEnabled) {
      if (confirmedSuggestion) return continueBookableAddress(result, true);
      showAddressConfirmation(address, result);
      return;
    }
    trackFunnel("pud_address_ineligible", { reasonCategory: "needs_review" });
    return showWaitlist({
      reason: "address_review",
      title: "Address review needed",
      message: "We could not locate this address precisely enough to reserve a pickup safely. Send it to our staff for review and we may contact you to clarify the street or apartment number."
    });
  }
  if (result.eligibility === "service_paused") {
    trackFunnel("pud_address_ineligible", { reasonCategory: "unknown" });
    return showWaitlist({
      reason: "service_paused",
      title: "Pickup service is temporarily paused",
      message: "Pickup service is paused. Join the waitlist and we will contact you when booking reopens."
    });
  }
  return continueBookableAddress(result, false);
}

function continueBookableAddress(result, pendingReview) {
  if (!state.addressProof) throw new Error("The address check expired. Please check the address again.");
  state.addressReviewRequired = pendingReview;
  const reviewNotice = $("[data-address-review-notice]");
  if (reviewNotice) reviewNotice.hidden = !pendingReview;
  if (!state.config.bookingEnabled) {
    trackFunnel("pud_address_eligible");
    showMessage("This address is eligible. Online booking is temporarily paused, so no pickup request can be submitted yet. You can check another address or return when booking reopens.", "success");
    return showStep("address", true);
  }
  if (!state.routes.length) {
    trackFunnel("pud_address_ineligible", { reasonCategory: "unknown" });
    const outcome = result.availability?.status;
    if (outcome === "turnaround_unconfigured") {
      return showWaitlist({
        reason: "service_paused",
        title: "Pickup times are awaiting schedule confirmation",
        message: "This address is eligible, but the configured pickup windows do not yet have an approved return time. We cannot offer one until that operating decision is recorded. Join the waitlist to be contacted when booking opens."
      });
    }
    if (outcome === "cutoff_passed") {
      return showWaitlist({
        reason: "route_full",
        title: "The booking cutoff has passed",
        message: "This address is eligible, but the cutoff has passed for the configured pickup windows. Join the waitlist to be considered when another approved window opens."
      });
    }
    if (outcome === "not_configured") {
      return showWaitlist({
        reason: "service_paused",
        title: "No pickup windows are scheduled yet",
        message: "This address is eligible, but no future pickup window is currently configured. Join the waitlist to be contacted after the schedule is approved and opened."
      });
    }
    return showWaitlist({
      reason: "service_paused",
      title: "Pickup times are unavailable",
      message: "This address is eligible, but no valid pickup time is currently available. Join the waitlist and we will contact you when scheduling reopens."
    });
  }
  if (state.reorderBootstrap) {
    prefillReorderDetails($("#pud-details-form"), state.reorderBootstrap);
    renderSchedulingChoices();
    $("[data-reorder-phone-last4]").textContent = `For security, re-enter and verify the mobile number ending in ${state.reorderBootstrap.customer.phoneLast4}.`;
  }
  trackFunnel("pud_address_eligible");
  go("details");
}

function showAddressConfirmation(enteredAddress, result) {
  const dialog = $("[data-address-confirm-dialog]");
  const suggested = result.suggestedAddress || null;
  if (!(dialog instanceof HTMLDialogElement)) {
    continueBookableAddress(result, true);
    return;
  }
  state.pendingAddressResult = { enteredAddress, result };
  setAddressDialogBusy(false);
  $("[data-address-entered]").textContent = displayAddress(enteredAddress);
  $("[data-address-suggested]").textContent = displayAddress(suggested);
  const hasDifferentSuggestion = Boolean(suggested) && addressKey(suggested) !== addressKey(enteredAddress);
  const canAcceptSuggestion = hasDifferentSuggestion && Boolean(result.suggestionProof);
  $("[data-address-suggested-card]").hidden = !hasDifferentSuggestion;
  $("[data-action=use-suggested-address]").hidden = !canAcceptSuggestion;
  $("[data-address-unit-warning]").hidden = result.missingUnit !== true;
  $("[data-address-dialog-copy]").textContent = canAcceptSuggestion
    ? "We found a likely match. Choose it to reduce pickup delays, or keep what you entered and continue with staff review."
    : hasDifferentSuggestion
      ? "We found a likely match. Edit the address to use it, or keep what you entered and continue with staff review."
    : "We need one quick confirmation before you continue with this address.";
  dialog.showModal();
}

function addressKey(address) {
  return displayAddress(address).replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function fillAddressForm(address) {
  const form = $("#pud-address-form");
  for (const name of ["line1", "line2", "city", "state", "postalCode"]) {
    const field = form.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.value = address?.[name] || "";
  }
  form.dataset.addressSuggestionSelected = "true";
}

function showWaitlist({ reason, title, message }) {
  state.waitlistReason = reason;
  $("#pud-waitlist-address").value = displayAddress(state.address);
  $("[data-waitlist-title]").textContent = translateExternalText(title);
  $("[data-waitlist-reason]").textContent = translateExternalText(message);
  const submit = $("#pud-waitlist-form button[type=submit]");
  if (submit) submit.textContent = reason === "address_review" ? "Request address review" : "Join waitlist";
  showPanel("waitlist");
}

async function submitDetails(form) {
  const data = new FormData(form);
  state.routeId = state.waitlistContinuationToken
    ? state.waitlistRouteId
    : String(data.get("routeId") || "");
  state.deliveryRouteId = String(data.get("deliveryRouteId") || "");
  if (!state.routeId) throw new Error("Choose a pickup window.");
  const pickupRoute = state.routes.find((route) => route.id === state.routeId);
  const deliveryRoute = eligibleDeliveryRoutes(state.deliveryRoutes, pickupRoute, state.config.scheduling?.minimumDeliveryDelayHours ?? 24)
    .find((route) => route.id === state.deliveryRouteId);
  if (!pickupRoute) throw new Error("That pickup window is no longer available.");
  if (!deliveryRoute) throw new Error("Choose a delivery window at least 24 hours after pickup.");
  state.customer = {
    firstName: String(data.get("firstName") || "").trim(),
    lastName: String(data.get("lastName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: normalizeUsPhone(data.get("phone")),
  };
  const unattendedPickup = data.get("pickupHandoff") === "unattended";
  const unattendedPickupAuthorized = data.get("unattendedPickupAuthorization") === "yes";
  if (unattendedPickup && !unattendedPickupAuthorized) {
    throw new Error("Authorize pickup from the secure location or choose to hand the bags to the driver.");
  }
  state.order = {
    detergent: String(data.get("detergent") || "premium"),
    softenerPref: String(data.get("softenerPref") || "liquid"),
    specialInstructions: String(data.get("specialInstructions") || "").trim(),
    unattendedPickup,
    accessNotes: unattendedPickup ? String(data.get("accessNotes") || "").trim() : "",
  };
  state.consents = {
    terms: data.get("terms") === "yes",
    privacy: true,
    transactionalSms: true,
    savedPaymentMethod: false,
    unattendedPickup: unattendedPickupAuthorized,
    marketingEmail: false,
    marketingSms: false,
    consentVersion: state.config.consentVersion || "owner-approval-required",
  };
  if (!state.consents.terms) throw new Error("Accept the service terms.");
  const result = await beginPhoneVerification(state.customer.phone);
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
  populateReview();
  go("review");
  const paymentMount = $("#pud-payment-element");
  paymentMount.replaceChildren();
  try {
    await prepareSquareCard(state.config, paymentMount);
  } catch (error) {
    const paymentError = $("[data-payment-form-error]");
    paymentError.textContent = error.message;
    paymentError.hidden = false;
    throw error;
  }
}

async function submitOrder() {
  const consentVersion = state.config.consentVersions || {};
  const route = state.routes.find((item) => item.id === state.routeId);
  const deliveryRoute = state.deliveryRoutes.find((item) => item.id === state.deliveryRouteId);
  if (!route?.routeProof || !deliveryRoute?.routeProof) throw new Error("The selected pickup or delivery window expired. Please check the address again.");
  const optionalData = new FormData($("#pud-review-form"));
  const source = optionalData.get("selfReportedSource");
  const sourceDetail = String(optionalData.get("selfReportedSourceDetail") || "").trim();
  setSelfReportedSource(state.attribution, source, sourceDetail || undefined);
  state.consents.marketingEmail = optionalData.get("marketingEmail") === "yes";
  state.consents.savedPaymentMethod = optionalData.get("savedPaymentMethod") === "yes";
  if (!state.consents.savedPaymentMethod) throw new Error("Accept the saved-card authorization to book pickup.");
  const squareCardToken = await tokenizeSquareCard({
    givenName: state.customer.firstName,
    familyName: state.customer.lastName,
    email: state.customer.email,
    countryCode: "US",
  });
  const intent = {
    firstName: state.customer.firstName,
    lastName: state.customer.lastName,
    email: state.customer.email,
    address: state.address,
    routeId: state.routeId,
    deliveryRouteId: state.deliveryRouteId,
    phoneProof: state.phoneProof,
    addressProof: state.addressProof,
    routeProof: route.routeProof,
    deliveryRouteProof: deliveryRoute.routeProof,
    squareCardToken,
    turnstileToken: turnstileValue($("#pud-review-form")),
    preferences: {
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
    waitlistContinuationToken: state.waitlistContinuationToken || undefined,
    locale: getLocale?.() || undefined,
  };
  const stableIntent = { ...intent, squareCardToken: "[square-token]", turnstileToken: "[turnstile-token]" };
  const orderKey = await stableActionKey("order", JSON.stringify([state.phoneProof, state.addressProof, route.routeProof, deliveryRoute.routeProof, stableIntent]));
  const result = await createOrder({ idempotencyKey: orderKey, ...intent }, orderKey);
  const token = result.statusToken;
  if (!token || !result.orderNumber) throw new Error("The order was created without a private status link. Contact support with the request ID.");
  try {
    await window.SnappyAnalytics?.trackWdfPickupBookingCompleted?.({
      orderNumber: result.orderNumber,
      duplicate: result.duplicate === true,
    });
  } catch (_error) {
    // Measurement must never turn a valid booking into a customer-facing failure.
  }
  $("[data-order-number]").textContent = result.orderNumber;
  const addressPending = result.status?.addressReviewRequired === true || state.addressReviewRequired;
  $("[data-complete-title]").textContent = addressPending ? "Pickup requested · address pending review" : "Pickup booked";
  const completeOrderNumber = Object.assign(document.createElement("strong"), { textContent: result.orderNumber });
  completeOrderNumber.dataset.orderNumber = "";
  $("[data-complete-copy]").replaceChildren(
    document.createTextNode(addressPending
      ? "We reserved your requested pickup window while our staff checks the address. We may contact you for clarification. Your order number is"
      : "Your order number is"),
    document.createTextNode(" "),
    completeOrderNumber,
    document.createTextNode(". Your private link opens order updates, final weight, amount due, and the receipt. Treat it like a password.")
  );
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
  clearMessage();
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
  const confirmation = document.createElement("div");
  confirmation.className = "pud-waitlist-confirmation";
  confirmation.setAttribute("role", "status");
  confirmation.setAttribute("tabindex", "-1");
  const addressReview = state.waitlistReason === "address_review";
  confirmation.append(
    Object.assign(document.createElement("h3"), { textContent: addressReview ? "Address review request received" : "Waitlist request recorded" }),
    Object.assign(document.createElement("p"), {
      textContent: addressReview
        ? "We saved the address for staff review. This is not a booking or reserved pickup time. We may contact you if we need clarification."
        : "We saved your request. This is not a booking or reserved pickup time. Staff will contact you if an approved opening becomes available."
    }),
    Object.assign(document.createElement("p"), {
      className: "pud-fine-print",
      textContent: "Our staff team has been notified by email."
    })
  );
  form.replaceWith(confirmation);
  confirmation.focus();
}

async function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "use-suggested-address") {
    if (addressConfirmationInFlight) return;
    const pending = state.pendingAddressResult;
    const suggested = pending?.result?.suggestedAddress;
    const suggestionProof = pending?.result?.suggestionProof;
    if (!suggested || !suggestionProof) return;
    addressConfirmationInFlight = true;
    setAddressDialogBusy(true, "Confirming address…");
    try {
      const result = await acceptSuggestedAddress(
        { address: suggested, suggestionProof },
        { timeoutMs: 20_000 },
      );
      const confirmedResult = {
        ...result,
        routes: pending.result.routes,
        deliveryRoutes: pending.result.deliveryRoutes,
        ...(pending.result.availability ? { availability: pending.result.availability } : {}),
        ...(pending.result.zoneCode ? { zoneCode: pending.result.zoneCode } : {}),
        ...(pending.result.zoneVersion ? { zoneVersion: pending.result.zoneVersion } : {}),
      };
      $("[data-address-confirm-dialog]")?.close();
      state.pendingAddressResult = null;
      fillAddressForm(suggested);
      processAddressResult(suggested, confirmedResult, { confirmedSuggestion: true });
    } catch (_error) {
      $("[data-address-confirm-dialog]")?.close();
      state.pendingAddressResult = null;
      showMessage("We could not confirm the suggested address. Check the address again, then choose the suggested address or continue with staff review.");
      $("#pud-address-form button[type=submit]")?.focus();
    } finally {
      addressConfirmationInFlight = false;
      setAddressDialogBusy(false);
    }
    return;
  }
  if (button.dataset.action === "keep-entered-address") {
    if (addressConfirmationInFlight) return;
    const pending = state.pendingAddressResult;
    $("[data-address-confirm-dialog]")?.close();
    state.pendingAddressResult = null;
    if (pending) {
      state.address = pending.enteredAddress;
      $("[data-normalized-address]").textContent = displayAddress(state.address);
      continueBookableAddress(pending.result, true);
    }
    return;
  }
  if (button.dataset.action === "edit-address") {
    if (addressConfirmationInFlight) return;
    $("[data-address-confirm-dialog]")?.close();
    state.pendingAddressResult = null;
    $("#pud-address-form [name=line1]")?.focus();
    return;
  }
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
  if (button.dataset.action === "back") {
    const activeSteps = activeBookingSteps();
    go(button.dataset.step || activeSteps[Math.max(0, activeSteps.indexOf(state.step) - 1)]);
  }
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
  if (event.target?.matches?.('[name="pickupDay"]')) renderPickupTimes();
  if (event.target?.matches?.('[name="routeId"]')) renderDeliveryChoices();
  if (event.target?.matches?.('[name="deliveryDay"]')) renderDeliveryTimes();
  if (event.target?.matches?.('[name="deliveryRouteId"]')) renderSelectedSchedule();
  if (event.target?.matches?.('[name="pickupHandoff"]')) configureHandoff();
  if (event.target?.matches?.('[name="selfReportedSource"]')) configureReferralOther(event.target);
}

function go(step, push = true) {
  if (!allowedBookingSteps().includes(step)) return;
  state.step = step;
  showStep(step, true);
  root.scrollIntoView({ behavior: "smooth", block: "start" });
  if (push) history.pushState({ pudStep: step }, "", `#${step}`);
}

function showStep(step, focusHeading = false) {
  const activeSteps = activeBookingSteps();
  const progress = root.querySelector(".pud-progress");
  if (progress) progress.style.setProperty("--pud-progress-count", String(activeSteps.length));
  root.querySelectorAll("[data-step]").forEach((panel) => { panel.hidden = panel.dataset.step !== step; });
  root.querySelectorAll("[data-progress-step]").forEach((item) => {
    const index = activeSteps.indexOf(item.dataset.progressStep);
    const visible = index >= 0 && step !== "complete";
    item.hidden = !visible;
    item.dataset.complete = visible && index < activeSteps.indexOf(step) ? "true" : "false";
    if (visible && item.dataset.progressStep === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  root.querySelectorAll("[data-step-position]").forEach((label) => {
    const position = progressPosition(label.dataset.stepPosition || step);
    label.textContent = position ? progressLabel(position) : "";
  });
  if (progress) progress.hidden = step === "complete";
  if (focusHeading) root.querySelector(`[data-step="${step}"] h2`)?.focus?.();
  ensureTurnstile(root.querySelector(`[data-step="${step}"]`));
}

function activeBookingSteps() {
  return allSteps.filter((step) => step !== "complete");
}

function allowedBookingSteps() {
  return [...activeBookingSteps(), "complete"];
}

function progressPosition(step) {
  const steps = activeBookingSteps();
  const index = steps.indexOf(step);
  return index >= 0 ? { current: index + 1, total: steps.length } : null;
}

function progressLabel({ current, total }) {
  return `${translateText("Step")} ${current} ${translateText("of")} ${total}`;
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

function configureHandoff() {
  const details = $("[data-unattended-pickup-details]");
  const unattended = $('[name="pickupHandoff"]:checked')?.value === "unattended";
  if (!details) return;
  details.hidden = !unattended;
  const notes = details.querySelector('[name="accessNotes"]');
  const authorization = details.querySelector('[name="unattendedPickupAuthorization"]');
  if (notes) notes.required = unattended;
  if (authorization) authorization.required = unattended;
}

function showResumeMessage() {
  if (state.reorderBootstrap) {
    const priorOrder = state.reorderBootstrap.priorOrderNumber;
    showMessage(state.reorderBootstrap.recurringProposalId
      ? `Reviewing a recurring pickup from ${priorOrder}. Recheck the address, pickup and delivery times, phone, and card before confirming it.`
      : `Reordering ${priorOrder}. Recheck the address, schedule, phone, and card to create a new order.`, "success");
    return;
  }
  if (state.waitlistContinuationToken) {
    showMessage("Your waitlist invitation is ready. Recheck the address, verify the invited phone, and complete secure card setup for the reserved pickup window.", "success");
  }
}

function renderSchedulingChoices() {
  renderRouteDays($("#pud-pickup-day"), state.routes, "Choose a pickup day");
  renderRouteTimes($("#pud-route"), [], "", "Choose a pickup time");
  renderRouteDays($("#pud-delivery-day"), [], "Choose a delivery day");
  renderRouteTimes($("#pud-delivery-route"), [], "", "Choose a delivery time");
  const preferred = state.routes.find((route) => route.id === (state.waitlistRouteId || state.reorderBootstrap?.preferredRouteId));
  if (preferred) {
    $("#pud-pickup-day").value = preferred.routeDate;
    renderPickupTimes();
    $("#pud-route").value = preferred.id;
    renderDeliveryChoices();
  }
}

function renderPickupTimes() {
  const date = $("#pud-pickup-day").value;
  renderRouteTimes($("#pud-route"), state.routes, date, "Choose a pickup time");
  state.routeId = "";
  renderDeliveryChoices();
}

function renderDeliveryChoices() {
  state.routeId = $("#pud-route").value;
  const pickup = state.routes.find((route) => route.id === state.routeId);
  const eligible = eligibleDeliveryRoutes(state.deliveryRoutes, pickup, state.config?.scheduling?.minimumDeliveryDelayHours ?? 24);
  renderRouteDays($("#pud-delivery-day"), eligible, "Choose a delivery day");
  renderRouteTimes($("#pud-delivery-route"), [], "", "Choose a delivery time");
  state.deliveryRouteId = "";
  $("[data-route-availability-note]").textContent = pickup
    ? "Choose a delivery day and time."
    : "Choose a day first, then an available one-hour window.";
  renderSelectedSchedule();
}

function renderDeliveryTimes() {
  const pickup = state.routes.find((route) => route.id === state.routeId);
  const eligible = eligibleDeliveryRoutes(state.deliveryRoutes, pickup, state.config?.scheduling?.minimumDeliveryDelayHours ?? 24);
  renderRouteTimes($("#pud-delivery-route"), eligible, $("#pud-delivery-day").value, "Choose a delivery time");
  state.deliveryRouteId = "";
  renderSelectedSchedule();
}

function renderSelectedSchedule() {
  const pickupTarget = $("[data-selected-pickup]");
  const returnTarget = $("[data-selected-return]");
  if (!pickupTarget || !returnTarget) return;
  state.deliveryRouteId = $("#pud-delivery-route")?.value || "";
  const pickup = state.routes.find((route) => route.id === state.routeId);
  const delivery = state.deliveryRoutes.find((route) => route.id === state.deliveryRouteId);
  pickupTarget.textContent = pickup ? formatRoute(pickup) : "Choose a pickup day and time.";
  returnTarget.textContent = delivery ? formatRoute(delivery) : "Choose pickup first, then select delivery.";
}

function configureReferralOther(select) {
  const field = $("[data-referral-other]");
  if (!field) return;
  const visible = select.value === "other";
  field.hidden = !visible;
  const input = field.querySelector("input");
  input.required = false;
  if (!visible) input.value = "";
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
  const deliveryRoute = state.deliveryRoutes.find((item) => item.id === state.deliveryRouteId);
  $("[data-review-route]").textContent = route ? formatRoute(route) : state.routeId;
  $("[data-review-return]").textContent = deliveryRoute ? formatRoute(deliveryRoute) : state.deliveryRouteId;
  $("[data-review-customer]").textContent = `${state.customer.firstName} ${state.customer.lastName} · •••• ${state.customer.phone.slice(-4)}`;
  const detergent = state.order.detergent.replaceAll("_", " ");
  const softener = state.order.softenerPref.replaceAll("_", " ");
  $("[data-review-laundry]").textContent = `Detergent: ${detergent} · Softener: ${softener}${state.order.specialInstructions ? ` · ${state.order.specialInstructions}` : ""}`;
}

function setBusy(form, busy) {
  form.querySelectorAll("button").forEach((control) => {
    control.disabled = busy;
    if (!control.dataset.busyLabel) return;
    if (busy) {
      control.dataset.idleLabel = control.textContent;
      control.textContent = translateText(control.dataset.busyLabel);
    } else if (control.dataset.idleLabel) {
      control.textContent = control.dataset.idleLabel;
      delete control.dataset.idleLabel;
    }
  });
  form.setAttribute("aria-busy", String(busy));
}

function setAddressDialogBusy(busy, status = "") {
  const dialog = $("[data-address-confirm-dialog]");
  if (!(dialog instanceof HTMLDialogElement)) return;
  dialog.setAttribute("aria-busy", String(busy));
  dialog.querySelectorAll("button").forEach((control) => { control.disabled = busy; });
  const confirm = dialog.querySelector("[data-action=use-suggested-address]");
  if (confirm) confirm.textContent = translateText(busy ? "Confirming address…" : "Use suggested address");
  const statusNode = dialog.querySelector("[data-address-dialog-status]");
  if (statusNode) statusNode.textContent = status;
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
  node.setAttribute("role", variant === "error" ? "alert" : "status");
  node.setAttribute("aria-live", variant === "error" ? "assertive" : "polite");
  node.hidden = !text;
  if (text && variant === "error") node.focus();
}

function clearMessage() { showMessage(""); }
function clearFieldErrors(form) {
  if (!(form instanceof HTMLFormElement)) return;
  form.querySelectorAll("[data-field-error]").forEach((node) => node.remove());
  Array.from(form.elements).forEach((field) => {
    if (!(field instanceof HTMLElement)) return;
    field.removeAttribute("aria-invalid");
    const describedBy = (field.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && !id.startsWith("pud-field-error-"));
    if (describedBy.length) field.setAttribute("aria-describedby", describedBy.join(" "));
    else field.removeAttribute("aria-describedby");
  });
}

function renderFieldErrors(form, fieldErrors) {
  if (!(form instanceof HTMLFormElement) || !fieldErrors || typeof fieldErrors !== "object") return;
  let errorIndex = 0;
  for (const [rawName, rawMessage] of Object.entries(fieldErrors)) {
    const fieldName = String(rawName).split(".").at(-1);
    const field = Array.from(form.elements).find((element) => element.name === rawName || element.name === fieldName);
    if (!(field instanceof HTMLElement)) continue;
    const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
    if (!message) continue;
    const errorId = `pud-field-error-${form.id || "form"}-${errorIndex += 1}`;
    const errorNode = document.createElement("small");
    errorNode.id = errorId;
    errorNode.className = "pud-field-error";
    errorNode.dataset.fieldError = fieldName;
    errorNode.textContent = translateExternalText(String(message));
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", [field.getAttribute("aria-describedby"), errorId].filter(Boolean).join(" "));
    const fieldLabel = field.closest("label");
    if (fieldLabel) fieldLabel.append(errorNode);
    else field.insertAdjacentElement("afterend", errorNode);
  }
}

function showError(error, form) {
  showMessage(error?.message || "Something went wrong. Please try again.");
  renderFieldErrors(form, error?.fieldErrors);
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
