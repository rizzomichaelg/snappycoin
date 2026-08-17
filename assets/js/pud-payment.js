import { setupPayment } from "./pud-api.js";
import { PUD_CONFIG } from "./pud-config.js";
import { getLocale, translateText } from "./site-i18n.js";

let stripe;
let elements;
let paymentElement;
let replacementStripe;
let replacementElements;
let replacementPaymentElement;
let squareCard;
let replacementSquareCard;

function loadScript(src, isReady = () => Boolean(globalThis.Stripe)) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (isReady()) resolve();
      else existing.addEventListener("load", resolve, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Secure payment fields could not load.")), { once: true });
    document.head.append(script);
  });
}

function squareScript(publicConfig) {
  return publicConfig?.squareEnvironment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";
}

async function squarePayments(publicConfig) {
  const applicationId = publicConfig?.squareApplicationId;
  const locationId = publicConfig?.squareLocationId;
  if (!applicationId || !locationId) throw new Error("Secure card setup is not configured.");
  await loadScript(squareScript(publicConfig), () => Boolean(globalThis.Square?.payments));
  if (!globalThis.Square?.payments) throw new Error("Secure Square card fields could not load.");
  return globalThis.Square.payments(applicationId, locationId);
}

export function squareMountSelector(mount) {
  if (typeof mount === "string" && mount.trim()) return mount.trim();
  const id = String(mount?.id || "").trim();
  if (!id) throw new Error("Secure card field containers must have an id.");
  const escapedId = globalThis.CSS?.escape ? globalThis.CSS.escape(id) : id;
  return `#${escapedId}`;
}

export async function prepareSquareCard(publicConfig, mount) {
  if (!mount) throw new Error("Secure card fields do not have a place to load.");
  destroySquareCard();
  try {
    const payments = await squarePayments(publicConfig);
    squareCard = await payments.card();
    await squareCard.attach(squareMountSelector(mount));
  } catch (_error) {
    destroySquareCard();
    throw new Error("Secure Square card fields could not load. Refresh this page and try again. No card was saved or charged.");
  }
}

export async function tokenizeSquareCard(billingContact) {
  if (!squareCard) throw new Error("Secure Square card fields are not ready.");
  const result = await squareCard.tokenize({
    intent: "STORE",
    customerInitiated: true,
    sellerKeyedIn: false,
    billingContact,
  });
  if (result.status !== "OK" || !result.token) {
    throw new Error(squarePaymentError(result.errors, "Card verification failed. Check the card details and try again."));
  }
  return result.token;
}

export async function prepareSquareCardReplacement(publicConfig, mount) {
  if (!mount) throw new Error("Secure replacement-card fields do not have a place to load.");
  destroySquareCardReplacement();
  try {
    const payments = await squarePayments(publicConfig);
    replacementSquareCard = await payments.card();
    await replacementSquareCard.attach(squareMountSelector(mount));
  } catch (_error) {
    destroySquareCardReplacement();
    throw new Error("Secure Square card fields could not load. Refresh this page and try again. No card was saved or charged.");
  }
}

export async function tokenizeSquareCardReplacement(billingContact = {}) {
  if (!replacementSquareCard) throw new Error("Secure replacement-card fields are not ready.");
  const result = await replacementSquareCard.tokenize({
    intent: "STORE",
    customerInitiated: true,
    sellerKeyedIn: false,
    billingContact,
  });
  if (result.status !== "OK" || !result.token) {
    throw new Error(squarePaymentError(result.errors, "Replacement card verification failed."));
  }
  return result.token;
}

export function destroySquareCardReplacement() {
  try { replacementSquareCard?.destroy?.(); } catch (_error) { /* already removed */ }
  replacementSquareCard = undefined;
}

export function destroySquareCard() {
  try { squareCard?.destroy?.(); } catch (_error) { /* already removed */ }
  squareCard = undefined;
}

