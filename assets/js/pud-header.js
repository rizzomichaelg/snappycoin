const headers = [...document.querySelectorAll(".pud-header")];
const condensedThreshold = 72;
let framePending = false;

function renderHeaderState() {
  framePending = false;
  const condensed = window.scrollY > condensedThreshold;
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
