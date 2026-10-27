/**
 * Simple form validation for the contact form.
 * Ensures that all required fields are filled out before submission.
 */
function validateForm() {
  const nameField = document.getElementById("name");
  const emailField = document.getElementById("email");
  const messageField = document.getElementById("message");

  if (!nameField.value.trim()) {
    alert("Please enter your name.");
    nameField.focus();
    return false;
  }

  if (!emailField.value.trim()) {
    alert("Please enter a valid email address.");
    emailField.focus();
    return false;
  }

  if (!messageField.value.trim()) {
    alert("Please enter a message.");
    messageField.focus();
    return false;
  }

  // All good, allow form submission
  return true;
}

const CENTRAL_TIMEZONE = "America/Chicago";
const CT_OPEN_START_MINUTE = 6 * 60; // 6:00 AM
const CT_OPEN_END_MINUTE = 1 * 60 + 30; // 1:30 AM

function getCentralTimeMinutes(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIMEZONE,
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour").value);
  const minute = Number(parts.find((p) => p.type === "minute").value);

  return hour * 60 + minute;
}

function isOpenNowInCentral(date = new Date()) {
  const currentMinute = getCentralTimeMinutes(date);

  // Open window crosses midnight, e.g. 6:00 AM to 1:30 AM.
  return currentMinute >= CT_OPEN_START_MINUTE || currentMinute < CT_OPEN_END_MINUTE;
}

function updateOpenStatus() {
  const statusEl = document.querySelector("[data-open-status]");
  if (!statusEl) return;

  if (isOpenNowInCentral()) {
    statusEl.textContent = "Open now";
    statusEl.classList.remove("is-closed");
    statusEl.classList.add("is-open");
    return;
  }

  statusEl.textContent = "Closed";
  statusEl.classList.remove("is-open");
  statusEl.classList.add("is-closed");
}

