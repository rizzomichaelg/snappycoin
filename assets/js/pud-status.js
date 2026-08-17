import {
  cancelOrder,
  createRecurring,
  createStatusSession,
  getPublicConfig,
  issueActionCapability,
  issueClaimEvidenceCapability,
  loyaltySummary,
  paymentSession,
  portalHistory,
  recurringAction,
  reorderOrder,
  replacePaymentMethod,
  requestReschedule,
  revokeStatusToken,
  statusOrder,
  submitFeedback,
  tipOrder,
  updatePreferences,
} from "./pud-api.js";
import { getOrCreateClaimAttemptId, storeClaimCapabilities } from "./pud-claim-capability.js";
import { retireActionKey, stableActionKey } from "./pud-idempotency.js";
import { completePreferenceAttempt, getOrCreatePreferenceAttemptId } from "./pud-preference-attempt.js";
import {
  confirmPaymentMethodReplacement,
  confirmPaymentRemediation,
  destroyPaymentMethodReplacement,
  destroySquareCardReplacement,
  preparePaymentMethodReplacement,
  prepareSquareCardReplacement,
  tokenizeSquareCardReplacement,
} from "./pud-payment.js";
import { PUD_CONFIG } from "./pud-config.js";
import {
  beginPhoneVerification,
  confirmPhoneVerification,
  normalizeUsPhone,
  resendPhoneVerification,
} from "./pud-phone.js";
import { storeReorderBootstrap } from "./pud-reorder.js";
import { formatRoute } from "./pud-scheduling.js";
import { downloadPickupCalendar } from "./pud-calendar.js";
import { formatCentralDateTime, formatCurrencyCents, getLocale, translateExternalText, translateText, withLocalePath } from "./site-i18n.js";

const root = document.querySelector("[data-pud-status]");
const $ = (selector) => root.querySelector(selector);
const authorizationErrors = new Set([
  "PUD_STATUS_STEP_UP_INVALID",
  "PUD_STATUS_SESSION_INVALID",
  "PUD_PHONE_PROOF_INVALID",
  "PUD_PHONE_PROOF_REPLAYED",
]);
const fulfillmentSteps = Object.freeze([
  "submitted",
  "confirmed",
  "picked_up",
  "weighed",
  "ready",
  "out_for_delivery",
  "delivered",
]);
const fulfillmentLabels = Object.freeze({
  submitted: "Order received",
  confirmed: "Pickup scheduled",
  picked_up: "Laundry picked up",
  weighed: "Weighed and processing",
  ready: "Clean and packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  canceled: "Order canceled",
});
const nextStepByFulfillment = Object.freeze({
  submitted: "We received your order. Your scheduled pickup is shown below while our team reviews the details.",
  confirmed: "Your pickup is reserved. Have your bags ready during the pickup window shown below.",
  picked_up: "Your laundry is with our team. We’ll weigh it before washing so the final price is accurate.",
  weighed: "Your laundry has been weighed and is moving through wash, dry, and fold.",
  ready: "Everything is clean, folded, and packed. We’re preparing its return.",
  out_for_delivery: "Your order is with our driver and headed back to you.",
  delivered: "Your laundry is back. Your final receipt and support options are available below.",
  canceled: "No further pickup or delivery is scheduled for this order.",
});
const humanLabels = Object.freeze({
  ...fulfillmentLabels,
  uncharged: "Not charged yet",
  processing: "Payment processing",
  succeeded: "Paid",
  requires_action: "Card confirmation needed",
  failed: "Payment Failed · Action Required",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  disputed: "Payment under review",
  succeeded_external: "Paid",
  pickup_delivery: "Pickup and delivery",
  walk_in: "In-store service",
  missing_item: "Missing item",
  damage: "Damaged item",
  service_quality: "Wash or service quality",
  billing: "Billing question",
  other: "Other issue",
  open: "Received",
  investigating: "Under review",
  approved: "Approved",
  denied: "Not approved",
  resolved: "Resolved",
  withdrawn: "Closed by customer",
  not_enrolled: "Not enrolled",
  active: "Active",
  review_required: "Review needed",
  suspended: "Temporarily paused",
  closed: "Closed",
  earn: "Reward earned",
  redeem: "Reward used",
  reverse_earn: "Reward adjustment",
  reverse_redeem: "Reward restored",
  expire: "Reward expired",
  manual_credit: "Account credit",
  manual_debit: "Account adjustment",
  weekly: "Weekly",
  biweekly: "Every two weeks",
  monthly: "Monthly",
  paused: "Paused",
  proposed: "Needs your confirmation",
  confirmed: "Confirmed",
  skipped: "Skipped",
  expired: "Expired",
  blocked: "Choose another pickup window",
  canceled: "Canceled",
  premium: "Premium",
  gain: "Gain",
  tide: "Tide",
  free_clear: "Free and clear",
  customer_supplied: "Customer provided",
  liquid: "Liquid",
  dryer_sheets: "Dryer sheets",
  standard: "Legacy standard preference",
  none: "None",
});

let token = "";
let order = null;
let publicConfig = null;
let actionInFlight = false;
let recoverySetupIntentId = "";
let confirmedReplacementSetupIntentId = "";
let recoveryPaymentProvider = "stripe";
let verificationId = "";
let verifiedSession = null;
let sessionExpiryTimer = 0;
let turnstileSiteKey = "";
let portalDetails = null;
let portalPreferences = null;
let rescheduledCalendarPickup = null;
let portalLoyalty = null;
let pendingConfirmation = null;
let pendingFeedbackSatisfaction = "";
let feedbackResult = null;
let automaticRefreshTimer = 0;
let automaticRefreshFailures = 0;

if (root && window.top !== window.self) {
  root.replaceChildren(Object.assign(document.createElement("p"), {
    className: "pud-alert",
    textContent: "Private order pages cannot be opened inside another site.",
  }));
} else if (root) {
  boot().catch((error) => message(error?.message || "The private order page could not load."));
}

async function boot() {
  token = fragmentToken();
  replacePrivateLocation(token);
  bind();
  renderStepUpState();
  try {
    publicConfig = await getPublicConfig();
    renderRecoveryAvailability(publicConfig);
  } catch (_error) {
    renderRecoveryAvailability(null);
  }
  if (!token) return message("Open the private status link from your confirmation message.");
  await refresh();
}

function renderRecoveryAvailability(config) {
  const enabled = config?.statusRecoveryEnabled === true;
  const link = document.querySelector("[data-status-recovery-link]");
  const unavailable = document.querySelector("[data-status-recovery-unavailable]");
  if (link) link.hidden = !enabled;
  if (unavailable) unavailable.hidden = enabled;
}

function bind() {
  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
  $("[data-confirm-dialog]")?.addEventListener("close", () => { pendingConfirmation = null; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearAutomaticRefresh();
    else if (token && order) scheduleAutomaticRefresh(1_000);
  });
  // Keep this listener for every navigation. A page restored from the
  // back-forward cache may be verified again before a later pagehide.
  window.addEventListener("pagehide", clearMemoryCredentials);
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    clearMemoryCredentials();
    renderStepUpState("Fresh phone verification is required after returning to this page.");
  });
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || actionInFlight) return;
  if (form.id === "pud-status-form") {
    const submitted = String(new FormData(form).get("token") || "").trim().replace(/^#/, "");
    if (!submitted) return message("Enter the private token from your confirmation message.");
    clearVerifiedSession();
    clearStepUpVerification();
    closePaymentReplacement();
    clearRescheduledCalendar();
    clearFeedbackState();
    token = submitted;
    replacePrivateLocation(token);
    publicConfig = null;
    await runAction(refresh);
    return;
  }
  if (!token || !order) return message("Refresh the private order before using this control.");
  if (form.id === "pud-step-up-phone-form") return runAction(() => submitStepUpPhone(form));
  if (form.id === "pud-step-up-code-form") return runAction(() => submitStepUpCode(form));
  if (form.id === "pud-preferences-form") return runAction(() => submitPreferences(form));
  if (form.id === "pud-reschedule-form") return runAction(() => submitReschedule(form));
  if (form.id === "pud-payment-method-form") return runAction(submitPaymentMethod);
  if (form.id === "pud-tip-form") {
    try {
      submitTip(form);
    } catch (error) {
      message(error?.message || "Review the tip amount and try again.");
    }
    return;
  }
  if (form.id === "pud-recurring-create-form") return runAction(() => submitRecurring(form));
}

