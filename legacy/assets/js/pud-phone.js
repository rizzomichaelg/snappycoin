import { resendPhone, startPhone, verifyPhone } from "./pud-api.js";

export const beginPhoneVerification = (phone) => startPhone({ phone });
export const confirmPhoneVerification = (verificationId, code) => verifyPhone({ verificationId, code });
export const resendPhoneVerification = (verificationId, turnstileToken) => resendPhone({ verificationId, turnstileToken });

export function normalizeUsPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error("Enter a valid 10-digit mobile number.");
}

export function formatUsPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function bindPhoneFormatting(container = document) {
  container.querySelectorAll?.('input[type="tel"]').forEach((input) => {
    if (input.dataset.phoneFormatting === "true") return;
    input.dataset.phoneFormatting = "true";
    input.addEventListener("input", () => { input.value = formatUsPhoneInput(input.value); });
    if (input.value) input.value = formatUsPhoneInput(input.value);
  });
}
