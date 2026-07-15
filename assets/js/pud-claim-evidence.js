export const CLAIM_EVIDENCE_MAX_BYTES = 5 * 1024 * 1024;
export const CLAIM_EVIDENCE_MAX_FILES = 5;
export const CLAIM_EVIDENCE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export async function prepareClaimEvidence(file) {
  validateClaimEvidenceFile(file);
  if (!globalThis.crypto?.subtle?.digest) {
    throw new Error("Secure evidence verification is unavailable in this browser.");
  }
  const bytes = await file.arrayBuffer();
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength !== file.size) {
    throw new Error("The selected evidence file could not be read completely.");
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Object.freeze({
    bytes,
    byteSize: bytes.byteLength,
    mimeType: file.type,
    sha256: [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  });
}

export function validateClaimEvidenceFile(file) {
  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
    throw new TypeError("Choose a JPEG, PNG, or PDF evidence file.");
  }
  if (!CLAIM_EVIDENCE_MIME_TYPES.includes(file.type)) {
    throw new TypeError("Evidence must be a JPEG, PNG, or PDF file recognized by your browser.");
  }
  if (!Number.isSafeInteger(file.size) || file.size < 1) {
    throw new TypeError("The evidence file is empty or unreadable.");
  }
  if (file.size > CLAIM_EVIDENCE_MAX_BYTES) {
    throw new TypeError("Evidence files must be 5 MB or smaller.");
  }
  return file;
}

export function validateClaimEvidenceFiles(files) {
  const values = Array.from(files || []);
  if (values.length > CLAIM_EVIDENCE_MAX_FILES) {
    throw new TypeError("Choose no more than five evidence files.");
  }
  values.forEach(validateClaimEvidenceFile);
  return values;
}

export function claimEvidenceReference(asset) {
  if (!asset || typeof asset !== "object") throw new TypeError("The evidence result is invalid.");
  const { assetId, sha256, mimeType } = asset;
  if (typeof assetId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(assetId) ||
      typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256) ||
      !CLAIM_EVIDENCE_MIME_TYPES.includes(mimeType)) {
    throw new TypeError("The evidence result is invalid.");
  }
  return Object.freeze({ assetId, sha256, mimeType });
}
