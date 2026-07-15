import {
  cancelOrder,
  createRecurring,
  getPublicConfig,
  paymentSession,
  recurringAction,
  reorderOrder,
  replacePaymentMethod,
  requestReschedule,
  statusOrder,
  tipOrder,
} from "./pud-api.js";
import { stableActionKey } from "./pud-idempotency.js";
import {
  confirmPaymentMethodReplacement,
  confirmPaymentRemediation,
  destroyPaymentMethodReplacement,
  preparePaymentMethodReplacement,
} from "./pud-payment.js";
import { PUD_CONFIG } from "./pud-config.js";
import { storeReorderBootstrap } from "./pud-reorder.js";
import { formatRoute } from "./pud-scheduling.js";

const root = document.querySelector("[data-pud-status]");
const $ = (selector) => root.querySelector(selector);
let token = "";
let order = null;
let publicConfig = null;
let actionInFlight = false;
let recoverySetupIntentId = "";

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
  if (!token) return message("Open the private status link from your confirmation message.");
  await refresh();
}

function bind() {
  root.addEventListener("submit", onSubmit);
  root.addEventListener("click", onClick);
}

async function onSubmit(event) {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || actionInFlight) return;
  if (form.id === "pud-status-form") {
    const submitted = String(new FormData(form).get("token") || "").trim().replace(/^#/, "");
    if (!submitted) return message("Enter the private token from your confirmation message.");
    token = submitted;
    replacePrivateLocation(token);
    publicConfig = null;
    await runAction(refresh);
    return;
  }
  if (!token || !order) return message("Refresh the private order before using this control.");
  if (form.id === "pud-reschedule-form") await runAction(() => submitReschedule(form));
  if (form.id === "pud-payment-method-form") await runAction(submitPaymentMethod);
  if (form.id === "pud-tip-form") await runAction(() => submitTip(form));
  if (form.id === "pud-recurring-create-form") await runAction(() => submitRecurring(form));
}

async function onClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button || actionInFlight || !token) return;
  const action = button.dataset.action;
  if (action === "refresh") return runAction(refresh);
  if (!order) return message("Refresh the private order before using this control.");

  if (action === "cancel" && confirm("Cancel this order? This cannot be undone.")) {
    return runAction(cancelCurrentOrder);
  }
  if (action === "reorder") return runAction(() => beginBookingBootstrap());
  if (action === "payment-replace") return runAction(startPaymentReplacement);
  if (action === "payment-replace-cancel") {
    closePaymentReplacement();
    return;
  }
  if (["recurring-pause", "recurring-resume", "recurring-skip"].includes(action)) {
    return runAction(() => updateRecurring(button));
  }
  if (["proposal-confirm", "proposal-change-route"].includes(action)) {
    const routeId = action === "proposal-confirm" ? button.dataset.routeId || "" : "";
    return runAction(() => beginBookingBootstrap(button.dataset.proposalId || "", routeId));
  }
}

async function refresh() {
  try {
    const [config, status] = await Promise.all([
      getPublicConfig(),
      statusOrder(token),
    ]);
    publicConfig = config;
    order = status;
    closePaymentReplacement();
    render(status);
  } catch (error) {
    message(error?.message || "Order status could not be refreshed.");
    throw error;
  }
}

async function cancelCurrentOrder() {
  const signature = `${order.orderNumber}:${order.version}:customer_request`;
  const key = await stableActionKey("cancel", signature);
  try {
    order = await cancelOrder(token, order.version, "customer_request", key);
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
    order = await requestReschedule(token, route.routeProof, order.version, reason, key);
    render(order);
    message("Your pickup window was updated.", "success");
  } catch (error) {
    await handleVersionConflict(error);
  }
}

async function startPaymentReplacement() {
  const session = await paymentSession(token);
  recoverySetupIntentId = session.setupIntentId;
  const form = $("#pud-payment-method-form");
  const mount = $("#pud-payment-method-element");
  mount.replaceChildren();
  await preparePaymentMethodReplacement(publicConfig, session.setupIntentClientSecret, mount);
  form.hidden = false;
  $("[data-payment-actions]").hidden = true;
  form.querySelector("button[type=submit]")?.focus();
  message("Secure replacement-card fields are ready. Confirm the card to retry the same payment.", "success");
}

async function submitPaymentMethod() {
  if (!recoverySetupIntentId) throw new Error("Start card replacement again before confirming.");
  // The return URL deliberately omits the bearer fragment. A redirecting
  // authentication flow can be reopened from the original private link.
  const setupIntent = await confirmPaymentMethodReplacement(`${location.origin}${PUD_CONFIG.statusPath}`);
  if (setupIntent.id !== recoverySetupIntentId) throw new Error("Stripe returned a different card setup session.");
  const signature = `${order.orderNumber}:${setupIntent.id}`;
  const key = await stableActionKey("payment-method", signature);
  order = await replacePaymentMethod(token, setupIntent.id, key);
  closePaymentReplacement();
  render(order);
  message("The replacement card was saved and the original payment was retried. Refresh if payment is still processing.", "success");
}

