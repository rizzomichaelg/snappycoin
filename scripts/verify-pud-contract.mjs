import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PUD_PUBLIC_REQUEST_CONTRACTS,
  assertActionCapability,
  assertClaimEvidenceAsset,
  assertClaimEvidenceCapability,
  assertClaimEvidenceGrant,
  assertClaimResult,
  assertFeedbackResult,
  assertLoyaltySummary,
  assertOrderStatus,
  assertPaymentSession,
  assertPhoneResend,
  assertPhoneStart,
  assertPhoneVerify,
  assertPortalHistory,
  assertPreferencesUpdate,
  assertPublicConfig,
  assertRecurringResult,
  assertReorderBootstrap,
  assertStatusSession,
  assertStatusRecoveryStart,
  assertStatusRecoveryVerify,
  assertStatusTokenRevocation,
  assertStatusTokenRotation,
  assertTipResult,
  contractBody,
} from "../assets/js/pud-contract.js";

const openApiPath = process.env.PUD_OPENAPI || resolve(new URL("../../docs/pud-openapi.yaml", import.meta.url).pathname);
let openApi;
try {
  openApi = await readFile(openApiPath, "utf8");
} catch (error) {
  if (error?.code === "ENOENT") throw new Error(`OpenAPI contract not found at ${openApiPath}; set PUD_OPENAPI to its path.`);
  throw error;
}

const apiSource = await readFile(new URL("../assets/js/pud-api.js", import.meta.url), "utf8");
if (!apiSource.includes("contractBody(path, input)")) throw new Error("PUD API requests must pass through contractBody.");

const requestBodies = parseRequestBodies(openApi);
const pathOperations = parsePathOperations(openApi);
const rawSchemas = parseSchemas(openApi);
const resolvedSchemas = new Map();

for (const [path, browserContract] of Object.entries(PUD_PUBLIC_REQUEST_CONTRACTS)) {
  const operation = pathOperations.get(path);
  if (!operation || operation.method !== "post") throw new Error(`OpenAPI is missing POST ${path}.`);
  const schemaName = requestBodies.get(operation.requestBody);
  if (!schemaName) throw new Error(`OpenAPI request body ${operation.requestBody || "<missing>"} for ${path} has no schema.`);
  if (schemaName !== browserContract.schema) {
    throw new Error(`${path} uses ${schemaName} in OpenAPI but ${browserContract.schema} in the browser.`);
  }

  const openApiSchema = resolveSchema(schemaName, rawSchemas, resolvedSchemas, []);
  assertSameSet(`${schemaName} required fields`, browserContract.required, openApiSchema.required);
  assertSameSet(`${schemaName} allowed fields`, browserContract.allowed, openApiSchema.allowed);
  if (operation.idempotencyRequired && !browserContract.idempotent) {
    throw new Error(`${path} requires idempotency in OpenAPI but is not marked idempotent in the browser contract.`);
  }
  const dynamicRecurringAction = /^\/api\/pud\/recurring\/(pause|skip|resume)$/.test(path) && apiSource.includes("`/api/pud/recurring/${action}`");
  if (!dynamicRecurringAction && !apiSource.includes(`"${path}"`)) throw new Error(`pud-api.js does not expose ${path}.`);

  const sample = Object.fromEntries(browserContract.required.map((field) => [field, sampleValue(field)]));
  const built = contractBody(path, { ...sample, __unknown: "must be stripped" });
  if (Object.hasOwn(built, "__unknown")) throw new Error(`${schemaName} did not strip an unknown field.`);
  const missing = { ...sample };
  delete missing[browserContract.required[0]];
  try {
    contractBody(path, missing);
    throw new Error(`${schemaName} accepted a missing required field.`);
  } catch (error) {
    if (!String(error?.message).includes("is missing")) throw error;
  }
}

const evidenceUploadOperation = pathOperations.get("/api/pud/orders/claim-evidence/upload");
if (!evidenceUploadOperation || evidenceUploadOperation.method !== "post" ||
    !apiSource.includes('requestRaw("/api/pud/orders/claim-evidence/upload"')) {
  throw new Error("The raw claim-evidence upload path is missing from OpenAPI or pud-api.js.");
}

