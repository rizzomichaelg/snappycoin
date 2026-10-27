const headers = [...document.querySelectorAll(".pud-header")];
// The gap exceeds the header's height change, preventing scroll anchoring
// during resizing from immediately reversing the transition.
const condensedThreshold = 96;
const expandedThreshold = 16;
let condensed = false;
let framePending = false;

function renderHeaderState() {
  framePending = false;
  const nextCondensed = condensed
    ? window.scrollY > expandedThreshold
    : window.scrollY > condensedThreshold;
  if (nextCondensed === condensed) return;
  condensed = nextCondensed;
  for (const header of headers) header.classList.toggle("is-condensed", condensed);
}

function scheduleHeaderState() {
  if (framePending) return;
  framePending = true;
  window.requestAnimationFrame(renderHeaderState);
}

if (headers.length) {
  renderHeaderState();
  window.addEventListener("scroll", scheduleHeaderState, { passive: true });
}