export async function preparePayment({ publicConfig, checkoutAttemptId, phoneProof, addressProof, routeProof, firstName, lastName, email, attribution, waitlistContinuationToken, idempotencyKey, mount }) {
  const result = await setupPayment({
    idempotencyKey,
    checkoutAttemptId,
    phoneProof,
    addressProof,
    routeProof,
    firstName,
    lastName,
    ...(email ? { email } : {}),
    attribution,
    ...(waitlistContinuationToken ? { waitlistContinuationToken } : {}),
  }, idempotencyKey);
  const publishableKey = result.publishableKey || publicConfig.stripePublishableKey;
  const clientSecret = result.setupIntentClientSecret || result.clientSecret;
  if (!publishableKey || !clientSecret || !result.checkoutProof) throw new Error("Card setup is not available yet.");
  await loadScript(PUD_CONFIG.stripeScript);
  stripe = globalThis.Stripe(publishableKey);
  elements = stripe.elements({ clientSecret, locale: stripeLocale(), appearance: { theme: "stripe" } });
  paymentElement = elements.create("payment", { layout: "tabs" });
  paymentElement.mount(mount);
  return { setupIntentId: result.setupIntentId, checkoutProof: result.checkoutProof };
}

export async function confirmPayment(returnUrl) {
  if (!stripe || !elements || !paymentElement) throw new Error("Secure payment fields are not ready.");
  const result = await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams: { return_url: returnUrl } });
  if (result.error) throw new Error(paymentError(result.error, "Card setup failed."));
  if (!result.setupIntent || result.setupIntent.status !== "succeeded") throw new Error("Card setup needs additional confirmation.");
  return result.setupIntent;
}

export async function confirmPaymentRemediation(publicConfig, clientSecret) {
  const publishableKey = publicConfig?.stripePublishableKey;
  if (!publishableKey || !clientSecret) throw new Error("Secure payment authentication is not available.");
  await loadScript(PUD_CONFIG.stripeScript);
  const remediationStripe = globalThis.Stripe(publishableKey);
  const result = await remediationStripe.confirmCardPayment(clientSecret);
  if (result.error) throw new Error(paymentError(result.error, "Payment authentication failed."));
  if (!result.paymentIntent || !["processing", "succeeded"].includes(result.paymentIntent.status)) {
    throw new Error("Payment authentication is not complete.");
  }
  return result.paymentIntent;
}

export async function preparePaymentMethodReplacement(publicConfig, clientSecret, mount) {
  const publishableKey = publicConfig?.stripePublishableKey;
  if (!publishableKey || !clientSecret || !mount) throw new Error("Secure card replacement is not available.");
  destroyPaymentMethodReplacement();
  await loadScript(PUD_CONFIG.stripeScript);
  replacementStripe = globalThis.Stripe(publishableKey);
  replacementElements = replacementStripe.elements({ clientSecret, locale: stripeLocale(), appearance: { theme: "stripe" } });
  replacementPaymentElement = replacementElements.create("payment", { layout: "tabs" });
  replacementPaymentElement.mount(mount);
}

export async function confirmPaymentMethodReplacement(returnUrl) {
  if (!replacementStripe || !replacementElements || !replacementPaymentElement) {
    throw new Error("Secure replacement-card fields are not ready.");
  }
  const result = await replacementStripe.confirmSetup({
    elements: replacementElements,
    redirect: "if_required",
    confirmParams: { return_url: returnUrl },
  });
  if (result.error) throw new Error(paymentError(result.error, "Replacement card authentication failed."));
  if (!result.setupIntent || result.setupIntent.status !== "succeeded") {
    throw new Error("Replacement card authentication is not complete.");
  }
  return result.setupIntent;
}

export function destroyPaymentMethodReplacement() {
  try { replacementPaymentElement?.destroy(); } catch (_error) { /* already removed */ }
  replacementStripe = undefined;
  replacementElements = undefined;
  replacementPaymentElement = undefined;
}

export function destroyPayment() {
  try { paymentElement?.destroy(); } catch (_error) { /* already removed */ }
  stripe = undefined;
  elements = undefined;
  paymentElement = undefined;
}

function stripeLocale() {
  return getLocale() === "es-US" ? "es" : "en";
}

function paymentError(providerError, fallback) {
  if (getLocale() === "es-US") return translateText(fallback, "es-US");
  return providerError?.message || fallback;
}

function squarePaymentError(errors, fallback) {
  if (getLocale() === "es-US") return translateText(fallback, "es-US");
  const detail = Array.isArray(errors) ? errors.find((error) => error?.message)?.message : "";
  return detail || fallback;
}
