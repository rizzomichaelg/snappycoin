function invalid(field, message) {
  const error = new Error(message);
  error.fieldErrors = { [field]: message };
  throw error;
}

/** Read independent, current choices. Hidden or stale authorization never grants consent. */
export function readHandoffChoices(data) {
  const pickup = data.get("pickupHandoff");
  const delivery = data.get("deliveryHandoff");
  if (!["attended", "unattended"].includes(pickup)) invalid("pickupHandoff", "Choose how we should collect your bags.");
  if (!["attended", "unattended"].includes(delivery)) invalid("deliveryHandoff", "Choose how we should return your clean laundry.");
  const unattendedPickup = pickup === "unattended";
  const unattendedDelivery = delivery === "unattended";
  if (unattendedPickup && data.get("unattendedPickupAuthorization") !== "yes") {
    invalid("unattendedPickupAuthorization", "Authorize pickup from the secure location or choose to hand the bags to the driver.");
  }
  if (unattendedDelivery && data.get("unattendedDeliveryAuthorization") !== "yes") {
    invalid("unattendedDeliveryAuthorization", "Authorize delivery to the secure location or choose to receive your laundry in person.");
  }
  const pickupAccessNotes = unattendedPickup ? String(data.get("pickupAccessNotes") || "").trim() : "";
  const deliveryAccessNotes = unattendedDelivery ? String(data.get("deliveryAccessNotes") || "").trim() : "";
  if (unattendedPickup && (!pickupAccessNotes || pickupAccessNotes.length > 500)) {
    invalid("pickupAccessNotes", "Describe the secure pickup location and access instructions in 500 characters or fewer.");
  }
  if (unattendedDelivery && (!deliveryAccessNotes || deliveryAccessNotes.length > 500)) {
    invalid("deliveryAccessNotes", "Describe the secure delivery location and access instructions in 500 characters or fewer.");
  }
  // Existing encrypted storage is shared. Labels describe each independent
  // instruction; they are never parsed into consent or copied into a reorder.
  const accessNotes = [
    pickupAccessNotes ? `Pickup instructions: ${pickupAccessNotes}` : "",
    deliveryAccessNotes ? `Delivery instructions: ${deliveryAccessNotes}` : "",
  ].filter(Boolean).join("\n");
  return { unattendedPickup, unattendedDelivery, pickupAccessNotes, deliveryAccessNotes, accessNotes };
}

export function handoffConsentDecisions(handoffs, versions = {}, fallback) {
  return {
    unattended_pickup: { accepted: handoffs.unattendedPickup === true, version: versions.unattended_pickup || fallback },
    unattended_delivery: { accepted: handoffs.unattendedDelivery === true, version: versions.unattended_delivery || fallback },
  };
}

export function syncHandoffFields(form) {
  if (!form) return;
  for (const purpose of ["pickup", "delivery"]) {
    const unattended = form.querySelector(`[name="${purpose}Handoff"]:checked`)?.value === "unattended";
    const group = form.querySelector(`[data-unattended-${purpose}-details]`);
    if (!group) continue;
    group.hidden = !unattended;
    for (const control of group.querySelectorAll("textarea, input")) {
      control.required = unattended;
      control.disabled = !unattended;
      if (!unattended) {
        if (control.type === "checkbox") control.checked = false;
        else control.value = "";
      }
    }
  }
}

/** Start a new booking with no inherited unattended permission or access notes. */
export function resetHandoffFields(form) {
  if (!form) return;
  for (const radio of form.querySelectorAll('[name="pickupHandoff"], [name="deliveryHandoff"]')) {
    radio.checked = radio.name === "pickupHandoff" && radio.value === "attended";
  }
  for (const input of form.querySelectorAll('[name="unattendedPickupAuthorization"], [name="unattendedDeliveryAuthorization"], [name="unattendedPickup"], [name="unattendedDelivery"]')) input.checked = false;
  for (const notes of form.querySelectorAll('[name="pickupAccessNotes"], [name="deliveryAccessNotes"], [name="accessNotes"]')) notes.value = "";
  syncHandoffFields(form);
}