async function submitTip(form) {
  const amountText = String(new FormData(form).get("amount") || "").trim();
  if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(amountText)) throw new Error("Enter a tip amount with no more than two decimal places.");
  const amountCents = Math.round(Number(amountText) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 50 || amountCents > 100_000) {
    throw new Error("Tip amount must be between $0.50 and $1,000.00.");
  }
  if (!confirm(`Add a ${money(amountCents)} tip to ${order.orderNumber}?`)) return;
  const signature = `${order.orderNumber}:${amountCents}`;
  const key = await stableActionKey("tip", signature);
  const result = await tipOrder(token, amountCents, key);
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
  await createRecurring(token, input, key);
  await refresh();
  message("Your recurring pickup schedule was created. Future proposals still require your confirmation.", "success");
}

async function updateRecurring(button) {
  const action = button.dataset.action.replace("recurring-", "");
  const scheduleId = button.dataset.scheduleId || "";
  const proposalId = button.dataset.proposalId || "";
  const schedule = order.recurringSchedules.find((item) => item.scheduleId === scheduleId);
  if (!schedule) throw new Error("That recurring schedule is no longer available.");
  const signature = `${action}:${scheduleId}:${schedule.version}:${proposalId}`;
  const key = await stableActionKey(`recurring-${action}`, signature);
  try {
    await recurringAction(action, token, {
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
  const bootstrap = await reorderOrder(token, proposalId || undefined);
  if (bootstrap.bookingBlocked) return message("Resolve the payment hold before starting another pickup.");
  storeReorderBootstrap({
    ...bootstrap,
    ...(proposalId ? { recurringProposalId: bootstrap.recurringProposalId || proposalId } : {}),
    ...(preferredRouteId ? { preferredRouteId } : {}),
  });
  location.assign(`${PUD_CONFIG.bookingPath}#${proposalId ? "proposal" : "reorder"}`);
}

function render(value) {
  $("[data-status-content]").hidden = false;
  $("[data-order-number]").textContent = value.orderNumber || "Your order";
  $("[data-fulfillment-status]").textContent = label(value.fulfillmentStatus);
  $("[data-payment-status]").textContent = label(value.paymentStatus);
  $("[data-pickup-window]").textContent = value.pickupWindowCode || "See confirmation message";
  $("[data-delivery-promise]").textContent = value.deliveryPromisedAt ? formatDate(value.deliveryPromisedAt) : "Pending after intake";
  $("[data-bag-status]").textContent = value.actualBags == null ? "Confirmed after pickup" : `${value.actualBags} bag${value.actualBags === 1 ? "" : "s"} in this order`;
  $("[data-total]").textContent = value.weightTenths == null ? "Calculated after weighing" : money(value.totalCents);
  $("[data-last-updated]").textContent = value.updatedAt ? `Server status updated ${formatDate(value.updatedAt)}.` : "";
  $("[data-receipt]").hidden = !["succeeded", "partially_refunded", "refunded", "succeeded_external"].includes(value.paymentStatus);

  const paymentVisible = value.paymentAttentionRequired && ["requires_action", "failed"].includes(value.paymentStatus) && Boolean(publicConfig?.stripePublishableKey);
  $("[data-payment-panel]").hidden = !paymentVisible;
  $("[data-cancel-action]").hidden = !value.canCancel;
  $("[data-reorder-action]").hidden = value.fulfillmentStatus !== "delivered" || !publicConfig?.bookingEnabled;
  $("[data-claim-link]").hidden = !publicConfig?.claimsEnabled || !value.canClaim;
  $("[data-claim-link]").href = `/pickup-delivery/claims/#${encodeURIComponent(token)}`;

  renderReschedule(value.rescheduleOptions);
  renderTip(value);
  renderRecurring(value);
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
  if (proposal.blockedReason) card.append(textNode("p", `A new route is needed: ${label(proposal.blockedReason)}.`));
  const actions = actionGroup();
  if (proposal.routeId) actions.append(actionButton("Continue with proposed route", "proposal-confirm", {
    proposalId: proposal.proposalId,
    routeId: proposal.routeId,
  }));
  actions.append(actionButton(proposal.routeId ? "Choose another route" : "Choose a route", "proposal-change-route", {
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
    control.add(new Option(label(value), value));
  }
  control.value = value;
}

async function handleVersionConflict(error) {
  if (error?.code !== "PUD_VERSION_CONFLICT") throw error;
  await refresh();
  message("This order changed on the server. We refreshed it; review the latest details before trying again.");
}

async function runAction(callback) {
  if (actionInFlight) return;
  actionInFlight = true;
  setBusy(true);
  try {
    await callback();
  } catch (error) {
    message(error?.message || "We could not complete that action.");
  } finally {
    actionInFlight = false;
    setBusy(false);
  }
}

function closePaymentReplacement() {
  destroyPaymentMethodReplacement();
  recoverySetupIntentId = "";
  const form = $("#pud-payment-method-form");
  if (form) form.hidden = true;
  const actions = $("[data-payment-actions]");
  if (actions) actions.hidden = false;
  $("#pud-payment-method-element")?.replaceChildren();
}

function fragmentToken() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch (_error) { return ""; }
}

function replacePrivateLocation(value) {
  const hash = value ? `#${encodeURIComponent(value)}` : "";
  history.replaceState(null, "", `${location.pathname}${hash}`);
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

function label(value) {
  return String(value || "pending").replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }).format(date);
}

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(cents) / 100);
}

function setBusy(busy) {
  root.setAttribute("aria-busy", String(busy));
  root.querySelectorAll("button").forEach((button) => { button.disabled = busy; });
}

function message(text, variant = "error") {
  const node = $("[data-message]");
  node.textContent = text;
  node.dataset.variant = variant;
  node.hidden = !text;
  if (text) node.focus();
}
