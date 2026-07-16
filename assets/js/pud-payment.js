import { setupPayment } from "./pud-api.js";
import { PUD_CONFIG } from "./pud-config.js";
import { getLocale, translateText } from "./site-i18n.js";

let stripe;
let elements;
let paymentElement;
let replacementStripe;
let replacementElements;
let replacementPaymentElement;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (globalThis.Stripe) resolve();
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