async function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || actionInFlight) return;
  const action = button.dataset.action;
  if (action === "refresh") return runAction(async () => {
    automaticRefreshFailures = 0;
    await refresh();
  });
  if (action === "history-more") return runAction(() => loadPortalHistory({ append: true }));
  if (action === "step-up-restart") {
    clearVerifiedSession();
    clearStepUpVerification();
    renderStepUpState();
    $("#pud-step-up-phone-form input[name=phone]")?.focus();
    return;
  }
  if (action === "step-up-resend") return runAction(resendStepUpCode);
  if (action === "dismiss-confirmation") {
    closeConfirmation();
    return;
  }
  if (action === "confirm-pending") {
    const confirmation = pendingConfirmation;
    closeConfirmation();
    if (confirmation?.run) return runAction(confirmation.run);
    return;
  }
  if (!token || !order) return message("Refresh the private order before using this control.");

  if (action === "add-rescheduled-pickup-calendar") {
    const status = $("[data-reschedule-calendar-status]");
    try {
      downloadPickupCalendar({ ...rescheduledCalendarPickup, locale: getLocale?.() || undefined });
      if (status) status.textContent = "Calendar file downloaded. It contains only the new pickup window and order number.";
    } catch (_error) {
      if (status) status.textContent = "Your browser could not create the calendar file. Keep the updated pickup window from this page handy.";
    }
    return;
  }

  if (action === "submit-feedback") return runAction(() => submitFeedbackResponse(button));

  if (action === "copy-status-link") return runAction(copyPrivateLink);
  if (action === "cancel") {
    return openConfirmation({
      title: "Cancel this pickup?",
      copy: "This stops the order and cannot be undone from this page. If the laundry has already been collected, contact the store instead.",
      confirmLabel: "Cancel order",
      run: cancelCurrentOrder,
    });
  }
  if (action === "reorder") return runAction(() => beginBookingBootstrap());
  if (action === "open-claim") return runAction(openClaimForm);
  if (action === "payment-replace") return runAction(startPaymentReplacement);
  if (action === "payment-replace-cancel") {
    closePaymentReplacement();
    return;
  }
  if (action === "revoke-status-token") {
    return openConfirmation({
      title: "Permanently disable this link?",
      copy: "You will lose online access from this page. This action cannot be undone here; contact the store if you still need help with the order.",
      confirmLabel: "Disable link",
      run: revokePrivateLink,
    });
  }
  if (["recurring-pause", "recurring-resume", "recurring-skip"].includes(action)) {
    return runAction(() => updateRecurring(button));
  }
  if (["proposal-confirm", "proposal-change-route"].includes(action)) {
    const routeId = action === "proposal-confirm" ? button.dataset.routeId || "" : "";
    return runAction(() => beginBookingBootstrap(button.dataset.proposalId || "", routeId));
  }
}

async function copyPrivateLink() {
  const privateLink = `${location.origin}${withLocalePath(location.pathname)}#${encodeURIComponent(token)}`;
  if (!navigator.clipboard?.writeText) {
    throw new Error("Copying is unavailable in this browser. Use your browser’s address-bar copy control instead.");
  }
  await navigator.clipboard.writeText(privateLink);
  message("Private link copied. Share it only with someone you trust to view this order.", "success");
}

async function submitFeedbackResponse(button) {
  if (!publicConfig?.feedbackEnabled || !order?.canSubmitFeedback) {
    throw new Error("Feedback is not available for this order.");
  }
  const satisfaction = String(button.dataset.satisfaction || "");
  if (!["satisfied", "needs_follow_up"].includes(satisfaction)) {
    throw new Error("Choose one feedback response.");
  }
  const session = activeVerifiedSession();
  if (!session) {
    focusStepUp();
    throw new Error("Verify the mobile number before submitting feedback.");
  }
  if (pendingFeedbackSatisfaction && pendingFeedbackSatisfaction !== satisfaction) {
    throw new Error("Retry the first feedback response before choosing a different answer.");
  }
  pendingFeedbackSatisfaction = satisfaction;
  const locale = order.locale || getLocale();
  const key = await stableActionKey("feedback", `${order.orderNumber}:${locale}:${satisfaction}`);
  try {
    const result = await submitFeedback(token, session.value, satisfaction, locale, key);
    feedbackResult = Object.freeze(result);
    pendingFeedbackSatisfaction = "";
    order = Object.freeze({ ...order, canSubmitFeedback: false, feedbackSubmitted: true });
    renderFeedback(order);
    const confirmation = result.supportRequested
      ? "Thank you. Our support team will follow up using the contact information on the order."
      : "Thank you. Your private response was received.";
    message(confirmation, "success");
    $("[data-feedback-result]")?.focus();
  } catch (error) {
    handleAuthorizationError(error);
    if (!error?.retryable && !authorizationErrors.has(error?.code)) pendingFeedbackSatisfaction = "";
    throw error;
  }
}

function openConfirmation({ title, copy, confirmLabel, run }) {
  const dialog = $("[data-confirm-dialog]");
  if (!dialog) throw new Error("The confirmation panel could not open.");
  pendingConfirmation = { run };
  $("[data-confirm-title]").textContent = title;
  $("[data-confirm-copy]").textContent = copy;
  $("[data-confirm-button]").textContent = confirmLabel;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $("[data-action=dismiss-confirmation]")?.focus();
}

function closeConfirmation() {
  const dialog = $("[data-confirm-dialog]");
  pendingConfirmation = null;
  if (!dialog) return;
  if (typeof dialog.close === "function" && dialog.open) dialog.close();
  else dialog.removeAttribute("open");
}

async function refresh({ silent = false } = {}) {
  try {
    const [config, status] = await Promise.all([
      publicConfig ? Promise.resolve(publicConfig) : getPublicConfig(),
      statusOrder(token),
    ]);
    publicConfig = config;
    renderRecoveryAvailability(config);
    order = status;
    // Background refreshes must not erase card details while a customer is
    // actively completing the replacement-card form.
    if (!silent) closePaymentReplacement();
    render(status);
    if (!silent) message("");
    automaticRefreshFailures = 0;
    scheduleAutomaticRefresh();
    try {
      await setupTurnstile(config.turnstileSiteKey);
      renderStepUpState();
    } catch (_error) {
      renderStepUpState("Read-only status is available, but protected actions cannot load phone verification right now.");
    }
  } catch (error) {
    if (["PUD_ORDER_TOKEN_INVALID", "PUD_ORDER_TOKEN_REVOKED"].includes(error?.code)) {
      clearVerifiedSession();
      clearOrderLoadedState();
    }
    if (!silent) message(error?.message || "Order status could not be refreshed.");
    throw error;
  }
}

function clearAutomaticRefresh() {
  globalThis.clearTimeout(automaticRefreshTimer);
  automaticRefreshTimer = 0;
}

function scheduleAutomaticRefresh(delay = 60_000) {
  clearAutomaticRefresh();
  if (!token || !order || document.hidden) return;
  automaticRefreshTimer = globalThis.setTimeout(runAutomaticRefresh, delay);
}

async function runAutomaticRefresh() {
  automaticRefreshTimer = 0;
  if (!token || !order || document.hidden) return;
  if (actionInFlight || pendingConfirmation) {
    scheduleAutomaticRefresh(15_000);
    return;
  }
  try {
    await refresh({ silent: true });
  } catch (_error) {
    automaticRefreshFailures += 1;
    scheduleAutomaticRefresh(Math.min(5 * 60_000, 30_000 * (2 ** automaticRefreshFailures)));
  }
}

