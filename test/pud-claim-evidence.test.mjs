import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAIM_EVIDENCE_MAX_BYTES,
  claimEvidenceReference,
  prepareClaimEvidence,
  validateClaimEvidenceFiles,
} from "../assets/js/pud-claim-evidence.js";

const file = (bytes, type = "image/png") => ({
  type,
  size: bytes.byteLength,
  arrayBuffer: async () => bytes.slice(0),
});

test("evidence preparation enforces type, size, count, and a lowercase SHA-256", async () => {
  const bytes = new TextEncoder().encode("safe evidence bytes").buffer;
  const prepared = await prepareClaimEvidence(file(bytes));
  assert.equal(prepared.byteSize, bytes.byteLength);
  assert.equal(prepared.mimeType, "image/png");
  assert.match(prepared.sha256, /^[a-f0-9]{64}$/);
  assert.equal(validateClaimEvidenceFiles(Array.from({ length: 5 }, () => file(bytes))).length, 5);
  assert.throws(() => validateClaimEvidenceFiles(Array.from({ length: 6 }, () => file(bytes))), /no more than five/i);
  assert.throws(() => validateClaimEvidenceFiles([file(bytes, "text/plain")]), /JPEG, PNG, or PDF/);
  assert.throws(
    () => validateClaimEvidenceFiles([file(new ArrayBuffer(CLAIM_EVIDENCE_MAX_BYTES + 1))]),
    /5 MB or smaller/,
  );
});

test("claim evidence references retain only the backend-approved immutable fields", () => {
  const reference = claimEvidenceReference({
    assetId: "asset_reference_1234",
    sha256: "a".repeat(64),
    mimeType: "application/pdf",
    byteSize: 42,
    retentionUntil: "2027-07-15T00:00:00Z",
    requestId: "must-not-be-forwarded",
  });
  assert.deepEqual(reference, {
    assetId: "asset_reference_1234",
    sha256: "a".repeat(64),
    mimeType: "application/pdf",
  });
});