const responseContracts = {
  PublicRouteOption: {
    required: ["routeId", "routeDate", "windowCode", "windowStartAt", "windowEndAt", "remainingOrders", "remainingBags", "routeProof"],
    allowed: ["routeId", "routeDate", "windowCode", "windowStartAt", "windowEndAt", "expectedReturnAt", "remainingOrders", "remainingBags", "routeProof"],
  },
  PublicRecurringProposal: {
    required: ["proposalId", "status", "proposedForAt", "expiresAt"],
    allowed: ["proposalId", "status", "proposedForAt", "expiresAt", "routeId", "blockedReason"],
  },
  PublicRecurringSchedule: {
    required: ["scheduleId", "cadence", "status", "nextProposalAt", "version", "proposals"],
    allowed: ["scheduleId", "cadence", "status", "nextProposalAt", "version", "proposals"],
  },
  RecurringDefaults: {
    required: ["preferredBags", "detergent", "softenerPref", "preferredRouteRule"],
    allowed: ["preferredBags", "detergent", "softenerPref", "preferredRouteRule"],
  },
  SafeOrderStatus: {
    required: [
      "orderNumber", "version", "fulfillmentStatus", "paymentStatus", "pickupWindowStartAt", "pickupWindowEndAt",
      "deliveryWindowStartAt", "deliveryWindowEndAt", "expectedCompletionAt", "milestones", "estimatedBags", "totalCents", "refundedCents", "receipt",
      "paymentAttentionRequired", "paymentMethod", "paymentAmountCents", "operationalAttentionRequired", "addressReviewRequired", "canCancel", "canTip", "canClaim",
      "canCreateRecurring", "canSubmitFeedback", "feedbackSubmitted", "locale", "timezone", "currency",
      "recurringDefaults", "rescheduleOptions", "recurringSchedules", "updatedAt",
    ],
    allowed: [
      "orderNumber", "version", "fulfillmentStatus", "paymentStatus", "pickupWindowCode", "pickupWindowStartAt", "pickupWindowEndAt",
      "deliveryWindowStartAt", "deliveryWindowEndAt", "deliveryPromisedAt", "expectedCompletionAt", "milestones",
      "estimatedBags", "actualBags", "weightTenths", "totalCents", "refundedCents", "receipt", "paymentAttentionRequired", "paymentMethod", "paymentAmountCents",
      "operationalAttentionRequired", "addressReviewRequired", "canCancel", "canTip", "canClaim", "canCreateRecurring",
      "canSubmitFeedback", "feedbackSubmitted", "locale", "timezone", "currency",
      "recurringDefaults", "rescheduleOptions", "recurringSchedules", "updatedAt",
    ],
  },
  ItemizedReceipt: {
    required: [
      "currency", "weightTenths", "pricePerLbCents", "weightChargeCents", "minimumCents",
      "minimumAdjustmentCents", "baseChargeCents", "deliveryFeeCents", "discountCents", "taxCents",
      "tipCents", "totalCents", "amountCapturedCents", "refundedCents", "netPaidCents",
      "pricingVersion", "taxRuleVersion",
    ],
    allowed: [
      "currency", "weightTenths", "pricePerLbCents", "weightChargeCents", "minimumCents",
      "minimumAdjustmentCents", "baseChargeCents", "deliveryFeeCents", "discountCents", "taxCents",
      "tipCents", "totalCents", "amountCapturedCents", "refundedCents", "netPaidCents",
      "pricingVersion", "taxRuleVersion",
    ],
  },
  StatusSessionData: {
    required: ["statusSession", "expiresAt", "phoneVerifiedAt", "orderVersion"],
    allowed: ["statusSession", "expiresAt", "phoneVerifiedAt", "orderVersion"],
  },
  ActionCapabilityData: {
    required: ["actionCapability", "purpose", "expiresAt", "orderVersion"],
    allowed: ["actionCapability", "purpose", "expiresAt", "orderVersion"],
  },
  ClaimEvidenceCapabilityData: {
    required: ["actionCapability", "purpose", "expiresAt", "orderVersion"],
    allowed: ["actionCapability", "purpose", "expiresAt", "orderVersion"],
  },
  ClaimEvidenceGrantData: {
    required: ["uploadGrant", "expiresAt", "maxBytes", "acceptedMimeTypes"],
    allowed: ["uploadGrant", "expiresAt", "maxBytes", "acceptedMimeTypes"],
  },
  ClaimEvidenceUploadData: {
    required: ["assetId", "sha256", "mimeType", "byteSize", "retentionUntil"],
    allowed: ["assetId", "sha256", "mimeType", "byteSize", "retentionUntil"],
  },
  LoyaltyHistoryItem: {
    required: ["transactionId", "type", "amountCents", "balanceAfterCents", "orderNumber", "expiresAt", "createdAt"],
    allowed: ["transactionId", "type", "amountCents", "balanceAfterCents", "orderNumber", "expiresAt", "createdAt"],
  },
  LoyaltyCustomerData: {
    required: ["currency", "balanceCents", "status", "history"],
    allowed: ["currency", "balanceCents", "status", "history"],
  },
  PhoneStartData: {
    required: ["verificationId", "phoneLast4", "expiresAt"],
    allowed: ["verificationId", "phoneLast4", "expiresAt"],
  },
  PhoneResendData: {
    required: ["expiresAt"],
    allowed: ["expiresAt"],
  },
  PhoneVerifyData: {
    required: ["phoneProof", "expiresAt"],
    allowed: ["phoneProof", "expiresAt"],
  },
  StatusRecoveryStartData: {
    required: ["accepted", "recoveryId", "phoneLast4", "expiresAt", "message"],
    allowed: ["accepted", "recoveryId", "phoneLast4", "expiresAt", "message"],
  },
  StatusRecoveryVerifyData: {
    required: ["accepted", "verified", "complete", "message"],
    allowed: ["accepted", "verified", "complete", "message"],
  },
  PortalClaimSummary: {
    required: ["claimId", "claimType", "status", "requestedAmountCents", "approvedAmountCents", "openedAt", "resolvedAt"],
    allowed: ["claimId", "claimType", "status", "requestedAmountCents", "approvedAmountCents", "openedAt", "resolvedAt"],
  },
  PortalHistoryOrder: {
    required: ["orderNumber", "serviceMode", "fulfillmentStatus", "paymentStatus", "createdAt", "deliveredAt", "updatedAt", "receipt", "claims"],
    allowed: ["orderNumber", "serviceMode", "fulfillmentStatus", "paymentStatus", "createdAt", "deliveredAt", "updatedAt", "receipt", "claims"],
  },
  PortalPreferences: {
    required: ["sourceOrderNumber", "detergent", "softenerPref", "canUpdate", "orderVersion"],
    allowed: ["sourceOrderNumber", "detergent", "softenerPref", "specialInstructions", "canUpdate", "orderVersion"],
  },
  PortalHistoryData: {
    required: ["anchorOrderNumber", "orders", "hasMore", "preferences"],
    allowed: ["anchorOrderNumber", "orders", "hasMore", "nextCursor", "preferences"],
  },
  PreferencesUpdateData: {
    required: ["preferences", "status", "duplicate"],
    allowed: ["preferences", "status", "duplicate"],
  },
  PaymentRecoveryData: {
    required: ["paymentStatus", "duplicate"],
    allowed: ["paymentStatus", "provider", "setupIntentId", "setupIntentClientSecret", "duplicate"],
  },
  TipData: {
    required: ["paymentIntentId", "status", "clientSecret"],
    allowed: ["paymentIntentId", "status", "clientSecret"],
  },
  ReorderBootstrapData: {
    required: [
      "priorOrderNumber", "customer", "address", "preferences", "savedPaymentMethodAvailable", "bookingBlocked",
      "nextStep", "requiresPhoneVerification", "requiresPaymentSetup",
    ],
    allowed: [
      "priorOrderNumber", "customer", "address", "preferences", "savedPaymentMethodAvailable", "bookingBlocked",
      "nextStep", "requiresPhoneVerification", "requiresPaymentSetup", "recurringProposalId",
    ],
  },
  ClaimOpenData: {
    required: ["claimId", "claimType", "status", "requestedAmountCents", "openedAt", "version", "duplicate"],
    allowed: ["claimId", "claimType", "status", "requestedAmountCents", "openedAt", "version", "duplicate"],
  },
  StatusTokenRotationData: {
    required: ["statusToken", "status"],
    allowed: ["statusToken", "status"],
  },
  StatusTokenRevocationData: {
    required: ["revoked", "orderNumber", "version"],
    allowed: ["revoked", "orderNumber", "version"],
  },
};