async function submitStepUpPhone(form) {
  if (!publicConfig?.turnstileSiteKey) throw new Error("Phone verification protection is not configured.");
  const phone = normalizeUsPhone(new FormData(form).get("phone"));
  let result;
  try {
    result = await beginPhoneVerification(phone, turnstileValue(form));
  } finally {
    resetTurnstile(form);
  }
  verificationId = result.verificationId;
  form.reset();
  const codeForm = $("#pud-step-up-code-form");
  codeForm.reset();
  renderStepUpState(`A code was sent to the mobile number ending in ${result.phoneLast4 || phone.slice(-4)}.`);
  ensureTurnstile($("#pud-step-up-resend-form"));
  codeForm.querySelector("input[name=code]")?.focus();
}

async function submitStepUpCode(form) {
  if (!verificationId) throw new Error("Request a new verification code first.");
  const code = String(new FormData(form).get("code") || "").trim();
  let verified;
  let session;
  try {
    verified = await confirmPhoneVerification(verificationId, code);
    session = await createStatusSession(token, verified.phoneProof);
  } catch (error) {
    if (["PUD_PHONE_VERIFICATION_EXPIRED", "PUD_PHONE_VERIFICATION_NOT_FOUND"].includes(error?.code)) {
      clearStepUpVerification();
      renderStepUpState("That code expired. Enter the mobile number to request a new one.");
    }
    throw error;
  }
  // phoneProof is never assigned to application state or browser storage.
  verifiedSession = Object.freeze({
    value: session.statusSession,
    expiresAt: session.expiresAt,
    orderVersion: session.orderVersion,
  });
  verificationId = "";
  form.reset();
  scheduleSessionExpiry();
  renderStepUpState();
  const failures = await loadVerifiedPortal();
  if (!activeVerifiedSession()) {
    renderStepUpState("Fresh phone verification is required before protected portal details can load.");
    message("The phone check completed, but the protected session was rejected or expired. Verify again before making changes.");
    return;
  }
  if (failures.length) {
    message(`Phone verified. Protected actions are unlocked, but ${failures.join(" and ")} could not load. Try verifying again if the problem continues.`);
  } else {
    const loyaltyText = publicConfig?.loyaltyEnabled ? "rewards, " : "";
    message(`Phone verified. Protected actions, ${loyaltyText}order history, receipts, claims, and preferences are unlocked for this short browser session.`, "success");
  }
}

async function resendStepUpCode() {
  if (!verificationId) throw new Error("Enter the mobile number again to request a code.");
  const form = $("#pud-step-up-resend-form");
  let result;
  try {
    result = await resendPhoneVerification(verificationId, turnstileValue(form));
  } finally {
    resetTurnstile(form);
  }
  renderStepUpState(`A new code was sent to the mobile number ending in ${result.phoneLast4 || "••••"}.`);
  form.querySelector("input[name=code]")?.focus();
}

async function issueCapability(purpose) {
  const session = activeVerifiedSession();
  if (!session) {
    focusStepUp();
    throw new Error("Verify the mobile number again before using this protected action.");
  }
  try {
    const capability = await issueActionCapability(token, session.value, purpose);
    if (capability.purpose !== purpose || Date.parse(capability.expiresAt) <= Date.now()) {
      throw new Error("The action authorization expired before it could be used.");
    }
    return capability.actionCapability;
  } catch (error) {
    handleAuthorizationError(error);
    throw error;
  }
}

async function cancelCurrentOrder() {
  const signature = `${order.orderNumber}:${order.version}:customer_request`;
  const key = await stableActionKey("cancel", signature);
  try {
    const actionCapability = await issueCapability("cancel_order");
    order = await cancelOrder(token, actionCapability, order.version, "customer_request", key);
    render(order);
    message("Your order was canceled.", "success");
  } catch (error) {
    await handleVersionConflict(error);
  }
}

async function submitReschedule(form) {
  const data = new FormData(form);
  const routeId = String(data.get("routeId") || "");
  const route = order.rescheduleOptions.find((option) => option.routeId === routeId);
  if (!route?.routeProof) throw new Error("Choose an available pickup window.");
  const reason = String(data.get("reason") || "customer_request").trim() || "customer_request";
  const signature = `${order.orderNumber}:${order.version}:${route.routeId}:${reason}`;
  const key = await stableActionKey("reschedule", signature);
  try {
    const actionCapability = await issueCapability("reschedule_order");
    order = await requestReschedule(token, actionCapability, route.routeProof, order.version, reason, key);
    render(order);
    rescheduledCalendarPickup = Object.freeze({
      orderNumber: order.orderNumber,
      windowStartAt: route.windowStartAt,
      windowEndAt: route.windowEndAt,
    });
    $("[data-reschedule-calendar]").hidden = false;
    $("[data-reschedule-calendar-status]").textContent = "";
    message("Your pickup window was updated. You can add the new time to your calendar below.", "success");
  } catch (error) {
    await handleVersionConflict(error);
  }
}

async function startPaymentReplacement() {
  const actionCapability = await issueCapability("payment_session");
  const session = await paymentSession(token, actionCapability);
  recoveryPaymentProvider = session.provider === "square" ? "square" : "stripe";
  recoverySetupIntentId = session.setupIntentId || "square";
  confirmedReplacementSetupIntentId = "";
  const form = $("#pud-payment-method-form");
  const mount = $("#pud-payment-method-element");
  mount.replaceChildren();
  if (recoveryPaymentProvider === "square") await prepareSquareCardReplacement(publicConfig, mount);
  else await preparePaymentMethodReplacement(publicConfig, session.setupIntentClientSecret, mount);
  form.hidden = false;
  $("[data-payment-actions]").hidden = true;
  form.querySelector("button[type=submit]")?.focus();
  message("Secure replacement-card fields are ready. Saving a new card does not charge it.", "success");
}

async function submitPaymentMethod() {
  if (!recoverySetupIntentId) throw new Error("Start card replacement again before confirming.");
  if (recoveryPaymentProvider === "square") {
    const squareCardToken = await tokenizeSquareCardReplacement();
    const signature = `${order.orderNumber}:square-replacement`;
    const key = await stableActionKey("payment-method", signature);
    const actionCapability = await issueCapability("replace_payment_method");
    order = await replacePaymentMethod(token, actionCapability, { squareCardToken, consentAccepted: true }, key);
    closePaymentReplacement();
    render(order);
    message("The replacement card was saved. Staff can now retry the final charge.", "success");
    return;
  }
  if (!confirmedReplacementSetupIntentId) {
    // The return URL deliberately omits the bearer fragment. A redirecting
    // authentication flow can be reopened from the original private link.
    const setupIntent = await confirmPaymentMethodReplacement(`${location.origin}${withLocalePath(PUD_CONFIG.statusPath)}`);
    if (setupIntent.id !== recoverySetupIntentId) throw new Error("Stripe returned a different card setup session.");
    confirmedReplacementSetupIntentId = setupIntent.id;
  }
  const signature = `${order.orderNumber}:${confirmedReplacementSetupIntentId}`;
  const key = await stableActionKey("payment-method", signature);
  const actionCapability = await issueCapability("replace_payment_method");
  order = await replacePaymentMethod(token, actionCapability, { setupIntentId: confirmedReplacementSetupIntentId }, key);
  closePaymentReplacement();
  render(order);
  message("The replacement card was saved and the original payment was retried. Refresh if payment is still processing.", "success");
}

function submitTip(form) {
  const amountText = String(new FormData(form).get("amount") || "").trim();
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(amountText)) throw new Error("Enter a tip amount with no more than two decimal places.");
  const amountCents = Math.round(Number(amountText) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 50 || amountCents > 100_000) {
    throw new Error("Tip amount must be between $0.50 and $1,000.00.");
  }
  openConfirmation({
    title: `Add a ${money(amountCents)} tip?`,
    copy: `This creates a separate tip payment for ${order.orderNumber}. It will not change the laundry order charge.`,
    confirmLabel: "Add tip",
    run: () => commitTip(form, amountCents),
  });
}

