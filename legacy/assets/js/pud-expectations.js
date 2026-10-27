export function orderExpectation(order, now = Date.now()) {
  const stage = order.fulfillmentStatus;
  if (["delivered", "canceled"].includes(stage)) return null;
  const pickup = ["submitted", "confirmed"].includes(stage);
  const end = pickup ? order.pickupWindowEndAt : order.deliveryWindowEndAt;
  if (order.operationalAttentionRequired) return { attention: true, text: "Your order needs a scheduling or service review. Contact the store to confirm the next step before expecting another handoff." };
  if (end && Date.parse(end) < now) return { attention: true, text: "The saved window has passed and this handoff is not marked complete. Refresh for an update or contact the store to confirm timing." };
  if (pickup) return { attention: false, text: stage === "submitted" ? "Your requested pickup window is awaiting staff confirmation. Check this page for confirmation before leaving bags out." : "Have your bags ready during your confirmed pickup window. Use the options below if your plans change." };
  if (!order.deliveryWindowStartAt || !order.deliveryWindowEndAt) return { attention: false, text: "Your return time is an estimate until a delivery window is assigned. Check this page for the scheduled window or contact the store if you need to coordinate delivery." };
  return { attention: false, text: "This is your scheduled delivery window, not a live arrival estimate. Follow your saved handoff instructions and check this page for updates." };
}
