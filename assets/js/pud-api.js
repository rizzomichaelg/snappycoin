import { apiUrl } from "./pud-config.js";
import {
  assertOrderStatus,
  assertPaymentSession,
  assertPublicConfig,
  assertRecurringResult,
  assertReorderBootstrap,
  assertTipResult,
  contractBody,
} from "./pud-contract.js";

export class PudApiError extends Error {
  constructor(status, payload, requestId) {
    const error = payload?.error;
    super(error?.message || payload?.message || "We could not complete that request.");
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
export const startPhone = (input) => postContract("/api/pud/phone/start", input);
export const resendPhone = (input) => postContract("/api/pud/phone/resend", input);
export const verifyPhone = (input) => postContract("/api/pud/phone/verify", input);
export const setupPayment = (input, key) => postContract("/api/pud/payment/setup", input, key);
export const createOrder = (input, key) => postContract("/api/pud/orders", input, key);
export const statusOrder = async (token) => assertOrderStatus(await postContract("/api/pud/orders/status", { token }));
export const cancelOrder = async (token, expectedVersion, reason, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/cancel",
  { token, expectedVersion, reason, idempotencyKey: key },
  key,
));
export const requestReschedule = async (token, routeProof, expectedVersion, reason, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/reschedule-request",
  { token, routeProof, expectedVersion, reason, idempotencyKey: key },
  key,
));
export const paymentSession = async (token) => assertPaymentSession(await postContract("/api/pud/orders/payment-session", { token }));
export const replacePaymentMethod = async (token, setupIntentId, key) => assertOrderStatus(await postContract(
  "/api/pud/orders/payment-method",
  { token, setupIntentId, idempotencyKey: key },
  key,
));
export const reorderOrder = async (token, proposalId) => assertReorderBootstrap(await postContract(
  "/api/pud/orders/reorder",
  { token, ...(proposalId ? { proposalId } : {}) },
));
export const tipOrder = async (token, amountCents, key) => {
  if (!Number.isInteger(amountCents) || amountCents < 50 || amountCents > 100_000) {
    throw new TypeError("Tip amount must be between $0.50 and $1,000.00.");
  }
  return assertTipResult(await postContract("/api/pud/orders/tip", { token, amountCents, idempotencyKey: key }, key));
};
export const createClaim = (token, input, key) => postContract(
  "/api/pud/orders/claim",
  { token, ...input, idempotencyKey: key },
  key,
);
export const createRecurring = async (token, input, key) => assertRecurringResult(await postContract(
  "/api/pud/recurring",
  { token, ...input, idempotencyKey: key },
  key,
));
export const recurringAction = async (action, token, input, key) => {
  if (!["pause", "skip", "resume"].includes(action)) throw new TypeError("Unsupported recurring action.");
  return assertRecurringResult(await postContract(`/api/pud/recurring/${action}`, { token, ...input, idempotencyKey: key }, key));
};