async function commitTip(form, amountCents) {
  const signature = `${order.orderNumber}:${amountCents}`;
  const key = await stableActionKey("tip", signature);
  const actionCapability = await issueCapability("add_tip");
  const result = await tipOrder(token, actionCapability, amountCents, key);
  const confirmed = result.clientSecret ? await confirmPaymentRemediation(publicConfig, result.clientSecret) : null;
  const finalStatus = confirmed?.status || result.status;
  if (!["succeeded", "processing"].includes(finalStatus)) {
    throw new Error("The tip payment was not completed. Retry to resume the same payment.");
  }
  form.reset();
  message(finalStatus === "succeeded" ? "Thank you. Your tip was added." : "Your tip is processing. Refresh before trying again.", "success");
}

async function submitRecurring(form) {
  const defaults = order.recurringDefaults;
  if (!order.canCreateRecurring || !defaults) throw new Error("Recurring pickup creation is not available for this order.");
  const data = new FormData(form);
  const input = {
    cadence: String(data.get("cadence") || "weekly"),
    preferredRouteRule: defaults.preferredRouteRule,
    preferredBags: Number(data.get("preferredBags") || defaults.preferredBags),
    detergent: String(data.get("detergent") || defaults.detergent),
    softenerPref: String(data.get("softenerPref") || defaults.softenerPref),
    specialInstructions: String(data.get("specialInstructions") || "").trim() || undefined,
  };
  const signature = JSON.stringify([order.orderNumber, input]);
  const key = await stableActionKey("recurring-create", signature);
  const actionCapability = await issueCapability("create_recurring");
  await createRecurring(token, actionCapability, input, key);
  await refresh();
  message("Your recurring pickup schedule was created. Future proposals still require your confirmation.", "success");
}

async function loadPortalHistory({ append = false } = {}) {
  const session = activeVerifiedSession();
  if (!session) {
    clearPortalDetails();
    throw new Error("Verify the mobile number again before loading order history.");
  }
  try {
    const prior = append ? portalDetails : null;
    if (append && !prior?.nextCursor) return;
    const page = await portalHistory(token, session.value, {
      ...(prior?.nextCursor ? { cursor: prior.nextCursor } : {}),
      limit: 10,
    });
    if (prior && page.anchorOrderNumber !== prior.anchorOrderNumber) {
      throw new Error("The order-history session changed. Verify again before continuing.");
    }
    const known = new Set(prior?.orders.map((item) => item.orderNumber) || []);
    portalDetails = prior ? {
      ...page,
      orders: [...prior.orders, ...page.orders.filter((item) => !known.has(item.orderNumber))],
    } : page;
    portalPreferences = portalDetails.preferences;
    renderPortalDetails(portalDetails);
    if (append) message("More order history loaded.", "success");
  } catch (error) {
    handleAuthorizationError(error);
    throw error;
  }
}

async function loadVerifiedPortal() {
  const failures = [];
  try {
    await loadPortalHistory();
  } catch (_error) {
    failures.push("order history and preferences");
  }
  if (publicConfig?.loyaltyEnabled && activeVerifiedSession()) {
    try {
      await loadLoyaltySummary();
    } catch (_error) {
      failures.push("rewards");
    }
  } else {
    clearLoyaltySummary();
  }
  return failures;
}

async function loadLoyaltySummary() {
  const session = activeVerifiedSession();
  if (!session) {
    clearLoyaltySummary();
    throw new Error("Verify the mobile number again before loading rewards.");
  }
  try {
    portalLoyalty = await loyaltySummary(token, session.value, 25);
    renderLoyaltySummary(portalLoyalty);
  } catch (error) {
    clearLoyaltySummary();
    handleAuthorizationError(error);
    throw error;
  }
}

async function submitPreferences(form) {
  const preferences = portalPreferences;
  if (!preferences?.canUpdate) throw new Error("Saved preferences cannot be changed from this order.");
  const data = new FormData(form);
  const specialInstructions = String(data.get("specialInstructions") || "").trim();
  const input = {
    expectedVersion: preferences.orderVersion,
    detergent: String(data.get("detergent") || "").trim(),
    softenerPref: String(data.get("softenerPref") || "").trim(),
    ...(specialInstructions ? { specialInstructions } : {}),
  };
  const attemptId = getOrCreatePreferenceAttemptId();
  const key = await stableActionKey("preferences", attemptId);
  try {
    const actionCapability = await issueCapability("update_preferences");
    const result = await updatePreferences(token, actionCapability, input, key);
    completePreferenceAttempt(attemptId);
    await retireActionKey("preferences", attemptId);
    order = result.status;
    portalPreferences = result.preferences;
    render(order);
    renderPreferences(result.preferences);
    try { await loadPortalHistory(); } catch (_error) { /* the verified update receipt remains authoritative */ }
    message(result.duplicate ? "These saved preferences were already updated." : "Your saved laundry preferences were updated.", "success");
  } catch (error) {
    if (error?.code === "PUD_IDEMPOTENCY_CONFLICT") {
      completePreferenceAttempt(attemptId);
      await retireActionKey("preferences", attemptId);
      throw new Error("An earlier preference request used different details. Review the current preferences, then submit again with a new request.");
    }
    await handleVersionConflict(error);
  }
}

async function updateRecurring(button) {
  const action = button.dataset.action.replace("recurring-", "");
  const scheduleId = button.dataset.scheduleId || "";
  const proposalId = button.dataset.proposalId || "";
  const schedule = order.recurringSchedules.find((item) => item.scheduleId === scheduleId);
  if (!schedule) throw new Error("That recurring schedule is no longer available.");
  const signature = `${action}:${scheduleId}:${schedule.version}:${proposalId}`;
  const key = await stableActionKey(`recurring-${action}`, signature);
  const purpose = action === "pause" ? "pause_recurring" : action === "skip" ? "skip_recurring" : "resume_recurring";
  try {
    const actionCapability = await issueCapability(purpose);
    await recurringAction(action, token, actionCapability, {
      scheduleId,
      expectedVersion: schedule.version,
      ...(proposalId ? { proposalId } : {}),
      ...(action === "pause" ? { reason: "customer_paused" } : {}),
    }, key);
    await refresh();
    message(action === "skip" ? "That proposed pickup was skipped." : `Recurring pickups are now ${action === "pause" ? "paused" : "active"}.`, "success");
  } catch (error) {
    await handleVersionConflict(error);
  }
}

async function beginBookingBootstrap(proposalId = "", preferredRouteId = "") {
  const actionCapability = await issueCapability("reorder");
  const bootstrap = await reorderOrder(token, actionCapability, proposalId || undefined);
  if (bootstrap.bookingBlocked) return message("Resolve the payment hold before starting another pickup.");
  storeReorderBootstrap({
    ...bootstrap,
    ...(proposalId ? { recurringProposalId: bootstrap.recurringProposalId || proposalId } : {}),
    ...(preferredRouteId ? { preferredRouteId } : {}),
  });
  location.assign(`${withLocalePath(PUD_CONFIG.bookingPath)}#${proposalId ? "proposal" : "reorder"}`);
}

async function openClaimForm() {
  const session = activeVerifiedSession();
  if (!session) {
    focusStepUp();
    throw new Error("Verify the mobile number again before opening a protected claim.");
  }
  const claimCapabilityPromise = issueActionCapabilityForTransit("open_claim");
  const evidenceCapabilitiesPromise = publicConfig?.claimEvidenceEnabled
    ? Promise.all(Array.from({ length: 5 }, () => issueClaimEvidenceCapabilityForTransit(session)))
    : Promise.resolve([]);
  const [claimCapability, evidenceCapabilities] = await Promise.all([
    claimCapabilityPromise,
    evidenceCapabilitiesPromise,
  ]);
  storeClaimCapabilities({
    claimActionCapability: claimCapability.actionCapability,
    claimExpiresAt: claimCapability.expiresAt,
    evidenceCapabilities,
    attemptId: getOrCreateClaimAttemptId(),
  });
  location.assign(`${withLocalePath(PUD_CONFIG.claimPath)}#${encodeURIComponent(token)}`);
}

