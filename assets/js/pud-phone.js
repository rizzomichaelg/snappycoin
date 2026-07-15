import { resendPhone, startPhone, verifyPhone } from "./pud-api.js";

export const beginPhoneVerification = (phone, turnstileToken) => startPhone({ phone, turnstileToken });
export const confirmPhoneVerification = (verificationId, code) => verifyPhone({ verificationId, code });
export const resendPhoneVerification = (verificationId, turnstileToken) => resendPhone({ verificationId, turnstileToken });

export function normalizeUsPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  throw new Error("Enter a valid 10-digit mobile number.");
}
