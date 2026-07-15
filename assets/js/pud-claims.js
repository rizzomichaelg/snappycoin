import {
  createClaim,
  createClaimEvidenceGrant,
  uploadClaimEvidence,
} from "./pud-api.js";
import { completeClaimAttempt, takeClaimCapabilities } from "./pud-claim-capability.js";
import {
  claimEvidenceReference,
  prepareClaimEvidence,
  validateClaimEvidenceFiles,
} from "./pud-claim-evidence.js";
import { retireActionKey, stableActionKey } from "./pud-idempotency.js";

const form = document.querySelector("[data-pud-claim-form]");

if (form && window.top !== window.self) {
  form.replaceChildren(Object.assign(document.createElement("p"), {
    className: "pud-alert",
    textContent: "Private claim pages cannot be opened inside another site.",
  }));
} else if (form) {
  let token = fragmentToken();
  // Remove the status bearer from the address bar before the customer can
  // type claim details. It remains only in this module's memory.
  history.replaceState(null, "", location.pathname);
  let capabilities = takeClaimCapabilities();
  let uploadedEvidence = [];
  let pendingClaimInput = null;
  let evidenceUploadTerminalFailure = false;
  let submitting = false;
  const message = document.querySelector("[data-message]");
  const evidenceInput = form.elements.namedItem("evidence");
  const evidenceField = document.querySelector("[data-claim-evidence-field]");
  const evidenceHelp = document.querySelector("[data-claim-evidence-help]");

  if (!token || !capabilities) {
    clearMemoryCredentials();
    disableForm("Return to the private status page, verify the mobile number, and choose Open a claim again.");
  } else if (Date.parse(capabilities.claimExpiresAt) <= Date.now()) {
    clearMemoryCredentials();
    disableForm("The one-time claim authorization expired. Verify again from the private status page.");
  } else if (capabilities.evidenceCapabilities.length) {
    evidenceField.hidden = false;
    evidenceHelp.hidden = false;
  }

  window.addEventListener("pagehide", clearMemoryCredentials, { once: true });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    clearMemoryCredentials();
    disableForm("Return to the private status page, verify the mobile number, and choose Open a claim again.");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting || evidenceUploadTerminalFailure) return;
    if (!token || !capabilities) {
      disableForm("Return to the private status page and verify again before opening a claim.");
      return;
    }
    if (Date.parse(capabilities.claimExpiresAt) <= Date.now()) {
      clearMemoryCredentials();
      disableForm("The one-time claim authorization expired. Verify again from the private status page.");
      return;
    }
    let input = pendingClaimInput;
    let evidenceFiles = [];
    if (!input) {
      const data = new FormData(form);
      const requestedAmount = String(data.get("requestedAmount") || "").trim();
      if (requestedAmount && !/^\d{1,6}(?:\.\d{1,2})?$/.test(requestedAmount)) {
        show("Enter a requested amount with no more than two decimal places.");
        return;
      }
      const requestedAmountCents = requestedAmount ? Math.round(Number(requestedAmount) * 100) : undefined;
      if (requestedAmountCents !== undefined && requestedAmountCents < 1) {
        show("Enter an amount of at least $0.01, or leave the requested amount blank.");
        return;
      }
      try {
        evidenceFiles = validateClaimEvidenceFiles(evidenceInput?.files);
        if (evidenceFiles.length > capabilities.evidenceCapabilities.length) {
          throw new Error("Evidence upload is unavailable for one or more selected files. Return to the status page and verify again.");
        }
      } catch (error) {
        show(error?.message || "Review the selected evidence files.");
        return;
      }
      input = {
        claimType: String(data.get("claimType") || "other"),
        description: String(data.get("description") || "").trim(),
        requestedAmountCents,
      };
    }
    const button = form.querySelector("button[type=submit]");
    submitting = true;
    button.disabled = true;
    try {
      if (evidenceFiles.length && !uploadedEvidence.length) {
        uploadedEvidence = await uploadEvidenceFiles(evidenceFiles);
        evidenceInput.disabled = true;
        evidenceHelp.textContent = `${uploadedEvidence.length} evidence file${uploadedEvidence.length === 1 ? "" : "s"} secured. If claim submission needs a network retry, the same in-memory references will be reused without uploading again.`;
      }
      if (!pendingClaimInput) {
        pendingClaimInput = Object.freeze({ ...input });
        form.querySelectorAll("input, select, textarea").forEach((control) => { control.disabled = true; });
      }
      // Only a digest of this signature is retained by stableActionKey. The
      // status bearer, form values, evidence references, and capabilities are
      // never persisted there.
      const attemptId = capabilities.attemptId;
      const key = await stableActionKey("claim", attemptId);
      const result = await createClaim(token, capabilities.claimActionCapability, {
        ...pendingClaimInput,
        ...(uploadedEvidence.length ? { evidence: uploadedEvidence } : {}),
      }, key);
      completeClaimAttempt(attemptId);
      await retireActionKey("claim", attemptId);
      const evidenceCount = uploadedEvidence.length;
      clearMemoryCredentials();
      form.replaceChildren(Object.assign(document.createElement("p"), {
        textContent: result.duplicate
          ? `Claim ${result.claimId} was already received and remains ${result.status}${evidenceCount ? ` with ${evidenceCount} evidence file${evidenceCount === 1 ? "" : "s"}` : ""}.`
          : `Claim ${result.claimId} was received and is ${result.status}${evidenceCount ? ` with ${evidenceCount} evidence file${evidenceCount === 1 ? "" : "s"}` : ""}. We will contact you after review.`,
      }));
    } catch (error) {
      if (evidenceUploadTerminalFailure) return;
      if (error?.code === "PUD_IDEMPOTENCY_CONFLICT") {
        const attemptId = capabilities?.attemptId;
        if (attemptId) {
          completeClaimAttempt(attemptId);
          await retireActionKey("claim", attemptId);
        }
        clearMemoryCredentials();
        disableForm("An earlier claim request used different details and may already have been received. Check order history before opening another claim.");
        return;
      }
      if (["PUD_ACTION_CAPABILITY_INVALID", "PUD_ACTION_CAPABILITY_REPLAYED"].includes(error?.code) ||
          (error?.status > 0 && !error?.retryable)) {
        clearMemoryCredentials();
        disableForm("That one-time claim authorization can no longer be used. Verify again from the private status page. Any evidence uploaded during this attempt was not submitted with a claim.");
      } else {
        const evidenceNote = uploadedEvidence.length
          ? " The secured evidence references remain only in this page and will be reused without another upload when you retry."
          : "";
        show(`${error?.message || "The claim could not be confirmed. Check the connection and retry once."}${evidenceNote}`);
      }
    } finally {
      submitting = false;
      if (button.isConnected && token && capabilities && !evidenceUploadTerminalFailure) button.disabled = false;
    }
  });

  async function uploadEvidenceFiles(files) {
    const references = [];
    if (evidenceInput) evidenceInput.disabled = true;
    for (let index = 0; index < files.length; index += 1) {
      const evidenceCapability = capabilities.evidenceCapabilities[index];
      if (!evidenceCapability || Date.parse(evidenceCapability.expiresAt) <= Date.now()) {
        evidenceUploadTerminalFailure = true;
        disableForm("An evidence authorization expired before the claim was submitted. Your claim was not submitted; return to the private status page and verify again.");
        throw new Error("Evidence authorization expired.");
      }
      try {
        show(`Securing evidence file ${index + 1} of ${files.length} before submitting the claim…`, "status");
        const prepared = await prepareClaimEvidence(files[index]);
        const grant = await createClaimEvidenceGrant(token, evidenceCapability.actionCapability, prepared);
        if (prepared.byteSize > grant.maxBytes || !grant.acceptedMimeTypes.includes(prepared.mimeType)) {
          throw new Error("The evidence service did not accept the selected file contract.");
        }
        const asset = await uploadClaimEvidence(grant.uploadGrant, prepared.mimeType, prepared.bytes);
        references.push(claimEvidenceReference(asset));
      } catch (error) {
        evidenceUploadTerminalFailure = true;
        disableForm(`The claim was not submitted because evidence file ${index + 1} could not be secured. Your entered claim details remain on this page. Return to the private status page and verify again before retrying; do not resubmit a claim just to compensate for this upload failure. ${error?.message || ""}`.trim());
        throw error;
      }
    }
    return Object.freeze(references);
  }

  function disableForm(text) {
    show(text);
    form.querySelectorAll("input, select, textarea, button").forEach((control) => { control.disabled = true; });
  }

  function clearMemoryCredentials() {
    token = "";
    capabilities = null;
    uploadedEvidence = [];
    pendingClaimInput = null;
  }

  function show(text, variant = "error") {
    message.textContent = text;
    message.dataset.variant = variant;
    message.hidden = !text;
    if (text) message.focus();
  }
}

function fragmentToken() {
  try { return decodeURIComponent(location.hash.slice(1)); } catch (_error) { return ""; }
}