for (const [schemaName, expected] of Object.entries(responseContracts)) {
  const schema = resolveSchema(schemaName, rawSchemas, resolvedSchemas, []);
  assertSameSet(`${schemaName} required fields`, expected.required, schema.required);
  assertSameSet(`${schemaName} allowed fields`, expected.allowed, schema.allowed);
}

verifyResponseGuards();

const frontendOnlyEndpoints = Object.keys(PUD_PUBLIC_REQUEST_CONTRACTS);
console.log(`PUD contract verification passed (${frontendOnlyEndpoints.length} request and ${Object.keys(responseContracts).length} response schemas matched OpenAPI; runtime guards exercised).`);

function verifyResponseGuards() {
  const route = {
    routeId: "route_1",
    routeDate: "2026-07-15",
    windowCode: "AM",
    windowStartAt: "2026-07-15T14:00:00Z",
    windowEndAt: "2026-07-15T17:00:00Z",
    expectedReturnAt: "2026-07-16T22:00:00Z",
    remainingOrders: 4,
    remainingBags: 8,
    routeProof: "route-proof",
  };
  const recurringDefaults = {
    preferredBags: 2,
    detergent: "free_clear",
    softenerPref: "none",
    preferredRouteRule: { weekday: "wednesday" },
  };
  const status = {
    orderNumber: "PUD-1001",
    version: 3,
    fulfillmentStatus: "delivered",
    paymentStatus: "succeeded",
    pickupWindowStartAt: "2026-07-14T14:00:00Z",
    pickupWindowEndAt: "2026-07-14T15:00:00Z",
    deliveryWindowStartAt: "2026-07-15T16:00:00Z",
    deliveryWindowEndAt: "2026-07-15T17:00:00Z",
    expectedCompletionAt: "2026-07-15T18:00:00Z",
    milestones: {
      submittedAt: "2026-07-13T18:00:00Z",
      confirmedAt: "2026-07-13T18:05:00Z",
      pickedUpAt: "2026-07-14T14:00:00Z",
      weighedAt: "2026-07-14T16:00:00Z",
      readyAt: "2026-07-15T14:00:00Z",
      outForDeliveryAt: "2026-07-15T16:00:00Z",
      deliveredAt: "2026-07-15T17:00:00Z",
    },
    estimatedBags: 2,
    totalCents: 4200,
    refundedCents: 0,
    receipt: {
      currency: "usd",
      weightTenths: 200,
      pricePerLbCents: 199,
      weightChargeCents: 3980,
      minimumCents: 2500,
      minimumAdjustmentCents: 0,
      baseChargeCents: 3980,
      deliveryFeeCents: 300,
      discountCents: 100,
      taxCents: 20,
      tipCents: 0,
      totalCents: 4200,
      amountCapturedCents: 4200,
      refundedCents: 0,
      netPaidCents: 4200,
      pricingVersion: "2026-07",
      taxRuleVersion: "2026-07",
    },
    paymentAttentionRequired: false,
    paymentMethod: { brand: "VISA", last4: "1111" },
    paymentAmountCents: 4200,
    operationalAttentionRequired: false,
    addressReviewRequired: false,
    canCancel: false,
    canTip: true,
    canClaim: true,
    canCreateRecurring: true,
    canSubmitFeedback: true,
    feedbackSubmitted: false,
    locale: "en-US",
    timezone: "America/Chicago",
    currency: "USD",
    recurringDefaults,
    rescheduleOptions: [route],
    recurringSchedules: [{
      scheduleId: "schedule_1",
      cadence: "weekly",
      status: "active",
      nextProposalAt: "2026-07-22T14:00:00Z",
      version: 2,
      proposals: [{
        proposalId: "proposal_1",
        status: "proposed",
        proposedForAt: "2026-07-22T14:00:00Z",
        expiresAt: "2026-07-20T14:00:00Z",
        routeId: "route_1",
      }],
    }],
    updatedAt: "2026-07-13T18:00:00Z",
  };
  const publicConfig = {
    publicEnabled: true,
    addressAutocompleteEnabled: true,
    productAnalyticsEnabled: true,
    productExperimentEnabled: false,
    bookingEnabled: true,
    statusRecoveryEnabled: true,
    feedbackEnabled: true,
    recurringEnabled: true,
    tipsEnabled: true,
    promotionsEnabled: true,
    referralsEnabled: true,
    claimsEnabled: true,
    loyaltyEnabled: true,
    claimEvidenceEnabled: true,
    supportedLocales: ["en-US", "es-US"],
    defaultLocale: "en-US",
    currency: "USD",
    support: { email: "support@example.com", phone: "+13146281001" },
    stripePublishableKey: "pk_test_from_server",
    squareApplicationId: "sandbox-square-app",
    squareLocationId: "sandbox-location",
    squareEnvironment: "sandbox",
    turnstileSiteKey: "turnstile-from-server",
    timezone: "America/Chicago",
    pricing: { pricePerLbCents: 199, minimumCents: 2500, deliveryFeeCents: 0, version: "2026-07" },
    scheduling: { pickupLeadTimeHours: 3, sameDayBookingCutoff: "14:00", latestPickupSlotStart: "17:00", pickupSlotDurationMinutes: 60, minimumDeliveryDelayHours: 24 },
    consentVersions: { privacy: "2026-07" },
  };
  const payment = {
    paymentStatus: "requires_action",
    setupIntentId: "seti_1",
    setupIntentClientSecret: "seti_1_secret_memory_only",
    duplicate: false,
  };
  const reorder = {
    priorOrderNumber: "PUD-1001",
    customer: { firstName: "Sam", lastName: "Customer", phoneLast4: "1212" },
    address: { line1: "1 Main St", city: "Chicago", state: "IL", postalCode: "60601" },
    preferences: {
      estimatedBags: 2,
      detergent: "free_clear",
      softenerPref: "none",
      unattendedPickup: false,
      unattendedDelivery: false,
    },
    savedPaymentMethodAvailable: true,
    bookingBlocked: false,
    nextStep: "address_check",
    requiresPhoneVerification: true,
    requiresPaymentSetup: true,
    recurringProposalId: "proposal_1",
  };
  const tip = { paymentIntentId: "pi_tip_1", status: "requires_action", clientSecret: "pi_tip_1_secret_memory_only" };
  const recurring = {
    scheduleId: "schedule_1",
    cadence: "weekly",
    status: "active",
    nextProposalAt: null,
    version: 2,
    action: "skip",
    proposal: { proposalId: "proposal_1", status: "skipped", proposedForAt: "2026-07-22T14:00:00Z" },
  };
  const statusSession = {
    statusSession: "status-session-memory-only",
    expiresAt: "2026-07-13T18:15:00Z",
    phoneVerifiedAt: "2026-07-13T18:00:00Z",
    orderVersion: 3,
  };
  const actionCapability = {
    actionCapability: "action-capability-once",
    purpose: "cancel_order",
    expiresAt: "2026-07-13T18:10:00Z",
    orderVersion: 3,
  };
  const claimEvidenceCapability = {
    actionCapability: "evidence-action-capability-once",
    purpose: "upload_claim_evidence",
    expiresAt: "2026-07-13T18:10:00Z",
    orderVersion: 3,
  };
  const claimEvidenceGrant = {
    uploadGrant: "evidence-upload-grant-once",
    expiresAt: "2026-07-13T18:10:00Z",
    maxBytes: 5 * 1024 * 1024,
    acceptedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
  };
  const claimEvidenceAsset = {
    assetId: "claim_evidence_asset_1",
    sha256: "a".repeat(64),
    mimeType: "image/png",
    byteSize: 2048,
    retentionUntil: "2027-07-13T18:00:00Z",
  };
  const loyalty = {
    currency: "USD",
    balanceCents: 750,
    status: "active",
    history: [{
      transactionId: "loyalty_tx_1",
      type: "earn",
      amountCents: 250,
      balanceAfterCents: 750,
      orderNumber: "PUD-1001",
      expiresAt: "2027-07-13T18:00:00Z",
      createdAt: "2026-07-13T18:00:00Z",
    }],
  };
  const claim = {
    claimId: "claim_1",
    claimType: "billing",
    status: "open",
    requestedAmountCents: null,
    openedAt: "2026-07-13T18:00:00Z",
    version: 1,
    duplicate: false,
  };
  const rotation = { statusToken: "replacement-status-token", status };
  const revocation = { revoked: true, orderNumber: "PUD-1001", version: 4 };
  const phoneStart = {
    verificationId: "verification_1",
    phoneLast4: "1212",
    expiresAt: "2026-07-13T18:10:00Z",
  };
  const phoneResend = { expiresAt: "2026-07-13T18:12:00Z" };
  const phoneVerify = {
    phoneProof: "phone-proof-memory-only",
    expiresAt: "2026-07-13T18:10:00Z",
  };
  const statusRecoveryStart = {
    accepted: true,
    recoveryId: "recovery_1",
    phoneLast4: "1212",
    expiresAt: "2026-07-13T18:10:00Z",
    message: "If those details match an order, use the verification code sent to that phone.",
  };
  const statusRecoveryVerify = {
    accepted: true,
    verified: true,
    complete: true,
    message: "If those details matched an order, a fresh private status link has been sent by email and text.",
  };
  const portalPreferences = {
    sourceOrderNumber: "PUD-1001",
    detergent: "free_clear",
    softenerPref: "none",
    specialInstructions: "Use fragrance-free products.",
    canUpdate: true,
    orderVersion: 3,
  };
  const portalClaim = {
    claimId: "claim_1",
    claimType: "billing",
    status: "open",
    requestedAmountCents: null,
    approvedAmountCents: null,
    openedAt: "2026-07-13T18:00:00Z",
    resolvedAt: null,
  };
  const portalHistory = {
    anchorOrderNumber: "PUD-1001",
    orders: [{
      orderNumber: "PUD-1001",
      serviceMode: "pickup_delivery",
      fulfillmentStatus: "delivered",
      paymentStatus: "succeeded",
      createdAt: "2026-07-10T14:00:00Z",
      deliveredAt: "2026-07-13T17:00:00Z",
      updatedAt: "2026-07-13T18:00:00Z",
      receipt: status.receipt,
      claims: [portalClaim],
    }],
    hasMore: true,
    nextCursor: "encrypted-customer-bound-cursor",
    preferences: portalPreferences,
  };
  const preferencesUpdate = { preferences: portalPreferences, status, duplicate: false };
  const feedback = {
    feedbackId: "feedback_1",
    satisfaction: "satisfied",
    submittedAt: "2026-07-13T18:00:00Z",
    duplicate: false,
    supportRequested: false,
    googleReviewUrl: "https://g.page/r/example/review",
  };

  for (const [label, guard, value] of [
    ["public config", assertPublicConfig, publicConfig],
    ["safe order status", assertOrderStatus, status],
    ["feedback", assertFeedbackResult, feedback],
    ["payment recovery", assertPaymentSession, payment],
    ["reorder bootstrap", assertReorderBootstrap, reorder],
    ["tip", assertTipResult, tip],
    ["recurring", assertRecurringResult, recurring],
    ["status session", assertStatusSession, statusSession],
    ["action capability", assertActionCapability, actionCapability],
    ["claim-evidence capability", assertClaimEvidenceCapability, claimEvidenceCapability],
    ["claim-evidence grant", assertClaimEvidenceGrant, claimEvidenceGrant],
    ["claim-evidence asset", assertClaimEvidenceAsset, claimEvidenceAsset],
    ["loyalty", assertLoyaltySummary, loyalty],
    ["claim", assertClaimResult, claim],
    ["status-token rotation", assertStatusTokenRotation, rotation],
    ["status-token revocation", assertStatusTokenRevocation, revocation],
    ["phone start", assertPhoneStart, phoneStart],
    ["phone resend", assertPhoneResend, phoneResend],
    ["phone verify", assertPhoneVerify, phoneVerify],
    ["status recovery start", assertStatusRecoveryStart, statusRecoveryStart],
    ["status recovery verify", assertStatusRecoveryVerify, statusRecoveryVerify],
    ["portal history", assertPortalHistory, portalHistory],
    ["preference update", assertPreferencesUpdate, preferencesUpdate],
  ]) {
    if (guard(value) !== value) throw new Error(`${label} guard did not return its validated object.`);
  }

  expectGuardFailure("public config feature flags", () => assertPublicConfig({ ...publicConfig, referralsEnabled: undefined }));
  expectGuardFailure("public config address autocomplete flag", () => assertPublicConfig({ ...publicConfig, addressAutocompleteEnabled: undefined }));
  expectGuardFailure("public config promotions flag", () => assertPublicConfig({ ...publicConfig, promotionsEnabled: undefined }));
  expectGuardFailure("public config analytics flag", () => assertPublicConfig({ ...publicConfig, productAnalyticsEnabled: undefined }));
  expectGuardFailure("public config experiment flag", () => assertPublicConfig({ ...publicConfig, productExperimentEnabled: undefined }));
  expectGuardFailure("route proofs", () => assertOrderStatus({ ...status, rescheduleOptions: [{ ...route, routeProof: "" }] }));
  expectGuardFailure("feedback URL", () => assertFeedbackResult({ ...feedback, googleReviewUrl: "javascript:alert(1)" }));
  expectGuardFailure("private status fields", () => assertOrderStatus({ ...status, phoneCiphertext: "must-not-leak" }));
  expectGuardFailure("recurring defaults", () => assertOrderStatus({ ...status, recurringDefaults: null }));
  expectGuardFailure("payment client secret", () => assertPaymentSession({ ...payment, setupIntentClientSecret: undefined }));
  expectGuardFailure("reorder proof chain", () => assertReorderBootstrap({ ...reorder, requiresPhoneVerification: false }));
  expectGuardFailure("tip client secret shape", () => assertTipResult({ ...tip, clientSecret: undefined }));
  expectGuardFailure("recurring next proposal", () => assertRecurringResult({ ...recurring, nextProposalAt: undefined }));
  expectGuardFailure("receipt total", () => assertOrderStatus({ ...status, receipt: { ...status.receipt, totalCents: -1 } }));
  expectGuardFailure("expired-session timestamp shape", () => assertStatusSession({ ...statusSession, expiresAt: "not-a-date" }));
  expectGuardFailure("action purpose", () => assertActionCapability({ ...actionCapability, purpose: "read_everything" }));
  expectGuardFailure("claim-evidence purpose", () => assertClaimEvidenceCapability({ ...claimEvidenceCapability, purpose: "open_claim" }));
  expectGuardFailure("claim-evidence MIME", () => assertClaimEvidenceGrant({ ...claimEvidenceGrant, acceptedMimeTypes: ["text/html"] }));
  expectGuardFailure("claim-evidence digest", () => assertClaimEvidenceAsset({ ...claimEvidenceAsset, sha256: "BAD" }));
  expectGuardFailure("loyalty balance", () => assertLoyaltySummary({ ...loyalty, balanceCents: -1 }));
  expectGuardFailure("claim status", () => assertClaimResult({ ...claim, status: "secret_internal_state" }));
  expectGuardFailure("revocation flag", () => assertStatusTokenRevocation({ ...revocation, revoked: false }));
  expectGuardFailure("status-recovery start match disclosure", () => assertStatusRecoveryStart({ ...statusRecoveryStart, matched: true }));
  expectGuardFailure("status-recovery verify token disclosure", () => assertStatusRecoveryVerify({ ...statusRecoveryVerify, statusToken: "must-not-leak" }));
  expectGuardFailure("phone start last four", () => assertPhoneStart({ ...phoneStart, phoneLast4: "12" }));
  expectGuardFailure("phone verify proof", () => assertPhoneVerify({ ...phoneVerify, phoneProof: "" }));
  expectGuardFailure("history cursor requirement", () => assertPortalHistory({ ...portalHistory, nextCursor: undefined }));
  expectGuardFailure("final history cursor", () => assertPortalHistory({ ...portalHistory, hasMore: false }));
  expectGuardFailure("portal claim status", () => assertPortalHistory({
    ...portalHistory,
    orders: [{ ...portalHistory.orders[0], claims: [{ ...portalClaim, status: "internal_only" }] }],
  }));
  expectGuardFailure("preference update duplicate", () => assertPreferencesUpdate({ ...preferencesUpdate, duplicate: "false" }));
}