async function issueActionCapabilityForTransit(purpose) {
  const session = activeVerifiedSession();
  if (!session) {
    focusStepUp();
    throw new Error("Verify the mobile number again before opening a protected claim.");
  }
  try {
    const capability = await issueActionCapability(token, session.value, purpose);
    if (capability.purpose !== purpose || Date.parse(capability.expiresAt) <= Date.now()) {
      throw new Error("The claim authorization expired before the form could open.");
    }
    return capability;
  } catch (error) {
    handleAuthorizationError(error);
    throw error;
  }
}

async function issueClaimEvidenceCapabilityForTransit(session) {
  try {
    const capability = await issueClaimEvidenceCapability(token, session.value);
    if (capability.purpose !== "upload_claim_evidence" || Date.parse(capability.expiresAt) <= Date.now()) {
      throw new Error("An evidence authorization expired before the form could open.");
    }
    return Object.freeze({
      actionCapability: capability.actionCapability,
      expiresAt: capability.expiresAt,
    });
  } catch (error) {
    handleAuthorizationError(error);
    throw error;
  }
}

async function revokePrivateLink() {
  const orderNumber = order.orderNumber;
  const signature = `${orderNumber}:${order.version}:revoke`;
  const key = await stableActionKey("status-token-revoke", signature);
  const actionCapability = await issueCapability("revoke_status_token");
  try {
    await revokeStatusToken(token, actionCapability, order.version, key);
    clearMemoryCredentials();
    token = "";
    order = null;
    clearOrderLoadedState();
    replacePrivateLocation("");
    $("#pud-status-form").reset();
    $("[data-status-content]").hidden = true;
    const tokenEntry = $("[data-token-entry]");
    if (tokenEntry) tokenEntry.open = true;
    message(`The private link for ${orderNumber} was revoked.`, "success");
  } catch (error) {
    await handleVersionConflict(error);
  }
}

function render(value) {
  root.dataset.orderLoaded = "true";
  if (rescheduledCalendarPickup &&
      (rescheduledCalendarPickup.orderNumber !== value.orderNumber ||
       !["submitted", "confirmed"].includes(value.fulfillmentStatus))) {
    clearRescheduledCalendar();
  }
  $("[data-status-content]").hidden = false;
  const tokenEntry = $("[data-token-entry]");
  if (tokenEntry) tokenEntry.open = false;
  $("[data-order-number]").textContent = value.orderNumber || "Your order";
  const card = value.paymentMethod?.last4 ? ` · ${value.paymentMethod.brand || "Card"} ending ${value.paymentMethod.last4}` : "";
  $("[data-payment-status]").textContent = value.paymentStatus === "uncharged"
    ? `Payment pending final weight${card}`
    : ["succeeded", "succeeded_external"].includes(value.paymentStatus)
      ? `Paid · ${money(value.paymentAmountCents ?? value.totalCents)}${card}`
      : value.paymentStatus === "failed"
        ? `Payment Failed · Action Required${card}`
        : `${label(value.paymentStatus)}${card}`;
  $("[data-payment-status]").parentElement.dataset.state = paymentTone(value.paymentStatus);
  const milestones = value.milestones || {};
  $("[data-pickup-window]").textContent = milestones.pickedUpAt
    ? `Picked up ${formatDate(milestones.pickedUpAt)}`
    : formatSavedWindow(value.pickupWindowStartAt, value.pickupWindowEndAt, pickupWindowLabel(value.pickupWindowCode));
  $("[data-processing-status]").textContent = milestones.readyAt
    ? `Ready ${formatDate(milestones.readyAt)}`
    : milestones.weighedAt
      ? `In progress since ${formatDate(milestones.weighedAt)}`
      : milestones.pickedUpAt ? "Awaiting intake" : "Not started";
  $("[data-delivery-status]").textContent = milestones.deliveredAt
    ? `Delivered ${formatDate(milestones.deliveredAt)}`
    : milestones.outForDeliveryAt
      ? `Out for delivery since ${formatDate(milestones.outForDeliveryAt)}`
      : "Not started";
  $("[data-expected-completion]").textContent = formatSavedWindow(
    value.deliveryWindowStartAt,
    value.deliveryWindowEndAt,
    value.expectedCompletionAt ? formatDate(value.expectedCompletionAt) : "Not scheduled yet"
  );
  $("[data-bag-status]").textContent = value.actualBags == null ? "Confirmed after pickup" : `${value.actualBags} bag${value.actualBags === 1 ? "" : "s"} in this order`;
  $("[data-total]").textContent = value.weightTenths == null ? "Calculated after weighing" : money(value.totalCents);
  $("[data-last-updated]").textContent = value.updatedAt ? `Server status updated ${formatDate(value.updatedAt)}.` : "";
  renderJourney(value);

  renderReceipt(value.receipt, value.paymentStatus);
  const paymentVisible = value.paymentAttentionRequired && ["requires_action", "failed"].includes(value.paymentStatus)
    && Boolean(publicConfig?.squareApplicationId || publicConfig?.stripePublishableKey);
  $("[data-payment-panel]").hidden = !paymentVisible;
  $("[data-cancel-action]").hidden = !value.canCancel;
  $("[data-reorder-action]").hidden = value.fulfillmentStatus !== "delivered" || !publicConfig?.bookingEnabled;
  $("[data-claim-link]").hidden = !publicConfig?.claimsEnabled || !value.canClaim;

  renderReschedule(value.rescheduleOptions);
  renderFeedback(value);
  renderTip(value);
  renderRecurring(value);
}

function renderFeedback(value) {
  const panel = $("[data-feedback-panel]");
  const question = $("[data-feedback-question]");
  const resultPanel = $("[data-feedback-result]");
  if (!panel || !question || !resultPanel) return;
  const canSubmit = publicConfig?.feedbackEnabled === true && value.canSubmitFeedback === true && value.feedbackSubmitted !== true;
  panel.hidden = !canSubmit && !feedbackResult;
  question.hidden = !canSubmit || Boolean(feedbackResult);
  resultPanel.hidden = !feedbackResult;
  if (!feedbackResult) return;
  const needsFollowUp = feedbackResult.supportRequested === true;
  $("[data-feedback-result-title]").textContent = translateText(needsFollowUp ? "Support follow-up requested" : "Thank you for your feedback");
  $("[data-feedback-result-copy]").textContent = translateText(needsFollowUp
    ? "Our support team will follow up using the contact information already on the order."
    : "Your private response was received.");
  const reviewLink = $("[data-feedback-review-link]");
  reviewLink.hidden = !feedbackResult.googleReviewUrl;
  if (feedbackResult.googleReviewUrl) reviewLink.href = feedbackResult.googleReviewUrl;
  else reviewLink.removeAttribute("href");
}

