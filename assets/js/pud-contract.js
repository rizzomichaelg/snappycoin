const define = (schema, required, optional = [], { idempotent = false } = {}) => Object.freeze({
  schema,
  required: Object.freeze(required),
  allowed: Object.freeze([...required, ...optional]),
  idempotent,
});

/**
 * Browser request contracts mirrored from docs/pud-openapi.yaml. Every public
 * JSON payload passes through this table before fetch so stale/unknown fields
 * cannot silently leak into a request.
 */
export const PUD_PUBLIC_REQUEST_CONTRACTS = Object.freeze({
  "/api/pud/address/check": define("AddressCheckRequest", ["address", "turnstileToken"], ["attribution"]),
  "/api/pud/waitlist": define(
    "WaitlistRequest",
    ["address", "turnstileToken", "addressProof", "firstName", "lastName", "phone", "reason", "marketingEmailConsent", "marketingSmsConsent", "consentVersions"],
    ["attribution", "email", "requestedRouteId"],
  ),
  "/api/pud/phone/start": define("PhoneStartRequest", ["phone", "turnstileToken"]),
  "/api/pud/phone/resend": define("PhoneResendRequest", ["verificationId", "turnstileToken"]),
  "/api/pud/phone/verify": define("PhoneVerifyRequest", ["verificationId", "code"]),
  "/api/pud/payment/setup": define(
    "PaymentSetupRequest",
    ["idempotencyKey", "checkoutAttemptId", "phoneProof", "addressProof", "routeProof", "firstName", "lastName"],
    ["email", "attribution", "waitlistContinuationToken"],
    { idempotent: true },
  ),
  "/api/pud/orders": define(
    "CreateOrderRequest",
    ["idempotencyKey", "checkoutProof", "setupIntentId", "routeId", "firstName", "lastName", "address", "preferences", "consents"],
    ["email", "promotionCode", "referralCode", "recurringProposalId", "attribution"],
    { idempotent: true },
  ),
  "/api/pud/orders/status": define("StatusTokenRequest", ["token"]),
  "/api/pud/orders/cancel": define(
    "CancelOrderRequest",
    ["token", "reason", "expectedVersion", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/reschedule-request": define(
    "RescheduleRequest",
    ["token", "routeProof", "expectedVersion", "idempotencyKey"],
    ["reason"],
    { idempotent: true },
  ),
  "/api/pud/orders/payment-session": define("StatusTokenRequest", ["token"]),
  "/api/pud/orders/payment-method": define(
    "PaymentMethodRequest",
    ["token", "setupIntentId", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/reorder": define("ReorderRequest", ["token"], ["proposalId"]),
  "/api/pud/orders/tip": define(
    "TipRequest",
    ["token", "amountCents", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/claim": define(
    "ClaimRequest",
    ["token", "claimType", "description", "idempotencyKey"],
    ["requestedAmountCents", "evidence"],
    { idempotent: true },
  ),
  "/api/pud/recurring": define(
    "RecurringCreateRequest",
    ["token", "cadence", "preferredRouteRule", "preferredBags", "detergent", "softenerPref", "idempotencyKey"],
    ["specialInstructions"],
    { idempotent: true },
  ),
  "/api/pud/recurring/pause": define(
    "RecurringActionRequest",
    ["token", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
  "/api/pud/recurring/skip": define(
    "RecurringActionRequest",
    ["token", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
  "/api/pud/recurring/resume": define(
    "RecurringActionRequest",
    ["token", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
});

export function contractBody(path, input) {
  const contract = PUD_PUBLIC_REQUEST_CONTRACTS[path];
  if (!contract) throw new TypeError(`No browser request contract is defined for ${path}.`);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError(`${contract.schema} must be an object.`);

  const result = {};
  for (const field of contract.allowed) {
    if (input[field] !== undefined) result[field] = input[field];
  }
  const missing = contract.required.filter((field) => result[field] === undefined || result[field] === null || result[field] === "");
  if (missing.length) throw new TypeError(`${contract.schema} is missing: ${missing.join(", ")}.`);
  return result;
}

export function assertPublicConfig(value) {
  const result = object(value, "PublicConfig");
  for (const field of ["publicEnabled", "bookingEnabled", "recurringEnabled", "tipsEnabled", "referralsEnabled", "claimsEnabled"]) {
    boolean(result[field], `PublicConfig.${field}`);
  }
  if (result.stripePublishableKey !== null && result.stripePublishableKey !== undefined) string(result.stripePublishableKey, "PublicConfig.stripePublishableKey");
  if (result.turnstileSiteKey !== null && result.turnstileSiteKey !== undefined) string(result.turnstileSiteKey, "PublicConfig.turnstileSiteKey");
  oneOf(result.timezone, ["America/Chicago"], "PublicConfig.timezone");
  const pricing = object(result.pricing, "PublicConfig.pricing");
  for (const field of ["pricePerLbCents", "minimumCents", "deliveryFeeCents"]) nonnegativeInteger(pricing[field], `PublicConfig.pricing.${field}`);
  string(pricing.version, "PublicConfig.pricing.version");
  object(result.consentVersions, "PublicConfig.consentVersions");
  return result;
}

export function assertOrderStatus(value) {
  const result = object(value, "SafeOrderStatus");
  string(result.orderNumber, "SafeOrderStatus.orderNumber");
  positiveInteger(result.version, "SafeOrderStatus.version");
  oneOf(result.fulfillmentStatus, ["submitted", "confirmed", "picked_up", "weighed", "ready", "out_for_delivery", "delivered", "canceled"], "SafeOrderStatus.fulfillmentStatus");
  paymentStatus(result.paymentStatus, "SafeOrderStatus.paymentStatus");
  string(result.updatedAt, "SafeOrderStatus.updatedAt");
  for (const field of ["paymentAttentionRequired", "operationalAttentionRequired", "canCancel", "canTip", "canClaim"]) {
    boolean(result[field], `SafeOrderStatus.${field}`);
  }
  boolean(result.canCreateRecurring, "SafeOrderStatus.canCreateRecurring");
  for (const field of ["totalCents", "refundedCents"]) nonnegativeInteger(result[field], `SafeOrderStatus.${field}`);
  if (!Array.isArray(result.rescheduleOptions)) throw new TypeError("SafeOrderStatus.rescheduleOptions must be an array.");
  if (!Array.isArray(result.recurringSchedules)) throw new TypeError("SafeOrderStatus.recurringSchedules must be an array.");
  result.rescheduleOptions.forEach(assertRouteOption);
  result.recurringSchedules.forEach(assertRecurringSchedule);
  if (!Object.hasOwn(result, "recurringDefaults")) throw new TypeError("SafeOrderStatus is missing recurringDefaults.");
  if (result.recurringDefaults !== undefined && result.recurringDefaults !== null) assertRecurringDefaults(result.recurringDefaults);
  if (result.canCreateRecurring && !result.recurringDefaults) throw new TypeError("SafeOrderStatus is missing recurring defaults.");
  if (Object.keys(result).some((field) => /ciphertext|_hmac|clientsecret|statustoken|phone|email/i.test(field))) {
    throw new TypeError("SafeOrderStatus contains a private implementation field.");
  }
  return result;
}

export function assertPaymentSession(value) {
  const result = object(value, "PaymentRecovery");
  paymentStatus(result.paymentStatus, "PaymentRecovery.paymentStatus");
  string(result.setupIntentId, "PaymentRecovery.setupIntentId");
  string(result.setupIntentClientSecret, "PaymentRecovery.setupIntentClientSecret");
  boolean(result.duplicate, "PaymentRecovery.duplicate");
  return result;
}

export function assertReorderBootstrap(value) {
  const result = object(value, "ReorderBootstrap");
  string(result.priorOrderNumber, "ReorderBootstrap.priorOrderNumber");
  const customer = object(result.customer, "ReorderBootstrap.customer");
  string(customer.firstName, "ReorderBootstrap.customer.firstName");
  string(customer.lastName, "ReorderBootstrap.customer.lastName");
  if (!/^\d{4}$/.test(string(customer.phoneLast4, "ReorderBootstrap.customer.phoneLast4"))) {
    throw new TypeError("ReorderBootstrap.customer.phoneLast4 must contain four digits.");
  }
  optionalString(customer.email, "ReorderBootstrap.customer.email");
  const address = object(result.address, "ReorderBootstrap.address");
  for (const field of ["line1", "city", "state", "postalCode"]) string(address[field], `ReorderBootstrap.address.${field}`);
  optionalString(address.line2, "ReorderBootstrap.address.line2");
  const preferences = object(result.preferences, "ReorderBootstrap.preferences");
  positiveInteger(preferences.estimatedBags, "ReorderBootstrap.preferences.estimatedBags");
  string(preferences.detergent, "ReorderBootstrap.preferences.detergent");
  string(preferences.softenerPref, "ReorderBootstrap.preferences.softenerPref");
  boolean(preferences.unattendedPickup, "ReorderBootstrap.preferences.unattendedPickup");
  boolean(preferences.unattendedDelivery, "ReorderBootstrap.preferences.unattendedDelivery");
  optionalString(preferences.specialInstructions, "ReorderBootstrap.preferences.specialInstructions");
  optionalString(preferences.accessNotes, "ReorderBootstrap.preferences.accessNotes");
  boolean(result.savedPaymentMethodAvailable, "ReorderBootstrap.savedPaymentMethodAvailable");
  boolean(result.bookingBlocked, "ReorderBootstrap.bookingBlocked");
  if (result.nextStep !== "address_check" || result.requiresPhoneVerification !== true || result.requiresPaymentSetup !== true) {
    throw new TypeError("ReorderBootstrap cannot bypass the normal proof chain.");
  }
  if (result.recurringProposalId !== undefined) string(result.recurringProposalId, "ReorderBootstrap.recurringProposalId");
  return result;
}

export function assertTipResult(value) {
  const result = object(value, "TipResult");
  string(result.paymentIntentId, "TipResult.paymentIntentId");
  string(result.status, "TipResult.status");
  nullableString(result.clientSecret, "TipResult.clientSecret");
  return result;
}

export function assertRecurringResult(value) {
  const result = object(value, "RecurringResult");
  string(result.scheduleId, "RecurringResult.scheduleId");
  oneOf(result.cadence, ["weekly", "biweekly", "monthly"], "RecurringResult.cadence");
  oneOf(result.status, ["active", "paused", "canceled"], "RecurringResult.status");
  nullableString(result.nextProposalAt, "RecurringResult.nextProposalAt");
  positiveInteger(result.version, "RecurringResult.version");
  oneOf(result.action, ["created", "pause", "skip", "resume"], "RecurringResult.action");
  if (result.proposal !== undefined) {
    const proposal = object(result.proposal, "RecurringResult.proposal");
    string(proposal.proposalId, "RecurringResult.proposal.proposalId");
    oneOf(proposal.status, ["skipped"], "RecurringResult.proposal.status");
    string(proposal.proposedForAt, "RecurringResult.proposal.proposedForAt");
  }
  return result;
}

function assertRouteOption(value) {
  const route = object(value, "PublicRouteOption");
  for (const field of ["routeId", "routeDate", "windowCode", "windowStartAt", "windowEndAt", "routeProof"]) {
    string(route[field], `PublicRouteOption.${field}`);
  }
  nonnegativeInteger(route.remainingOrders, "PublicRouteOption.remainingOrders");
  nonnegativeInteger(route.remainingBags, "PublicRouteOption.remainingBags");
  return route;
}

function assertRecurringSchedule(value) {
  const schedule = object(value, "PublicRecurringSchedule");
  string(schedule.scheduleId, "PublicRecurringSchedule.scheduleId");
  oneOf(schedule.cadence, ["weekly", "biweekly", "monthly"], "PublicRecurringSchedule.cadence");
  oneOf(schedule.status, ["active", "paused", "canceled"], "PublicRecurringSchedule.status");
  positiveInteger(schedule.version, "PublicRecurringSchedule.version");
  nullableString(schedule.nextProposalAt, "PublicRecurringSchedule.nextProposalAt");
  if (!Array.isArray(schedule.proposals)) throw new TypeError("PublicRecurringSchedule.proposals must be an array.");
  schedule.proposals.forEach((value) => {
    const proposal = object(value, "PublicRecurringProposal");
    string(proposal.proposalId, "PublicRecurringProposal.proposalId");
    oneOf(proposal.status, ["proposed", "confirmed", "skipped", "expired", "blocked"], "PublicRecurringProposal.status");
    string(proposal.proposedForAt, "PublicRecurringProposal.proposedForAt");
    string(proposal.expiresAt, "PublicRecurringProposal.expiresAt");
    optionalString(proposal.routeId, "PublicRecurringProposal.routeId");
    optionalString(proposal.blockedReason, "PublicRecurringProposal.blockedReason");
  });
  return schedule;
}

function assertRecurringDefaults(value) {
  const defaults = object(value, "RecurringDefaults");
  positiveInteger(defaults.preferredBags, "RecurringDefaults.preferredBags");
  string(defaults.detergent, "RecurringDefaults.detergent");
  string(defaults.softenerPref, "RecurringDefaults.softenerPref");
  object(defaults.preferredRouteRule, "RecurringDefaults.preferredRouteRule");
  return defaults;
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value;
}

function string(value, label) {
  if (typeof value !== "string" || !value) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function oneOf(value, allowed, label) {
  string(value, label);
  if (!allowed.includes(value)) throw new TypeError(`${label} is not supported.`);
  return value;
}

function paymentStatus(value, label) {
  return oneOf(value, ["uncharged", "processing", "succeeded", "requires_action", "failed", "partially_refunded", "refunded", "disputed", "succeeded_external"], label);
}

function optionalString(value, label) {
  if (value === null || value === undefined || value === "") return null;
  return string(value, label);
}

function nullableString(value, label) {
  if (value === null) return null;
  return string(value, label);
}

function boolean(value, label) {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean.`);
  return value;
}

function positiveInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${label} must be a positive integer.`);
  return value;
}

function nonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a nonnegative integer.`);
  return value;
}