function expectGuardFailure(label, callback) {
  try {
    callback();
  } catch (_error) {
    return;
  }
  throw new Error(`Response guard accepted invalid ${label}.`);
}

function parseRequestBodies(source) {
  const result = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^    ([A-Za-z0-9]+): .*#\/components\/schemas\/([A-Za-z0-9]+)"/);
    if (match) result.set(match[1], match[2]);
  }
  return result;
}

function parsePathOperations(source) {
  const lines = source.split(/\r?\n/);
  const result = new Map();
  let path = "";
  let method = "";
  let requestBody = "";
  let idempotencyRequired = false;

  const flush = () => {
    if (path && method) result.set(path, { method, requestBody, idempotencyRequired });
  };

  for (const line of lines) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/);
    if (pathMatch) {
      flush();
      path = pathMatch[1];
      method = "";
      requestBody = "";
      idempotencyRequired = false;
      continue;
    }
    const methodMatch = line.match(/^    (get|post|patch|delete):\s*$/);
    if (path && methodMatch) method = methodMatch[1];
    if (path && method) {
      const bodyMatch = line.match(/requestBodies\/([A-Za-z0-9]+)/);
      if (bodyMatch) requestBody = bodyMatch[1];
      if (/^      x-idempotency:\s*required\b/.test(line)) idempotencyRequired = true;
    }
    if (/^components:\s*$/.test(line)) break;
  }
  flush();
  return result;
}

