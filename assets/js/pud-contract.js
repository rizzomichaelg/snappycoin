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
  "/api/pud/address/autocomplete": define("AddressAutocompleteRequest", ["query", "sessionToken"]),
  "/api/pud/address/autocomplete/select": define("AddressAutocompleteSelectionRequest", ["placeId", "sessionToken"]),
  "/api/pud/address/check": define("AddressCheckRequest", ["address"], ["turnstileToken", "attribution"]),
  "/api/pud/waitlist": define(
    "WaitlistRequest",
    ["address", "turnstileToken", "addressProof", "firstName", "lastName", "phone", "reason", "marketingEmailConsent", "marketingSmsConsent", "consentVersions"],
    ["attribution", "email", "requestedRouteId", "locale"],
  ),
  "/api/pud/phone/start": define("PhoneStartRequest", ["phone"], ["turnstileToken"]),
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
    ["idempotencyKey", "routeId", "firstName", "lastName", "address", "preferences", "consents"],
    [
      "paymentCollectionMethod", "checkoutProof", "setupIntentId", "phoneProof", "addressProof",
      "routeProof", "deliveryRouteId", "deliveryRouteProof", "squareCardToken", "turnstileToken", "waitlistContinuationToken",
      "email", "promotionCode", "referralCode", "recurringProposalId", "attribution", "locale",
    ],
    { idempotent: true },
  ),
  "/api/pud/orders/status": define("StatusTokenRequest", ["token"]),
  "/api/pud/orders/feedback": define(
    "FeedbackSubmitRequest",
    ["token", "statusSession", "locale", "satisfaction", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/status-session": define("StatusSessionRequest", ["token", "phoneProof"]),
  "/api/pud/orders/status-recovery/start": define(
    "StatusRecoveryStartRequest",
    ["email", "phone", "turnstileToken"],
  ),
  "/api/pud/orders/status-recovery/verify": define(
    "StatusRecoveryVerifyRequest",
    ["recoveryId", "code"],
  ),
  "/api/pud/orders/history": define("PortalHistoryRequest", ["token", "statusSession"], ["cursor", "limit"]),
  "/api/pud/loyalty": define("LoyaltyCustomerRequest", ["token", "statusSession"], ["limit"]),
  "/api/pud/orders/action-capability": define("ActionCapabilityRequest", ["token", "statusSession", "purpose"]),
  "/api/pud/orders/claim-evidence/capability": define("ClaimEvidenceCapabilityRequest", ["token", "statusSession"]),
  "/api/pud/orders/claim-evidence/grant": define(
    "ClaimEvidenceGrantRequest",
    ["token", "actionCapability", "sha256", "byteSize", "mimeType"],
  ),
  "/api/pud/orders/cancel": define(
    "CancelOrderRequest",
    ["token", "actionCapability", "reason", "expectedVersion", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/reschedule-request": define(
    "RescheduleRequest",
    ["token", "actionCapability", "routeProof", "expectedVersion", "idempotencyKey"],
    ["reason"],
    { idempotent: true },
  ),
  "/api/pud/orders/payment-session": define("PaymentSessionRequest", ["token", "actionCapability"]),
  "/api/pud/orders/payment-method": define(
    "PaymentMethodRequest",
    ["token", "actionCapability", "idempotencyKey"],
    ["setupIntentId", "squareCardToken", "consentAccepted"],
    { idempotent: true },
  ),
  "/api/pud/orders/preferences": define(
    "PreferencesUpdateRequest",
    ["token", "actionCapability", "expectedVersion", "detergent", "softenerPref", "idempotencyKey"],
    ["specialInstructions"],
    { idempotent: true },
  ),
  "/api/pud/orders/reorder": define("ReorderRequest", ["token", "actionCapability"], ["proposalId"]),
  "/api/pud/orders/tip": define(
    "TipRequest",
    ["token", "actionCapability", "amountCents", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/claim": define(
    "ClaimRequest",
    ["token", "actionCapability", "claimType", "description", "idempotencyKey"],
    ["requestedAmountCents", "evidence"],
    { idempotent: true },
  ),
  "/api/pud/recurring": define(
    "RecurringCreateRequest",
    ["token", "actionCapability", "cadence", "preferredRouteRule", "preferredBags", "detergent", "softenerPref", "idempotencyKey"],
    ["specialInstructions"],
    { idempotent: true },
  ),
  "/api/pud/recurring/pause": define(
    "RecurringActionRequest",
    ["token", "actionCapability", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
  "/api/pud/recurring/skip": define(
    "RecurringActionRequest",
    ["token", "actionCapability", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
  "/api/pud/recurring/resume": define(
    "RecurringActionRequest",
    ["token", "actionCapability", "scheduleId", "expectedVersion", "idempotencyKey"],
    ["proposalId", "reason"],
    { idempotent: true },
  ),
  "/api/pud/orders/status-token/rotate": define(
    "StatusTokenMutationRequest",
    ["token", "actionCapability", "expectedVersion", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
  "/api/pud/orders/status-token/revoke": define(
    "StatusTokenMutationRequest",
    ["token", "actionCapability", "expectedVersion", "idempotencyKey"],
    [],
    { idempotent: true },
  ),
});

export const PUD_ACTION_PURPOSES = Object.freeze([
  "cancel_order", "reschedule_order", "payment_session", "replace_payment_method",
  "reorder", "add_tip", "open_claim", "create_recurring", "pause_recurring",
  "skip_recurring", "resume_recurring", "update_preferences", "rotate_status_token",
  "revoke_status_token", "upload_claim_evidence",
]);

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
  for (const field of [
    "publicEnabled", "addressAutocompleteEnabled", "productAnalyticsEnabled", "productExperimentEnabled", "bookingEnabled", "statusRecoveryEnabled", "feedbackEnabled", "recurringEnabled", "tipsEnabled", "promotionsEnabled", "referralsEnabled",
    "claimsEnabled", "loyaltyEnabled", "claimEvidenceEnabled",
  ]) {
    boolean(result[field], `PublicConfig.${field}`);
  }
  if (result.stripePublishableKey !== null && result.stripePublishableKey !== undefined) string(result.stripePublishableKey, "PublicConfig.stripePublishableKey");
  for (const field of ["squareApplicationId", "squareLocationId"]) {
    if (result[field] !== null && result[field] !== undefined) string(result[field], `PublicConfig.${field}`);
  }
  oneOf(result.squareEnvironment, ["sandbox", "production"], "PublicConfig.squareEnvironment");
  if (result.turnstileSiteKey !== null && result.turnstileSiteKey !== undefined) string(result.turnstileSiteKey, "PublicConfig.turnstileSiteKey");
  if (!Array.isArray(result.supportedLocales) || result.supportedLocales.length < 1) throw new TypeError("PublicConfig.supportedLocales must be a non-empty array.");
  result.supportedLocales.forEach((locale) => oneOf(locale, ["en-US", "es-US"], "PublicConfig.supportedLocales locale"));
  oneOf(result.defaultLocale, ["en-US", "es-US"], "PublicConfig.defaultLocale");
  oneOf(result.currency, ["USD"], "PublicConfig.currency");
  const support = object(result.support, "PublicConfig.support");
  string(support.email, "PublicConfig.support.email");
  if (support.phone !== null) string(support.phone, "PublicConfig.support.phone");
  oneOf(result.timezone, ["America/Chicago"], "PublicConfig.timezone");
  const pricing = object(result.pricing, "PublicConfig.pricing");
  for (const field of ["pricePerLbCents", "minimumCents", "deliveryFeeCents"]) nonnegativeInteger(pricing[field], `PublicConfig.pricing.${field}`);
  string(pricing.version, "PublicConfig.pricing.version");
  object(result.consentVersions, "PublicConfig.consentVersions");
  const scheduling = object(result.scheduling, "PublicConfig.scheduling");
  for (const field of ["pickupLeadTimeHours", "pickupSlotDurationMinutes", "minimumDeliveryDelayHours"]) nonnegativeInteger(scheduling[field], `PublicConfig.scheduling.${field}`);
  for (const field of ["sameDayBookingCutoff", "latestPickupSlotStart"]) string(scheduling[field], `PublicConfig.scheduling.${field}`);
  return result;
}

export function assertAddressAutocomplete(value) {
  const result = object(value, "AddressAutocompleteData");
  exactFields(result, ["suggestions", "requestId"], "AddressAutocompleteData");
  if (!Array.isArray(result.suggestions)) throw new TypeError("AddressAutocompleteData.suggestions must be an array.");
  if (result.suggestions.length > 5) throw new TypeError("AddressAutocompleteData.suggestions exceeds the maximum.");
  result.suggestions.forEach((suggestion) => {
    const item = object(suggestion, "AddressAutocompleteSuggestion");
    exactFields(item, ["placeId", "text"], "AddressAutocompleteSuggestion");
    string(item.placeId, "AddressAutocompleteSuggestion.placeId");
    string(item.text, "AddressAutocompleteSuggestion.text");
  });
  if (result.requestId !== undefined) string(result.requestId, "AddressAutocompleteData.requestId");
  return result;
}

export function assertAddressAutocompleteSelection(value) {
  const result = object(value, "AddressAutocompleteSelectionData");
  exactFields(result, ["address", "requestId"], "AddressAutocompleteSelectionData");
  const address = object(result.address, "AddressAutocompleteSelectionData.address");
  exactFields(address, ["line1", "line2", "city", "state", "postalCode"], "AddressAutocompleteSelectionData.address");
  for (const field of ["line1", "city", "state", "postalCode"]) string(address[field], `AddressAutocompleteSelectionData.address.${field}`);
  if (address.line2 !== undefined) string(address.line2, "AddressAutocompleteSelectionData.address.line2");
  if (result.requestId !== undefined) string(result.requestId, "AddressAutocompleteSelectionData.requestId");
  return result;
}

export function assertPhoneStart(value) {
  const result = object(value, "PhoneStartData");
  string(result.verificationId, "PhoneStartData.verificationId");
  if (!/^\d{4}$/.test(string(result.phoneLast4, "PhoneStartData.phoneLast4"))) {
    throw new TypeError("PhoneStartData.phoneLast4 must contain four digits.");
  }
  timestamp(result.expiresAt, "PhoneStartData.expiresAt");
  return result;
}

export function assertPhoneResend(value) {
  const result = object(value, "PhoneResendData");
  timestamp(result.expiresAt, "PhoneResendData.expiresAt");
  return result;
}

export function assertPhoneVerify(value) {
  const result = object(value, "PhoneVerifyData");
  string(result.phoneProof, "PhoneVerifyData.phoneProof");
  timestamp(result.expiresAt, "PhoneVerifyData.expiresAt");
  return result;
}

export function assertStatusRecoveryStart(value) {
  const result = object(value, "StatusRecoveryStartData");
  exactFields(result, ["accepted", "recoveryId", "phoneLast4", "expiresAt", "message", "requestId"], "StatusRecoveryStartData");
  if (result.accepted !== true) throw new TypeError("StatusRecoveryStartData.accepted must be true.");
  string(result.recoveryId, "StatusRecoveryStartData.recoveryId");
  if (!/^\d{4}$/.test(string(result.phoneLast4, "StatusRecoveryStartData.phoneLast4"))) {
    throw new TypeError("StatusRecoveryStartData.phoneLast4 must contain four digits.");
  }
  timestamp(result.expiresAt, "StatusRecoveryStartData.expiresAt");
  string(result.message, "StatusRecoveryStartData.message");
  if (result.requestId !== undefined) string(result.requestId, "StatusRecoveryStartData.requestId");
  return result;
}

export function assertStatusRecoveryVerify(value) {
  const result = object(value, "StatusRecoveryVerifyData");
  exactFields(result, ["accepted", "verified", "complete", "message", "requestId"], "StatusRecoveryVerifyData");
  if (result.accepted !== true) throw new TypeError("StatusRecoveryVerifyData.accepted must be true.");
  boolean(result.verified, "StatusRecoveryVerifyData.verified");
  boolean(result.complete, "StatusRecoveryVerifyData.complete");
  string(result.message, "StatusRecoveryVerifyData.message");
  if (result.requestId !== undefined) string(result.requestId, "StatusRecoveryVerifyData.requestId");
  return result;
}

export function assertOrderStatus(value) {
  const result = object(value, "SafeOrderStatus");
  string(result.orderNumber, "SafeOrderStatus.orderNumber");
  positiveInteger(result.version, "SafeOrderStatus.version");
  oneOf(result.fulfillmentStatus, ["submitted", "confirmed", "picked_up", "weighed", "ready", "out_for_delivery", "delivered", "canceled"], "SafeOrderStatus.fulfillmentStatus");
  paymentStatus(result.paymentStatus, "SafeOrderStatus.paymentStatus");
  string(result.updatedAt, "SafeOrderStatus.updatedAt");
  for (const field of ["pickupWindowStartAt", "pickupWindowEndAt", "deliveryWindowStartAt", "deliveryWindowEndAt"]) {
    nullableTimestamp(result[field], `SafeOrderStatus.${field}`);
  }
  nullableTimestamp(result.expectedCompletionAt, "SafeOrderStatus.expectedCompletionAt");
  const milestones = object(result.milestones, "SafeOrderStatus.milestones");
  timestamp(milestones.submittedAt, "SafeOrderStatus.milestones.submittedAt");
  for (const field of ["confirmedAt", "pickedUpAt", "weighedAt", "readyAt", "outForDeliveryAt", "deliveredAt"]) {
    nullableTimestamp(milestones[field], `SafeOrderStatus.milestones.${field}`);
  }
  for (const field of ["paymentAttentionRequired", "operationalAttentionRequired", "canCancel", "canTip", "canClaim", "canSubmitFeedback", "feedbackSubmitted"]) {
    boolean(result[field], `SafeOrderStatus.${field}`);
  }
  boolean(result.canCreateRecurring, "SafeOrderStatus.canCreateRecurring");
  oneOf(result.locale, ["en-US", "es-US"], "SafeOrderStatus.locale");
  oneOf(result.timezone, ["America/Chicago"], "SafeOrderStatus.timezone");
  oneOf(result.currency, ["USD"], "SafeOrderStatus.currency");
  for (const field of ["totalCents", "refundedCents"]) nonnegativeInteger(result[field], `SafeOrderStatus.${field}`);
  if (result.paymentMethod !== null) {
    const paymentMethod = object(result.paymentMethod, "SafeOrderStatus.paymentMethod");
    nullableString(paymentMethod.brand, "SafeOrderStatus.paymentMethod.brand");
    if (!/^\d{4}$/.test(string(paymentMethod.last4, "SafeOrderStatus.paymentMethod.last4"))) throw new TypeError("SafeOrderStatus.paymentMethod.last4 must contain four digits.");
  }
  nullableMoney(result.paymentAmountCents, "SafeOrderStatus.paymentAmountCents");
  assertItemizedReceipt(result.receipt);
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

export function assertStatusSession(value) {
  const result = object(value, "StatusSessionData");
  string(result.statusSession, "StatusSessionData.statusSession");
  timestamp(result.expiresAt, "StatusSessionData.expiresAt");
  timestamp(result.phoneVerifiedAt, "StatusSessionData.phoneVerifiedAt");
  positiveInteger(result.orderVersion, "StatusSessionData.orderVersion");
  return result;
}

export function assertFeedbackResult(value) {
  const result = object(value, "FeedbackSubmitData");
  exactFields(result, ["feedbackId", "satisfaction", "submittedAt", "duplicate", "supportRequested", "googleReviewUrl", "requestId"], "FeedbackSubmitData");
  string(result.feedbackId, "FeedbackSubmitData.feedbackId");
  oneOf(result.satisfaction, ["satisfied", "needs_follow_up"], "FeedbackSubmitData.satisfaction");
  timestamp(result.submittedAt, "FeedbackSubmitData.submittedAt");
  boolean(result.duplicate, "FeedbackSubmitData.duplicate");
  boolean(result.supportRequested, "FeedbackSubmitData.supportRequested");
  if (result.googleReviewUrl !== null) {
    string(result.googleReviewUrl, "FeedbackSubmitData.googleReviewUrl");
    let reviewUrl;
    try { reviewUrl = new URL(result.googleReviewUrl); } catch (_error) { throw new TypeError("FeedbackSubmitData.googleReviewUrl must be an HTTPS URL."); }
    if (reviewUrl.protocol !== "https:" || reviewUrl.username || reviewUrl.password) throw new TypeError("FeedbackSubmitData.googleReviewUrl must be an HTTPS URL.");
  }
  if (result.requestId !== undefined) string(result.requestId, "FeedbackSubmitData.requestId");
  return result;
}

export function assertActionCapability(value) {
  const result = object(value, "ActionCapabilityData");
  string(result.actionCapability, "ActionCapabilityData.actionCapability");
  oneOf(result.purpose, PUD_ACTION_PURPOSES, "ActionCapabilityData.purpose");
  timestamp(result.expiresAt, "ActionCapabilityData.expiresAt");
  positiveInteger(result.orderVersion, "ActionCapabilityData.orderVersion");
  return result;
}

export function assertClaimEvidenceCapability(value) {
  const result = assertActionCapability(value);
  if (result.purpose !== "upload_claim_evidence") {
    throw new TypeError("ClaimEvidenceCapabilityData.purpose must be upload_claim_evidence.");
  }
  return result;
}

export function assertClaimEvidenceGrant(value) {
  const result = object(value, "ClaimEvidenceGrantData");
  string(result.uploadGrant, "ClaimEvidenceGrantData.uploadGrant");
  timestamp(result.expiresAt, "ClaimEvidenceGrantData.expiresAt");
  if (result.maxBytes !== 5 * 1024 * 1024) {
    throw new TypeError("ClaimEvidenceGrantData.maxBytes must match the 5 MB public contract.");
  }
  if (!Array.isArray(result.acceptedMimeTypes) || result.acceptedMimeTypes.length !== 3 ||
      new Set(result.acceptedMimeTypes).size !== 3) {
    throw new TypeError("ClaimEvidenceGrantData.acceptedMimeTypes must contain the three unique supported types.");
  }
  result.acceptedMimeTypes.forEach((mimeType) => oneOf(
    mimeType,
    ["image/jpeg", "image/png", "application/pdf"],
    "ClaimEvidenceGrantData.acceptedMimeTypes",
  ));
  return result;
}

export function assertClaimEvidenceAsset(value) {
  const result = object(value, "ClaimEvidenceAssetData");
  string(result.assetId, "ClaimEvidenceAssetData.assetId");
  if (!/^[a-f0-9]{64}$/.test(string(result.sha256, "ClaimEvidenceAssetData.sha256"))) {
    throw new TypeError("ClaimEvidenceAssetData.sha256 must be a lowercase SHA-256 digest.");
  }
  oneOf(result.mimeType, ["image/jpeg", "image/png", "application/pdf"], "ClaimEvidenceAssetData.mimeType");
  positiveInteger(result.byteSize, "ClaimEvidenceAssetData.byteSize");
  if (result.byteSize > 5 * 1024 * 1024) throw new TypeError("ClaimEvidenceAssetData.byteSize exceeds 5 MB.");
  timestamp(result.retentionUntil, "ClaimEvidenceAssetData.retentionUntil");
  return result;
}

export function assertLoyaltySummary(value) {
  const result = object(value, "LoyaltySummaryData");
  oneOf(result.currency, ["USD"], "LoyaltySummaryData.currency");
  nonnegativeInteger(result.balanceCents, "LoyaltySummaryData.balanceCents");
  oneOf(result.status, ["not_enrolled", "active", "review_required", "suspended", "closed"], "LoyaltySummaryData.status");
  if (!Array.isArray(result.history)) throw new TypeError("LoyaltySummaryData.history must be an array.");
  result.history.forEach((value) => {
    const entry = object(value, "LoyaltyHistoryEntry");
    string(entry.transactionId, "LoyaltyHistoryEntry.transactionId");
    oneOf(entry.type, [
      "earn", "redeem", "reverse_earn", "reverse_redeem", "expire", "manual_credit", "manual_debit",
    ], "LoyaltyHistoryEntry.type");
    signedInteger(entry.amountCents, "LoyaltyHistoryEntry.amountCents");
    nonnegativeInteger(entry.balanceAfterCents, "LoyaltyHistoryEntry.balanceAfterCents");
    nullableString(entry.orderNumber, "LoyaltyHistoryEntry.orderNumber");
    nullableTimestamp(entry.expiresAt, "LoyaltyHistoryEntry.expiresAt");
    timestamp(entry.createdAt, "LoyaltyHistoryEntry.createdAt");
  });
  return result;
}

export function assertPortalHistory(value) {
  const result = object(value, "PortalHistoryData");
  string(result.anchorOrderNumber, "PortalHistoryData.anchorOrderNumber");
  boolean(result.hasMore, "PortalHistoryData.hasMore");
  if (result.nextCursor !== undefined) string(result.nextCursor, "PortalHistoryData.nextCursor");
  if (result.hasMore && !result.nextCursor) throw new TypeError("PortalHistoryData.nextCursor is required when more history exists.");
  if (!result.hasMore && result.nextCursor !== undefined) throw new TypeError("PortalHistoryData.nextCursor must be omitted on the final page.");
  if (!Array.isArray(result.orders)) throw new TypeError("PortalHistoryData.orders must be an array.");
  result.orders.forEach((value) => {
    const order = object(value, "PortalHistoryOrder");
    string(order.orderNumber, "PortalHistoryOrder.orderNumber");
    oneOf(order.serviceMode, ["pickup_delivery", "walk_in"], "PortalHistoryOrder.serviceMode");
    oneOf(order.fulfillmentStatus, ["submitted", "confirmed", "picked_up", "weighed", "ready", "out_for_delivery", "delivered", "canceled"], "PortalHistoryOrder.fulfillmentStatus");
    paymentStatus(order.paymentStatus, "PortalHistoryOrder.paymentStatus");
    timestamp(order.createdAt, "PortalHistoryOrder.createdAt");
    nullableTimestamp(order.deliveredAt, "PortalHistoryOrder.deliveredAt");
    timestamp(order.updatedAt, "PortalHistoryOrder.updatedAt");
    assertItemizedReceipt(order.receipt);
    if (!Array.isArray(order.claims)) throw new TypeError("PortalHistoryOrder.claims must be an array.");
    order.claims.forEach(assertPortalClaim);
  });
  assertPortalPreferences(result.preferences);
  return result;
}

export function assertPreferencesUpdate(value) {
  const result = object(value, "PreferencesUpdateData");
  assertPortalPreferences(result.preferences);
  assertOrderStatus(result.status);
  boolean(result.duplicate, "PreferencesUpdateData.duplicate");
  return result;
}

export function assertStatusTokenRotation(value) {
  const result = object(value, "StatusTokenRotationData");
  string(result.statusToken, "StatusTokenRotationData.statusToken");
  assertOrderStatus(result.status);
  return result;
}

export function assertStatusTokenRevocation(value) {
  const result = object(value, "StatusTokenRevocationData");
  if (result.revoked !== true) throw new TypeError("StatusTokenRevocationData.revoked must be true.");
  string(result.orderNumber, "StatusTokenRevocationData.orderNumber");
  positiveInteger(result.version, "StatusTokenRevocationData.version");
  return result;
}

export function assertClaimResult(value) {
  const result = object(value, "ClaimOpenData");
  string(result.claimId, "ClaimOpenData.claimId");
  string(result.claimType, "ClaimOpenData.claimType");
  oneOf(result.status, ["open", "investigating", "approved", "denied", "resolved", "withdrawn"], "ClaimOpenData.status");
  if (result.requestedAmountCents !== null) nonnegativeInteger(result.requestedAmountCents, "ClaimOpenData.requestedAmountCents");
  timestamp(result.openedAt, "ClaimOpenData.openedAt");
  positiveInteger(result.version, "ClaimOpenData.version");
  boolean(result.duplicate, "ClaimOpenData.duplicate");
  return result;
}

function assertItemizedReceipt(value) {
  const receipt = object(value, "ItemizedReceipt");
  oneOf(receipt.currency, ["usd"], "ItemizedReceipt.currency");
  if (receipt.weightTenths !== null) nonnegativeInteger(receipt.weightTenths, "ItemizedReceipt.weightTenths");
  for (const field of [
    "pricePerLbCents", "weightChargeCents", "minimumCents", "minimumAdjustmentCents",
    "baseChargeCents", "deliveryFeeCents", "discountCents", "taxCents", "tipCents",
    "totalCents", "amountCapturedCents", "refundedCents", "netPaidCents",
  ]) nonnegativeInteger(receipt[field], `ItemizedReceipt.${field}`);
  string(receipt.pricingVersion, "ItemizedReceipt.pricingVersion");
  string(receipt.taxRuleVersion, "ItemizedReceipt.taxRuleVersion");
  return receipt;
}

function assertPortalClaim(value) {
  const claim = object(value, "PortalClaimSummary");
  string(claim.claimId, "PortalClaimSummary.claimId");
  string(claim.claimType, "PortalClaimSummary.claimType");
  oneOf(claim.status, ["open", "investigating", "approved", "denied", "resolved", "withdrawn"], "PortalClaimSummary.status");
  nullableMoney(claim.requestedAmountCents, "PortalClaimSummary.requestedAmountCents");
  nullableMoney(claim.approvedAmountCents, "PortalClaimSummary.approvedAmountCents");
  timestamp(claim.openedAt, "PortalClaimSummary.openedAt");
  nullableTimestamp(claim.resolvedAt, "PortalClaimSummary.resolvedAt");
  return claim;
}

function assertPortalPreferences(value) {
  const preferences = object(value, "PortalPreferences");
  string(preferences.sourceOrderNumber, "PortalPreferences.sourceOrderNumber");
  string(preferences.detergent, "PortalPreferences.detergent");
  string(preferences.softenerPref, "PortalPreferences.softenerPref");
  optionalString(preferences.specialInstructions, "PortalPreferences.specialInstructions");
  boolean(preferences.canUpdate, "PortalPreferences.canUpdate");
  positiveInteger(preferences.orderVersion, "PortalPreferences.orderVersion");
  return preferences;
}

export function assertPaymentSession(value) {
  const result = object(value, "PaymentRecovery");
  paymentStatus(result.paymentStatus, "PaymentRecovery.paymentStatus");
  if (result.provider === "square") {
    oneOf(result.provider, ["square"], "PaymentRecovery.provider");
  } else {
    string(result.setupIntentId, "PaymentRecovery.setupIntentId");
    string(result.setupIntentClientSecret, "PaymentRecovery.setupIntentClientSecret");
  }
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
  optionalString(route.expectedReturnAt, "PublicRouteOption.expectedReturnAt");
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

function exactFields(value, allowed, label) {
  const unexpected = Object.keys(value).filter((field) => !allowed.includes(field));
  if (unexpected.length) throw new TypeError(`${label} contains an unexpected field: ${unexpected.join(", ")}.`);
  return value;
}

function string(value, label) {
  if (typeof value !== "string" || !value) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function timestamp(value, label) {
  string(value, label);
  if (!value.endsWith("Z") || Number.isNaN(Date.parse(value))) throw new TypeError(`${label} must be a UTC timestamp.`);
  return value;
}

function nullableTimestamp(value, label) {
  if (value === null) return null;
  return timestamp(value, label);
}

function nullableMoney(value, label) {
  if (value === null) return null;
  return nonnegativeInteger(value, label);
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

function signedInteger(value, label) {
  if (!Number.isSafeInteger(value)) throw new TypeError(`${label} must be an integer.`);
  return value;
}