function initializeMarketingPage() {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  // Show every service without JavaScript; progressively enhance to accessible tabs.
  const tabList = document.querySelector(".service-tabs");
  const serviceTabs = Array.from(document.querySelectorAll("[data-service-target]"));
  const servicePanels = Array.from(document.querySelectorAll(".service-panel"));
  const panelWrapper = document.querySelector(".services-wrapper");
  let serviceAnimation;
  let underline;
  function positionServiceUnderline() {
    const selected = serviceTabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    if (!selected || !underline) return;
    underline.style.transform = `translateX(${selected.offsetLeft}px) scaleX(${selected.offsetWidth})`;
  }
  function selectService(id, focus = false, transition = true) {
    const selected = serviceTabs.find((tab) => tab.dataset.serviceTarget === id);
    if (!selected) return;
    const changed = selected.getAttribute("aria-selected") !== "true";
    const previous = serviceTabs.some((tab) => tab.getAttribute("aria-selected") === "true");
    serviceAnimation?.cancel();
    serviceTabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    servicePanels.forEach((panel) => {
      const inactive = panel.id !== id;
      panel.hidden = inactive;
      panel.inert = inactive;
      panel.setAttribute("aria-hidden", String(inactive));
    });
    positionServiceUnderline();
    if (transition && changed && previous && !motionPreference.matches) {
      const panel = servicePanels.find((item) => item.id === id);
      serviceAnimation = panel?.animate?.([{ opacity: 0.35 }, { opacity: 1 }], {
        duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
    if (focus) selected.focus({ preventScroll: true });
  }
  function revealHashTarget(hash = window.location.hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = id && document.getElementById(id);
    if (!target) return;
    const panel = target.closest(".service-panel");
    if (panel) selectService(panel.id, false, false);
    let disclosure = target.closest("details");
    while (disclosure) {
      disclosure.open = true;
      disclosure = disclosure.parentElement?.closest("details");
    }
    return panel;
  }
  function scrollToServiceOverview(focus = false) {
    const section = document.getElementById("services");
    if (!section) return;
    if (focus) {
      const heading = section.querySelector("h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
    section.scrollIntoView({ block: "start" });
  }
  if (tabList && serviceTabs.length) {
    panelWrapper.classList.add("is-enhanced");
    tabList.hidden = false;
    tabList.setAttribute("role", "tablist");
    underline = document.createElement("span");
    underline.className = "service-tab-indicator";
    underline.setAttribute("aria-hidden", "true");
    tabList.append(underline);
    serviceTabs.forEach((tab, index) => {
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", tab.dataset.serviceTarget);
      tab.addEventListener("click", () => selectService(tab.dataset.serviceTarget));
      tab.addEventListener("keydown", (event) => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % serviceTabs.length;
        if (event.key === "ArrowLeft") next = (index - 1 + serviceTabs.length) % serviceTabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = serviceTabs.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        selectService(serviceTabs[next].dataset.serviceTarget, true);
      });
    });
    servicePanels.forEach((panel) => {
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `tab-${panel.id}`);
      panel.tabIndex = 0;
    });
    selectService(serviceTabs[0].dataset.serviceTarget);
    revealHashTarget();
    // CSS grid reserves the tallest panel without unhiding or measuring content.
    document.fonts?.ready.then(positionServiceUnderline);
    if ("ResizeObserver" in window) {
      new ResizeObserver(positionServiceUnderline).observe(tabList);
    } else {
      window.addEventListener("resize", positionServiceUnderline);
    }
    motionPreference.addEventListener("change", () => serviceAnimation?.cancel());
  }
  // Preserve the selected service in the URL while landing at the section heading.
  // Let unrelated anchors and modified clicks retain their normal browser behavior.
  window.addEventListener("hashchange", () => {
    if (revealHashTarget()) scrollToServiceOverview();
  });
  window.addEventListener("load", () => {
    if (revealHashTarget()) scrollToServiceOverview();
  }, { once: true });
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const hash = link.getAttribute("href");
    if (!revealHashTarget(hash)) return;
    event.preventDefault();
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    scrollToServiceOverview(true);
  });

  // Native horizontal scrolling provides touch swiping; buttons never auto-advance.
  const reviewTrack = document.querySelector(".review-track");
  const reviewControls = document.querySelector(".review-controls");
  if (reviewTrack && reviewControls) {
    const reviews = Array.from(reviewTrack.querySelectorAll(".customer-review"));
    const previous = reviewControls.querySelector("[data-review-prev]");
    const next = reviewControls.querySelector("[data-review-next]");
    const position = reviewControls.querySelector(".review-position");
    let active = 0;
    let scrollFrame;
    function updateReviewControls() {
      const left = reviewTrack.getBoundingClientRect().left;
      active = reviews.reduce((nearest, review, index) =>
        Math.abs(review.getBoundingClientRect().left - left) <
        Math.abs(reviews[nearest].getBoundingClientRect().left - left) ? index : nearest, 0);
      previous.disabled = active === 0;
      next.disabled = active === reviews.length - 1;
      position.textContent = `${active + 1} of ${reviews.length}`;
    }
    function goToReview(index) {
      const bounded = Math.max(0, Math.min(index, reviews.length - 1));
      const offset = reviews[bounded].getBoundingClientRect().left - reviewTrack.getBoundingClientRect().left;
      reviewTrack.scrollBy({ left: offset, behavior: motionPreference.matches ? "instant" : "smooth" });
    }
    previous.addEventListener("click", () => goToReview(active - 1));
    next.addEventListener("click", () => goToReview(active + 1));
    reviewTrack.addEventListener("keydown", (event) => {
      if (event.target !== reviewTrack) return;
      const destination = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: reviews.length - 1 }[event.key];
      if (destination === undefined) return;
      event.preventDefault();
      goToReview(destination);
    });
    reviewTrack.addEventListener("scroll", () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(updateReviewControls);
    }, { passive: true });
    window.addEventListener("resize", updateReviewControls);
    reviewControls.hidden = false;
    updateReviewControls();
  }

  // Keep native details/summary semantics; animate the measured answer on both paths.
  document.querySelectorAll(".faq-item").forEach((item) => {
    const summary = item.querySelector("summary");
    let animation;
    let expanded = item.open;
    summary.addEventListener("click", (event) => {
      if (motionPreference.matches || !item.animate) return;
      event.preventDefault();
      const startHeight = item.getBoundingClientRect().height;
      animation?.cancel();
      expanded = !expanded;
      item.open = true;
      const targetHeight = expanded ? item.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
      animation = item.animate([{ height: `${startHeight}px` }, { height: `${targetHeight}px` }], {
        duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
      animation.onfinish = () => { item.open = expanded; animation = undefined; };
    });
    item.addEventListener("toggle", () => { if (!animation) expanded = item.open; });
    motionPreference.addEventListener("change", () => {
      if (!animation) return;
      animation.cancel(); animation = undefined; item.open = expanded;
    });
  });

  // Hamburger menu toggle.
  const hamburger = document.querySelector(".hamburger");
  const navLinksList = document.querySelector(".nav-links");
  if (hamburger && navLinksList) {
    function closeNavigation() {
      navLinksList.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Open navigation");
    }
    hamburger.addEventListener("click", function () {
      const expanded = navLinksList.classList.toggle("active");
      hamburger.setAttribute("aria-expanded", String(expanded));
      hamburger.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
    });
    navLinksList.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeNavigation();
        document.querySelectorAll(".nav-menu[open]").forEach((menu) => menu.removeAttribute("open"));
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openMenu = document.querySelector(".nav-menu[open]");
      if (openMenu) {
        openMenu.removeAttribute("open");
        openMenu.querySelector("summary")?.focus();
      } else if (navLinksList.classList.contains("active")) {
        closeNavigation();
        hamburger.focus();
      }
    });
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".nav-menu")) {
        document.querySelectorAll(".nav-menu[open]").forEach((menu) => menu.removeAttribute("open"));
      }
    });
  }
  updateOpenStatus();
  setInterval(updateOpenStatus, 60000);

  /* Highlight active nav link on scroll */
  const navLinks = Array.from(document.querySelectorAll(".nav-link"));
  const sections = Array.from(document.querySelectorAll("section[id]"));

  function handleActiveLink() {
    let currentSectionId = "";
    const headerHeight =
      parseInt(window.getComputedStyle(document.documentElement).getPropertyValue("--header-height"), 10) ||
      76;
    const tolerance = 10;

    sections.forEach((section) => {
      const sectionTop = section.getBoundingClientRect().top + window.scrollY - headerHeight - tolerance;
      const sectionHeight = section.offsetHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        currentSectionId = section.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", !!currentSectionId && link.getAttribute("href").includes(currentSectionId));
    });
  }

  window.addEventListener("scroll", function () {
    handleActiveLink();
  });

  handleActiveLink();

}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeMarketingPage, { once: true });
} else {
  initializeMarketingPage();
}