function parseSchemas(source) {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === "  schemas:");
  if (start < 0) throw new Error("OpenAPI components.schemas was not found.");
  const result = new Map();
  let name = "";
  let block = [];
  const flush = () => {
    if (name) result.set(name, parseSchemaBlock(block));
  };

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^  \S/.test(line)) break;
    const header = line.match(/^    ([A-Za-z0-9]+):(?:\s.*)?$/);
    if (header) {
      flush();
      name = header[1];
      block = [line];
    } else if (name) {
      block.push(line);
    }
  }
  flush();
  return result;
}

function parseSchemaBlock(lines) {
  const propertyMarkers = lines
    .map((line, index) => ({
      index,
      indent: indent(line),
      block: /^\s+properties:\s*$/.test(line),
      inline: /\bproperties:\s*\{/.test(line),
      line,
    }))
    .filter((entry) => entry.block || entry.inline);
  const allowed = [];
  if (propertyMarkers.length) {
    const topIndent = Math.min(...propertyMarkers.map((entry) => entry.indent));
    for (const marker of propertyMarkers.filter((entry) => entry.indent === topIndent)) {
      if (marker.inline) {
        allowed.push(...inlineObjectKeys(marker.line, "properties:"));
        continue;
      }
      for (let index = marker.index + 1; index < lines.length; index += 1) {
        const line = lines[index];
        if (!line.trim()) continue;
        const lineIndent = indent(line);
        if (lineIndent <= marker.indent) break;
        if (lineIndent !== marker.indent + 2) continue;
        const property = line.trim().match(/^([A-Za-z0-9_]+):/);
        if (property) allowed.push(property[1]);
      }
    }
  }

  const requiredEntries = lines
    .map((line) => ({ line, indent: indent(line) }))
    .filter((entry) => /\brequired:\s*\[/.test(entry.line));
  const required = [];
  if (requiredEntries.length) {
    const topIndent = Math.min(...requiredEntries.map((entry) => entry.indent));
    for (const entry of requiredEntries.filter((item) => item.indent === topIndent)) {
      const values = entry.line.match(/required:\s*\[([^\]]*)\]/)?.[1] || "";
      required.push(...values.split(",").map((value) => value.trim()).filter(Boolean));
    }
  }

  const inherits = [];
  for (const line of lines) {
    if (!/^\s*(?:allOf:.*)?-?\s*\{?\s*\$ref:/.test(line.trimStart()) && !/allOf:\s*\[\s*\{\s*\$ref:/.test(line)) continue;
    const match = line.match(/#\/components\/schemas\/([A-Za-z0-9]+)/);
    if (match) inherits.push(match[1]);
  }
  return { allowed: unique(allowed), required: unique(required), inherits: unique(inherits) };
}

function resolveSchema(name, schemas, cache, stack) {
  if (cache.has(name)) return cache.get(name);
  if (stack.includes(name)) throw new Error(`Circular OpenAPI schema inheritance: ${[...stack, name].join(" -> ")}.`);
  const schema = schemas.get(name);
  if (!schema) throw new Error(`OpenAPI schema ${name} was not parsed.`);
  const inherited = schema.inherits.map((parent) => resolveSchema(parent, schemas, cache, [...stack, name]));
  const resolved = {
    allowed: unique([...inherited.flatMap((item) => item.allowed), ...schema.allowed]),
    required: unique([...inherited.flatMap((item) => item.required), ...schema.required]),
  };
  cache.set(name, resolved);
  return resolved;
}

function sampleValue(field) {
  if (/^(expectedVersion|amountCents|preferredBags|estimatedBags)$/.test(field)) return 1;
  if (/Consent$/.test(field)) return false;
  if (/^(address|preferences|consents|preferredRouteRule|consentVersions)$/.test(field)) return {};
  return `${field}-sample-value`;
}

function assertSameSet(label, actual, expected) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} mismatch. Browser=[${left.join(", ")}] OpenAPI=[${right.join(", ")}].`);
  }
}

function indent(line) { return line.length - line.trimStart().length; }
function unique(values) { return [...new Set(values)]; }

function inlineObjectKeys(line, marker) {
  const markerIndex = line.indexOf(marker);
  const start = line.indexOf("{", markerIndex + marker.length);
  if (markerIndex < 0 || start < 0) return [];
  const keys = [];
  let depth = 0;
  let quote = "";
  let escaped = false;
  let expectingKey = false;
  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === "{") {
      depth += 1;
      if (depth === 1) expectingKey = true;
      continue;
    }
    if (character === "}") { depth -= 1; continue; }
    if (depth !== 1) continue;
    if (character === ",") { expectingKey = true; continue; }
    if (!expectingKey || !/[A-Za-z0-9_]/.test(character)) continue;
    const rest = line.slice(index);
    const match = rest.match(/^([A-Za-z0-9_]+)\s*:/);
    if (match) {
      keys.push(match[1]);
      index += match[0].length - 1;
      expectingKey = false;
    }
  }
  return keys;
}
