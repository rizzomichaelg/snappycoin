import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assertFeedbackResult, contractBody } from "../assets/js/pud-contract.js";

test("feedback request is bounded, locale-aware, and idempotent", () => {
  const input = {
    token: "private-status-token",
    statusSession: "verified-status-session",
    locale: "es-US",
    satisfaction: "needs_follow_up",
    idempotencyKey: "feedback:stable-key",
    freeText: "must-not-leak",
    rating: 1,
  };
  assert.deepEqual(contractBody("/api/pud/orders/feedback", input), {
    token: input.token,
    statusSession: input.statusSession,
    locale: "es-US",
    satisfaction: "needs_follow_up",
    idempotencyKey: input.idempotencyKey,
  });
  assert.throws(() => contractBody("/api/pud/orders/feedback", { ...input, statusSession: "" }), /missing: statusSession/);
});

test("feedback result accepts one neutral HTTPS review link and no extra fields", () => {
  const result = {
    feedbackId: "feedback-1",
    satisfaction: "needs_follow_up",
    submittedAt: "2026-07-15T16:00:00Z",
    duplicate: false,
    supportRequested: true,
    googleReviewUrl: "https://g.page/r/snappy/review",
  };
  assert.equal(assertFeedbackResult(result), result);
  assert.throws(() => assertFeedbackResult({ ...result, googleReviewUrl: "javascript:alert(1)" }), /HTTPS URL/);
  assert.throws(() => assertFeedbackResult({ ...result, customerEmail: "must-not-leak@example.com" }), /unexpected field/);
});

test("status feedback UI is one private question without free text or rating gating", async () => {
  const root = new URL("../", import.meta.url);
  const [html, statusSource] = await Promise.all([
    readFile(new URL("pickup-delivery/status/index.html", root), "utf8"),
    readFile(new URL("assets/js/pud-status.js", root), "utf8"),
  ]);
  const panel = html.match(/<section class="pud-status-section pud-feedback"[\s\S]*?<\/section>/)?.[0] || "";
  assert.match(panel, /data-satisfaction="satisfied"/);
  assert.match(panel, /data-satisfaction="needs_follow_up"/);
  assert.doesNotMatch(panel, /textarea|type="number"|star|[1-5]-star/i);
  assert.match(panel, /data-feedback-review-link/);
  assert.match(statusSource, /value\.canSubmitFeedback === true/);
  assert.match(statusSource, /statusSession/);
  assert.match(statusSource, /stableActionKey\("feedback"/);
  assert.match(statusSource, /feedbackResult\.googleReviewUrl/);
  assert.doesNotMatch(statusSource, /satisfaction.*googleReviewUrl|googleReviewUrl.*satisfaction/);
});
