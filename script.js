const CENTRAL_TIMEZONE = "America/Chicago";
const OPEN_MINUTE = 6 * 60;
const CLOSE_MINUTE = 1 * 60 + 30;

function centralTimeMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TIMEZONE,
    hour12: false,
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function updateOpenStatus() {
  const status = document.querySelector("[data-open-status]");
  if (!status) return;
  const now = centralTimeMinutes();
  const open = now >= OPEN_MINUTE || now < CLOSE_MINUTE;
  status.textContent = open ? "Open now" : "Closed now";
  status.classList.toggle("is-open", open);
  status.classList.toggle("is-closed", !open);
  status.parentElement?.querySelector(".status-dot")?.classList.toggle("is-closed", !open);
}

document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".header");
  const menuButton = document.querySelector(".hamburger");
  const menu = document.querySelector(".nav-links");
  const navLinks = Array.from(document.querySelectorAll(".nav-link[href^='#']"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  function closeMenu({ restoreFocus = false } = {}) {
    if (!menuButton || !menu) return;
    menu.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("nav-open");
    if (restoreFocus) menuButton.focus();
  }

  function toggleMenu() {
    if (!menuButton || !menu) return;
    const opening = menuButton.getAttribute("aria-expanded") !== "true";
    menu.classList.toggle("active", opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    document.body.classList.toggle("nav-open", opening);
    if (opening) menu.querySelector("a")?.focus();
  }

  menuButton?.addEventListener("click", toggleMenu);
  menu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.classList.contains("active")) closeMenu({ restoreFocus: true });
  });
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 861px)").matches) closeMenu();
  });

  function updateHeader() {
    header?.classList.toggle("header-condensed", window.scrollY > 70);
  }

  function updateActiveLink() {
    const offset = (header?.offsetHeight || 70) + 36;
    let current = "";
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top <= offset) current = section.id;
    });
    navLinks.forEach((link) => {
      const active = Boolean(current) && link.getAttribute("href") === `#${current}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateHeader();
      updateActiveLink();
      ticking = false;
    });
  }

  updateOpenStatus();
  window.setInterval(updateOpenStatus, 60_000);
  updateHeader();
  updateActiveLink();
  window.addEventListener("scroll", onScroll, { passive: true });
});
