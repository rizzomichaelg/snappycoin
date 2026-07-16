import { apiUrl } from "./pud-config.js";
import { translateExternalText } from "./site-i18n.js";
import {
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
} from "./pud-contract.js";

export class PudApiError extends Error {
  constructor(status, payload, requestId) {
    const error = payload?.error;
    super(translateExternalText(error?.message || payload?.message || "We could not complete that request."));
    this.name = "PudApiError";
    this.status = status;
    this.code = error?.code || payload?.error || "PUD_REQUEST_FAILED";
    this.retryable = Boolean(error?.retryable);
    this.fieldErrors = error?.fieldErrors || {};
    this.requestId = requestId || payload?.requestId || "";
    this.payload = payload;
  }
}

export function randomIdempotencyKey(prefix = "pud") {
  let id = globalThis.crypto?.randomUUID?.();
  if (!id && globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    id = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  if (!id) throw new Error("Secure retry protection is unavailable in this browser.");
  return `${prefix}:${id}`;
}

export async function requestJson(path, {
  method = "GET",
  body,
  signal,
  idempotencyKey,
  timeoutMs = 20_000,
} = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const controller = new AbortController();
  let timedOut = false;
  const deadlineMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.min(Math.trunc(timeoutMs), 60_000)
    : 20_000;
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });
  const deadline = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, deadlineMs);

  try {
    const response = await fetch(apiUrl(path), {
      method,
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const requestId = response.headers.get("x-request-id") || "";
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        payload = { message: "The service returned an unreadable response." };
      }
    }
    if (!response.ok) throw new PudApiError(response.status, payload, requestId);
    if (payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, "data")) {
      if (payload.data && typeof payload.data === "object") return { ...payload.data, requestId: payload.requestId || requestId };
      return payload.data;
    }
    return payload;
  } catch (error) {
    if (error instanceof PudApiError) throw error;
    if (timedOut) {
      throw new PudApiError(0, {
        error: {
          code: "PUD_CLIENT_TIMEOUT",
          message: "The request timed out. Check the connection and try again.",
          retryable: true,
        },
      });
    }
    if (signal?.aborted) {
      throw new PudApiError(0, {
        error: {
          code: "PUD_CLIENT_ABORTED",
          message: "The request was canceled.",
          retryable: false,
        },
      });
    }
    throw new PudApiError(0, {
      error: {
        code: "PUD_CLIENT_NETWORK_ERROR",
        message: "The service could not be reached. Check the connection and try again.",
        retryable: true,
      },
    });
  } finally {
    globalThis.clearTimeout(deadline);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

export async function requestRaw(path, {
  body,
  contentType,
  headers: additionalHeaders = {},
  signal,
  timeoutMs = 60_000,
} = {}) {
  if (!(body instanceof ArrayBuffer) && !ArrayBuffer.isView(body) && !(body instanceof Blob)) {
    throw new TypeError("A binary request body is required.");
  }
  if (typeof contentType !== "string" || !contentType) throw new TypeError("A content type is required.");
  const headers = { Accept: "application/json", "Content-Type": contentType, ...additionalHeaders };
  const controller = new AbortController();
  let timedOut = false;
  const deadlineMs = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? Math.min(Math.trunc(timeoutMs), 60_000)
    : 60_000;
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });
  const deadline = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, deadlineMs);

  try {
    const response = await fetch(apiUrl(path), {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers,
      body,
      signal: controller.signal,
    });
    const requestId = response.headers.get("x-request-id") || "";
    const text = await response.text();
    let payload = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (_error) {
        payload = { message: "The service returned an unreadable response." };
      }
    }
    if (!response.ok) throw new PudApiError(response.status, payload, requestId);
    if (payload?.ok === true && Object.prototype.hasOwnProperty.call(payload, "data")) {
      if (payload.data && typeof payload.data === "object") return { ...payload.data, requestId: payload.requestId || requestId };
      return payload.data;
    }
    return payload;
  } catch (error) {
    if (error instanceof PudApiError) throw error;
    if (timedOut) {
      throw new PudApiError(0, {
        error: {
          code: "PUD_CLIENT_TIMEOUT",
          message: "The evidence upload timed out. The claim was not submitted; return to the status page before retrying.",
          retryable: false,
        },
      });
    }
    if (signal?.aborted) {
      throw new PudApiError(0, {
        error: { code: "PUD_CLIENT_ABORTED", message: "The evidence upload was canceled.", retryable: false },
      });
    }
    throw new PudApiError(0, {
      error: {
        code: "PUD_CLIENT_NETWORK_ERROR",
        message: "The evidence upload could not be confirmed. The claim was not submitted; return to the status page before retrying.",
        retryable: false,
      },
    });
  } finally {
    globalThis.clearTimeout(deadline);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

const postContract = (path, input, idempotencyKey) => {
  const body = contractBody(path, input);
  if (body.idempotencyKey !== undefined && body.idempotencyKey !== idempotencyKey) {
    throw new TypeError(`The ${path} body and Idempotency-Key header must match.`);
  }
  return requestJson(path, { method: "POST", body, idempotencyKey });
};

export const getPublicConfig = async () => assertPublicConfig(await requestJson("/api/pud/public-config"));
export const checkAddress = (input) => postContract("/api/pud/address/check", input);
export const joinWaitlist = (input, key) => postContract("/api/pud/waitlist", input, key);
export const startPhone = async (input) => assertPhoneStart(await postContract("/api/pud/phone/start", input));
export const resendPhone = async (input) => assertPhoneResend(await postContract("/api/pud/phone/resend", input));
export const verifyPhone = async (input) => assertPhoneVerify(await postContract("/api/pud/phone/verify", input));
export const setupPayment = (input, key) => postContract("/api/pud/payment/setup", input, key);
export const createOrder = (input, key) => postContract("/api/pud/orders", input, key);
export const statusOrder = async (token) => assertOrderStatus(await postContract("/api/pud/orders/status", { token }));
export const submitFeedback = async (token, statusSession, satisfaction, locale, key) => {
  if (!["satisfied", "needs_follow_up"].includes(satisfaction)) throw new TypeError("Choose one supported satisfaction response.");
  if (!["en-US", "es-US"].includes(locale)) throw new TypeError("A supported feedback locale is required.");
  return assertFeedbackResult(await postContract("/api/pud/orders/feedback", {
    token,
    statusSession,
    satisfaction,
    locale,
    idempotencyKey: key,
  }, key));
};
export const createStatusSession = async (token, phoneProof) => assertStatusSession(await postContract(
  "/api/pud/orders/status-session",
  { token, phoneProof },
));
export const startStatusRecovery = async (input) => assertStatusRecoveryStart(await postContract(
  "/api/pud/orders/status-recovery/start",
  input,
));
export const verifyStatusRecovery = async (recoveryId, code) => assertStatusRecoveryVerify(await postContract(
  "/api/pud/orders/status-recovery/verify",
  { recoveryId, code },
));
export const portalHistory = async (token, statusSession, { cursor, limit = 10 } = {}) => assertPortalHistory(await postContract(
  "/api/pud/orders/history",
  { token, statusSession, ...(cursor ? { cursor } : {}), limit },
));
export const loyaltySummary = async (token, statusSession, limit = 25) => assertLoyaltySummary(await postContract(
  "/api/pud/loyalty",
  { token, statusSession, limit },
));
export const issueActionCapability = async (token, statusSession, purpose) => assertActionCapability(await postContract(
  "/api/pud/orders/action-capability",
  { token, statusSession, purpose },
));
export const issueClaimEvidenceCapability = async (token, statusSession) => assertClaimEvidenceCapability(await postContract(
  "/api/pud/orders/claim-evidence/capability",
  { token, statusSession },
));
export const createClaimEvidenceGrant = async (token, actionCapability, { sha256, byteSize, mimeType }) => assertClaimEvidenceGrant(await postContract(
  "/api/pud/orders/claim-evidence/grant",
  { token, actionCapability, sha256, byteSize, mimeType },
));
export const uploadClaimEvidence = async (uploadGrant, mimeType, bytes) => {
  if (typeof uploadGrant !== "string" || !/^[A-Za-z0-9_-]{16,256}$/.test(uploadGrant)) {
    throw new TypeError("A valid evidence upload grant is required.");
  }
  if (!["image/jpeg", "image/png", "application/pdf"].includes(mimeType)) {
    throw new TypeError("A supported evidence content type is required.");
  }
  const byteSize = bytes instanceof ArrayBuffer ? bytes.byteLength : ArrayBuffer.isView(bytes) ? bytes.byteLength : -1;
  if (byteSize < 1 || byteSize > 5 * 1024 * 1024) throw new TypeError("Evidence bytes must be between 1 byte and 5 MB.");
  return assertClaimEvidenceAsset(await requestRaw("/api/pud/orders/claim-evidence/upload", {
    body: bytes,
    contentType: mimeType,
    headers: { "x-pud-upload-grant": uploadGrant },
  }));
};
export const cancelOrder = async (token, actionCapability, expectedVersion, reason, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/cancel",
  { token, actionCapability, expectedVersion, reason, idempotencyKey: key },
  key,
));
export const requestReschedule = async (token, actionCapability, routeProof, expectedVersion, reason, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/reschedule-request",
  { token, actionCapability, routeProof, expectedVersion, reason, idempotencyKey: key },
  key,
));
export const paymentSession = async (token, actionCapability) => assertPaymentSession(await postContract(
  "/api/pud/orders/payment-session",
  { token, actionCapability },
));
export const replacePaymentMethod = async (token, actionCapability, setupIntentId, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/payment-method",
  { token, actionCapability, setupIntentId, idempotencyKey: key },
  key,
));
export const updatePreferences = async (token, actionCapability, input, key) => assertPreferencesUpdate(await postContract(
  "/api/pud/orders/preferences",
  { token, actionCapability, ...input, idempotencyKey: key },
  key,
));
export const reorderOrder = async (token, actionCapability, proposalId) => assertReorderBootstrap(await postContract(
  "/api/pud/orders/reorder",
  { token, actionCapability, ...(proposalId ? { proposalId } : {}) },
));
export const tipOrder = async (token, actionCapability, amountCents, key) => {
  if (!Number.isInteger(amountCents) || amountCents < 50 || amountCents > 100_000) {
    throw new TypeError("Tip amount must be between $0.50 and $1,000.00.");
  }
  return assertTipResult(await postContract("/api/pud/orders/tip", { token, actionCapability, amountCents, idempotencyKey: key }, key));
};
export const createClaim = async (token, actionCapability, input, key) => assertClaimResult(await postContract(
  "/api/pud/orders/claim",
  { token, actionCapability, ...input, idempotencyKey: key },
  key,
));
export const createRecurring = async (token, actionCapability, input, key) => assertRecurringResult(await postContract(
  "/api/pud/recurring",
  { token, actionCapability, ...input, idempotencyKey: key },
  key,
));
export const recurringAction = async (action, token, actionCapability, input, key) => {
  if (!["pause", "skip", "resume"].includes(action)) throw new TypeError("Unsupported recurring action.");
  return assertRecurringResult(await postContract(`/api/pud/recurring/${action}`, { token, actionCapability, ...input, idempotencyKey: key }, key));
};
export const rotateStatusToken = async (token, actionCapability, expectedVersion, key) => assertStatusTokenRotation(await postContract(
  "/api/pud/orders/status-token/rotate",
  { token, actionCapability, expectedVersion, idempotencyKey: key },
  key,
));
export const revokeStatusToken = async (token, actionCapability, expectedVersion, key) => assertStatusTokenRevocation(await postContract(
  "/api/pud/orders/status-token/revoke",
  { token, actionCapability, expectedVersion, idempotencyKey: key },
  key,
));