function renderJourney(value) {
  const stage = value.fulfillmentStatus;
  const currentIndex = fulfillmentSteps.indexOf(stage);
  const status = $("[data-fulfillment-status]");
  const nextStep = $("[data-next-step]");
  const timeline = $("[data-fulfillment-timeline]");
  status.textContent = translateText(fulfillmentLabels[stage] || "Order update available");
  nextStep.textContent = translateText(nextStepByFulfillment[stage] || "Refresh for the latest update from our team.");
  timeline.dataset.state = stage === "canceled" ? "canceled" : "active";
  timeline.setAttribute(
    "aria-label",
    stage === "canceled"
      ? "This order was canceled. No further fulfillment steps are scheduled."
      : `Order journey. Current stage: ${fulfillmentLabels[stage] || "update available"}.`,
  );
  timeline.querySelectorAll("[data-timeline-step]").forEach((step) => {
    const stepIndex = fulfillmentSteps.indexOf(step.dataset.timelineStep);
    const state = stage === "canceled"
      ? "canceled"
      : stepIndex < currentIndex
        ? "complete"
        : stepIndex === currentIndex
          ? "current"
          : "upcoming";
    step.dataset.state = state;
    if (state === "current") step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  renderAttention(value);
}

function renderAttention(value) {
  const panel = $("[data-attention-panel]");
  const title = $("[data-attention-title]");
  const copy = $("[data-attention-copy]");
  const paymentNeedsHelp = Boolean(value.paymentAttentionRequired);
  const orderNeedsHelp = Boolean(value.operationalAttentionRequired);
  const canRepairPayment = ["requires_action", "failed"].includes(value.paymentStatus)
    && Boolean(publicConfig?.squareApplicationId || publicConfig?.stripePublishableKey);
  panel.hidden = !paymentNeedsHelp && !orderNeedsHelp;
  if (panel.hidden) {
    title.textContent = "";
    copy.textContent = "";
    delete panel.dataset.variant;
    return;
  }
  panel.dataset.variant = paymentNeedsHelp && orderNeedsHelp ? "both" : paymentNeedsHelp ? "payment" : "operations";
  if (paymentNeedsHelp && orderNeedsHelp) {
    title.textContent = "Your order needs attention";
    copy.textContent = canRepairPayment
      ? "Please update payment below. Our team is also reviewing an order detail and will contact you if anything else is needed."
      : "Our team is reviewing the payment and an order detail. We’ll contact you using the information on the order if anything is needed.";
  } else if (paymentNeedsHelp) {
    title.textContent = "Payment Failed · Action Required";
    copy.textContent = canRepairPayment
      ? value.paymentStatus === "requires_action"
        ? "Your card needs confirmation. Use the secure payment section below to keep this order moving."
        : "The card could not be charged. Update your payment method below; staff will retry the same order charge."
      : "The payment is being reviewed. We’ll contact you using the information on the order if anything is needed.";
  } else {
    title.textContent = "Our team is reviewing an order detail";
    copy.textContent = "Your laundry remains tracked. We’ll contact you using the information on the order if we need anything from you.";
  }
}

function paymentTone(status) {
  if (["requires_action", "failed", "disputed"].includes(status)) return "attention";
  if (["succeeded", "succeeded_external"].includes(status)) return "settled";
  if (["refunded", "partially_refunded"].includes(status)) return "refunded";
  return "pending";
}

function renderReceipt(receipt, paymentStatus) {
  $("[data-receipt-weight]").textContent = receipt.weightTenths === null ? "Pending" : `${(receipt.weightTenths / 10).toFixed(1)} lb`;
  $("[data-receipt-rate]").textContent = `${money(receipt.pricePerLbCents)}/lb`;
  $("[data-receipt-weight-charge]").textContent = money(receipt.weightChargeCents);
  $("[data-receipt-minimum-adjustment]").textContent = money(receipt.minimumAdjustmentCents);
  $("[data-receipt-base]").textContent = money(receipt.baseChargeCents);
  $("[data-receipt-delivery]").textContent = money(receipt.deliveryFeeCents);
  $("[data-receipt-discount]").textContent = `−${money(receipt.discountCents)}`;
  $("[data-receipt-tax]").textContent = money(receipt.taxCents);
  $("[data-receipt-tip]").textContent = money(receipt.tipCents);
  $("[data-receipt-total]").textContent = money(receipt.totalCents);
  $("[data-receipt-captured]").textContent = money(receipt.amountCapturedCents);
  $("[data-receipt-refunded]").textContent = `−${money(receipt.refundedCents)}`;
  $("[data-receipt-net]").textContent = money(receipt.netPaidCents);
  setReceiptRow("minimum", receipt.minimumAdjustmentCents > 0);
  setReceiptRow("delivery", receipt.deliveryFeeCents > 0);
  setReceiptRow("discount", receipt.discountCents > 0);
  setReceiptRow("tax", receipt.taxCents > 0);
  setReceiptRow("tip", receipt.tipCents > 0);
  setReceiptRow("refund", receipt.refundedCents > 0);
  $("[data-receipt-summary]").textContent = receipt.weightTenths === null
    ? "Weight-based charges are pending. Payment activity shown here is current."
    : ["succeeded", "partially_refunded", "refunded", "succeeded_external"].includes(paymentStatus)
      ? "This receipt reflects the order total and settled payment activity."
      : "Charges are itemized; the payment state is shown above.";
  $("[data-receipt-versions]").textContent = `Pricing ${receipt.pricingVersion} · tax rule ${receipt.taxRuleVersion} · minimum ${money(receipt.minimumCents)}.`;
}

function renderPortalDetails(details) {
  const panel = $("[data-portal-details]");
  const list = $("[data-history-list]");
  panel.hidden = false;
  list.replaceChildren();
  details.orders.forEach((historyOrder) => list.append(historyOrderCard(historyOrder)));
  if (!details.orders.length) list.append(textNode("p", "No order history is available yet."));
  $("[data-history-more]").hidden = !details.hasMore;
  renderPreferences(details.preferences);
}

function renderLoyaltySummary(summary) {
  const panel = $("[data-loyalty-panel]");
  const list = $("[data-loyalty-history]");
  if (!panel || !list) return;
  panel.hidden = false;
  $("[data-loyalty-balance]").textContent = money(summary.balanceCents);
  $("[data-loyalty-state]").textContent = summary.status === "not_enrolled"
    ? "No rewards have been earned yet. Eligible activity will appear here after enrollment."
    : `Rewards account: ${label(summary.status)}.`;
  list.replaceChildren();
  summary.history.forEach((entry) => {
    const amount = entry.amountCents > 0 ? `+${money(entry.amountCents)}` : money(entry.amountCents);
    const orderText = entry.orderNumber ? ` · order ${entry.orderNumber}` : "";
    const expiryText = entry.expiresAt ? ` · expires ${formatDate(entry.expiresAt)}` : "";
    list.append(textNode(
      "li",
      `${label(entry.type)} · ${amount} · balance ${money(entry.balanceAfterCents)}${orderText} · ${formatDate(entry.createdAt)}${expiryText}`,
    ));
  });
  if (!summary.history.length) list.append(textNode("li", "No rewards activity yet."));
}

function historyOrderCard(historyOrder) {
  const card = document.createElement("article");
  card.className = "pud-history-card";
  const header = document.createElement("header");
  header.append(textNode("h4", historyOrder.orderNumber), statusPill(historyOrder.fulfillmentStatus));
  card.append(header);
  card.append(textNode("p", `${label(historyOrder.serviceMode)} · ordered ${formatDate(historyOrder.createdAt)}${historyOrder.deliveredAt ? ` · delivered ${formatDate(historyOrder.deliveredAt)}` : ""}`));

  const summary = document.createElement("dl");
  summary.className = "pud-status-grid pud-history-summary";
  summary.append(
    definitionRow("Payment", label(historyOrder.paymentStatus)),
    definitionRow("Order charge", money(historyOrder.receipt.totalCents)),
    definitionRow("Net paid including tip", money(historyOrder.receipt.netPaidCents)),
    definitionRow("Weight", historyOrder.receipt.weightTenths === null ? "Pending" : `${(historyOrder.receipt.weightTenths / 10).toFixed(1)} lb`),
  );
  card.append(summary, historyReceiptDetails(historyOrder.receipt));

  if (historyOrder.claims.length) {
    card.append(textNode("h5", "Claims"));
    const claims = document.createElement("ul");
    claims.className = "pud-history-claims";
    historyOrder.claims.forEach((claim) => {
      const requested = claim.requestedAmountCents === null ? "No amount requested" : `${money(claim.requestedAmountCents)} requested`;
      const approved = claim.approvedAmountCents === null ? "" : ` · ${money(claim.approvedAmountCents)} approved`;
      const resolved = claim.resolvedAt ? ` · resolved ${formatDate(claim.resolvedAt)}` : "";
      claims.append(textNode("li", `${label(claim.claimType)} · ${label(claim.status)} · ${requested}${approved} · opened ${formatDate(claim.openedAt)}${resolved}`));
    });
    card.append(claims);
  }
  return card;
}

function historyReceiptDetails(receipt) {
  const details = document.createElement("details");
  details.className = "pud-history-receipt";
  const summary = textNode("summary", "View itemized receipt");
  const list = document.createElement("dl");
  list.className = "pud-receipt-grid";
  const rows = [
    ["Price per pound", `${money(receipt.pricePerLbCents)}/lb`, true],
    ["Weight charge", money(receipt.weightChargeCents), true],
    ["Minimum adjustment", money(receipt.minimumAdjustmentCents), receipt.minimumAdjustmentCents > 0],
    ["Laundry subtotal", money(receipt.baseChargeCents), true],
    ["Delivery fee", money(receipt.deliveryFeeCents), receipt.deliveryFeeCents > 0],
    ["Discount", `−${money(receipt.discountCents)}`, receipt.discountCents > 0],
    ["Tax", money(receipt.taxCents), receipt.taxCents > 0],
    ["Laundry order charge", money(receipt.totalCents), true],
    ["Order payment captured", money(receipt.amountCapturedCents), true],
    ["Separate tip payment", money(receipt.tipCents), receipt.tipCents > 0],
    ["Refunded", `−${money(receipt.refundedCents)}`, receipt.refundedCents > 0],
    ["Net paid including tip", money(receipt.netPaidCents), true],
  ];
  rows.filter(([, , visible]) => visible).forEach(([term, value]) => list.append(definitionRow(term, value)));
  details.append(summary, list, textNode("p", `Pricing ${receipt.pricingVersion} · tax rule ${receipt.taxRuleVersion} · minimum ${money(receipt.minimumCents)}.`));
  return details;
}

function renderPreferences(preferences) {
  const form = $("#pud-preferences-form");
  const note = $("[data-preferences-note]");
  $("[data-preferences-source]").textContent = `Defaults from ${preferences.sourceOrderNumber}.`;
  setValue(form, "detergent", preferences.detergent);
  setValue(form, "softenerPref", preferences.softenerPref);
  setValue(form, "specialInstructions", preferences.specialInstructions || "");
  form.hidden = !preferences.canUpdate;
  note.hidden = preferences.canUpdate;
  note.textContent = preferences.canUpdate ? "" : "These preferences are read-only because their source order is no longer eligible for customer updates.";
}

function definitionRow(term, value) {
  const row = document.createElement("div");
  row.append(textNode("dt", term), textNode("dd", value));
  return row;
}

function setReceiptRow(name, visible) {
  const node = $(`[data-receipt-${name}-row]`);
  if (node) node.hidden = !visible;
}

function renderReschedule(options) {
  const routes = Array.isArray(options) ? options : [];
  $("[data-reschedule-panel]").hidden = routes.length === 0;
  const select = $("[data-reschedule-options]");
  select.replaceChildren(new Option("Choose a new pickup window", ""));
  routes.forEach((route) => select.add(new Option(formatRoute({ ...route, id: route.routeId }), route.routeId)));
  select.disabled = routes.length === 0;
}

function renderTip(value) {
  $("[data-tip-panel]").hidden = !publicConfig?.tipsEnabled || !value.canTip || value.fulfillmentStatus !== "delivered";
}

function renderRecurring(value) {
  const panel = $("[data-recurring-panel]");
  const enabled = Boolean(publicConfig?.recurringEnabled);
  panel.hidden = !enabled;
  if (!enabled) return;
  const list = $("[data-recurring-list]");
  list.replaceChildren();
  value.recurringSchedules.forEach((schedule) => list.append(recurringCard(schedule)));
  if (!value.recurringSchedules.length) list.append(textNode("p", "No recurring schedule is active yet."));
  const createForm = $("[data-recurring-create]");
  createForm.hidden = !value.canCreateRecurring || !value.recurringDefaults;
  if (!createForm.hidden) applyRecurringDefaults(createForm, value.recurringDefaults);
}

function recurringCard(schedule) {
  const card = document.createElement("article");
  card.className = "pud-recurring-card";
  const header = document.createElement("header");
  header.append(textNode("h4", `${label(schedule.cadence)} pickups`), statusPill(schedule.status));
  card.append(header);
  card.append(textNode("p", schedule.nextProposalAt ? `Next proposal: ${formatDate(schedule.nextProposalAt)}` : "No pickup is currently scheduled."));
  const actions = actionGroup();
  if (schedule.status === "active") actions.append(actionButton("Pause schedule", "recurring-pause", { scheduleId: schedule.scheduleId }));
  if (schedule.status === "paused") actions.append(actionButton("Resume schedule", "recurring-resume", { scheduleId: schedule.scheduleId }));
  if (actions.children.length) card.append(actions);
  schedule.proposals.filter((proposal) => ["proposed", "blocked"].includes(proposal.status)).forEach((proposal) => {
    card.append(proposalCard(schedule, proposal));
  });
  return card;
}

function proposalCard(schedule, proposal) {
  const card = document.createElement("section");
  card.className = "pud-proposal-card";
  const header = document.createElement("header");
  header.append(textNode("h5", `Proposed pickup · ${formatDate(proposal.proposedForAt)}`), statusPill(proposal.status));
  card.append(header);
  if (proposal.expiresAt) card.append(textNode("p", `Respond by ${formatDate(proposal.expiresAt)}.`));
  if (proposal.blockedReason) card.append(textNode("p", "That pickup window is no longer available. Choose another open time to continue."));
  const actions = actionGroup();
  if (proposal.routeId) actions.append(actionButton("Continue with proposed pickup time", "proposal-confirm", {
    proposalId: proposal.proposalId,
    routeId: proposal.routeId,
  }));
  actions.append(actionButton(proposal.routeId ? "Choose another pickup time" : "Choose a pickup time", "proposal-change-route", {
    proposalId: proposal.proposalId,
  }, "secondary"));
  if (proposal.status === "proposed") actions.append(actionButton("Skip this pickup", "recurring-skip", {
    scheduleId: schedule.scheduleId,
    proposalId: proposal.proposalId,
  }, "link"));
  card.append(actions);
  return card;
}

function applyRecurringDefaults(form, defaults) {
  const signature = JSON.stringify(defaults);
  if (form.dataset.defaultsApplied === signature) return;
  setValue(form, "preferredBags", String(defaults.preferredBags));
  setValue(form, "detergent", defaults.detergent);
  setValue(form, "softenerPref", defaults.softenerPref);
  form.dataset.defaultsApplied = signature;
}

function setValue(form, name, value) {
  const control = form.elements.namedItem(name);
  if (!control) return;
  if (control instanceof HTMLSelectElement && ![...control.options].some((option) => option.value === value)) {
    const option = new Option(label(value), value);
    option.dataset.pudDynamic = "true";
    control.add(option);
  }
  control.value = value;
}

async function handleVersionConflict(error) {
  handleAuthorizationError(error);
  if (error?.code !== "PUD_VERSION_CONFLICT") throw error;
  await refresh();
  if (activeVerifiedSession()) {
    try { await loadVerifiedPortal(); } catch (_historyError) { /* refresh still recovered the public order state */ }
  }
  message("This order changed on the server. We refreshed it; review the latest details before trying again.");
}

function handleAuthorizationError(error) {
  if (!authorizationErrors.has(error?.code)) return;
  clearVerifiedSession();
  clearStepUpVerification();
  renderStepUpState("Fresh phone verification is required before trying again.");
  focusStepUp();
}

async function runAction(callback) {
  if (actionInFlight) return;
  actionInFlight = true;
  setBusy(true);
  try {
    await callback();
  } catch (error) {
    handleAuthorizationError(error);
    message(error?.message || "We could not complete that action.");
  } finally {
    actionInFlight = false;
    setBusy(false);
  }
}

function activeVerifiedSession() {
  if (!verifiedSession) return null;
  if (Date.parse(verifiedSession.expiresAt) > Date.now() + 2_000) return verifiedSession;
  clearVerifiedSession();
  return null;
}

function scheduleSessionExpiry() {
  globalThis.clearTimeout(sessionExpiryTimer);
  if (!verifiedSession) return;
  const delay = Math.max(0, Date.parse(verifiedSession.expiresAt) - Date.now());
  sessionExpiryTimer = globalThis.setTimeout(() => {
    clearVerifiedSession();
    renderStepUpState("Your verified session expired. Verify the mobile number again.");
  }, Math.min(delay + 100, 2_147_000_000));
}

function clearVerifiedSession() {
  globalThis.clearTimeout(sessionExpiryTimer);
  sessionExpiryTimer = 0;
  verifiedSession = null;
  clearPortalDetails();
}

function clearPortalDetails() {
  portalDetails = null;
  portalPreferences = null;
  const panel = $("[data-portal-details]");
  const list = $("[data-history-list]");
  if (panel) panel.hidden = true;
  list?.replaceChildren();
  const form = $("#pud-preferences-form");
  form?.reset();
  form?.querySelectorAll("option[data-pud-dynamic]").forEach((option) => option.remove());
  const source = $("[data-preferences-source]");
  const note = $("[data-preferences-note]");
  if (source) source.textContent = "";
  if (note) {
    note.textContent = "";
    note.hidden = true;
  }
  clearLoyaltySummary();
}

function clearLoyaltySummary() {
  portalLoyalty = null;
  const panel = $("[data-loyalty-panel]");
  if (panel) panel.hidden = true;
  const balance = $("[data-loyalty-balance]");
  const state = $("[data-loyalty-state]");
  if (balance) balance.textContent = "";
  if (state) state.textContent = "";
  $("[data-loyalty-history]")?.replaceChildren();
}

function clearStepUpVerification() {
  verificationId = "";
  $("#pud-step-up-phone-form")?.reset();
  $("#pud-step-up-code-form")?.reset();
  $("#pud-step-up-resend-form")?.reset();
  resetTurnstile($("#pud-step-up-phone-form"));
  resetTurnstile($("#pud-step-up-resend-form"));
}

function renderStepUpState(override = "") {
  const session = activeVerifiedSession();
  const phoneForm = $("#pud-step-up-phone-form");
  const codeForm = $("#pud-step-up-code-form");
  const resendPanel = $("[data-step-up-resend-panel]");
  const active = $("[data-step-up-active]");
  const status = $("[data-step-up-state]");
  if (!phoneForm || !codeForm || !active || !status) return;
  phoneForm.hidden = Boolean(session) || Boolean(verificationId);
  codeForm.hidden = Boolean(session) || !verificationId;
  if (resendPanel) resendPanel.hidden = Boolean(session) || !verificationId;
  active.hidden = !session;
  status.dataset.active = session ? "true" : "false";
  status.textContent = override || (session
    ? `Phone verified until ${formatDate(session.expiresAt)}. Each protected action still receives its own one-time authorization.`
    : verificationId
      ? "Enter the code. The resulting verified session stays only in this page's memory."
      : "Phone verification is required for protected actions.");
  if (!phoneForm.hidden) ensureTurnstile(phoneForm);
  if (resendPanel && !resendPanel.hidden) ensureTurnstile($("#pud-step-up-resend-form"));
}

function focusStepUp() {
  $("[data-step-up]")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const selector = verificationId ? "#pud-step-up-code-form input[name=code]" : "#pud-step-up-phone-form input[name=phone]";
  $(selector)?.focus();
}

function closePaymentReplacement() {
  destroyPaymentMethodReplacement();
  destroySquareCardReplacement();
  recoverySetupIntentId = "";
  confirmedReplacementSetupIntentId = "";
  recoveryPaymentProvider = "stripe";
  const form = $("#pud-payment-method-form");
  if (form) form.hidden = true;
  const actions = $("[data-payment-actions]");
  if (actions) actions.hidden = false;
  $("#pud-payment-method-element")?.replaceChildren();
}

function clearMemoryCredentials() {
  clearAutomaticRefresh();
  clearVerifiedSession();
  clearStepUpVerification();
  closePaymentReplacement();
  closeConfirmation();
  clearRescheduledCalendar();
}

function clearOrderLoadedState() {
  delete root.dataset.orderLoaded;
}

function clearFeedbackState() {
  pendingFeedbackSatisfaction = "";
  feedbackResult = null;
}

function clearRescheduledCalendar() {
  rescheduledCalendarPickup = null;
  const panel = $("[data-reschedule-calendar]");
  if (panel) panel.hidden = true;
  const status = $("[data-reschedule-calendar-status]");
  if (status) status.textContent = "";
}

function fragmentToken() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch (_error) { return ""; }
}

function replacePrivateLocation(value) {
  const hash = value ? `#${encodeURIComponent(value)}` : "";
  history.replaceState(null, "", `${withLocalePath(location.pathname)}${hash}`);
}

async function setupTurnstile(siteKey) {
  if (!siteKey) throw new Error("Phone verification protection is not configured.");
  turnstileSiteKey = siteKey;
  if (!globalThis.turnstile) {
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
}

function ensureTurnstile(container) {
  if (!container || !turnstileSiteKey || !globalThis.turnstile?.render) return;
  container.querySelectorAll("[data-turnstile]").forEach((node) => {
    if (node.dataset.widgetId) return;
    let widgetId;
    const resetWithMessage = (text, delay = 0) => {
      if (node.closest("form")?.hidden) return;
      message(text);
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

function turnstileValue(form) {
  const value = String(new FormData(form).get("cf-turnstile-response") || "");
  if (!value) throw new Error("Complete the anti-bot check and try again.");
  return value;
}

function resetTurnstile(form) {
  const widget = form?.querySelector?.("[data-turnstile]");
  if (!widget?.dataset.widgetId || !globalThis.turnstile?.reset) return;
  try { globalThis.turnstile.reset(widget.dataset.widgetId); } catch (_error) { /* no-op */ }
}

function actionButton(text, action, data = {}, variant = "primary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `pud-button pud-button-${variant}`;
  button.dataset.action = action;
  Object.entries(data).forEach(([key, value]) => { button.dataset[key] = value; });
  button.textContent = text;
  return button;
}

function actionGroup() {
  const node = document.createElement("div");
  node.className = "pud-actions";
  return node;
}

function statusPill(status) {
  const node = textNode("span", label(status));
  node.className = "pud-status-pill";
  node.dataset.state = status;
  return node;
}

function textNode(tagName, text) {
  return Object.assign(document.createElement(tagName), { textContent: text });
}

function label(value, fallback = "Update available") {
  return translateText(humanLabels[String(value || "")] || fallback);
}

function pickupWindowLabel(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!code) return "Not scheduled yet";
  if (code === "AM") return "Morning pickup window";
  if (code === "PM") return "Afternoon pickup window";
  return "Scheduled pickup window";
}

function formatSavedWindow(startAt, endAt, fallback) {
  if (!startAt) return translateText(fallback);
  const start = formatDate(startAt);
  if (!endAt) return start;
  const end = formatDate(endAt);
  return `${start} – ${end}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return translateText("date unavailable");
  return formatCentralDateTime(date, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function money(cents) {
  return formatCurrencyCents(cents);
}

function setBusy(busy) {
  root.setAttribute("aria-busy", String(busy));
  root.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
}

function message(text, variant = "error") {
  const node = $("[data-message]");
  node.textContent = translateExternalText(text);
  node.dataset.variant = variant;
  node.setAttribute("role", variant === "error" ? "alert" : "status");
  node.setAttribute("aria-live", variant === "error" ? "assertive" : "polite");
  node.hidden = !text;
  if (text && variant === "error") node.focus();
}
