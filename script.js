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

$(document).ready(function () {
  var $header = $(".header");
  var headerExpanded =
    parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 120;
  var headerCondensed =
    parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height-condensed")) || 90;
  var shrinkThreshold = 60;

  function setHeaderHeight(value) {
    document.documentElement.style.setProperty("--header-height", value + "px");
  }

  function handleHeader() {
    if ($(window).scrollTop() > shrinkThreshold) {
      if (!$header.hasClass("header-condensed")) {
        $header.addClass("header-condensed");
        setHeaderHeight(headerCondensed);
      }
    } else {
      if ($header.hasClass("header-condensed")) {
        $header.removeClass("header-condensed");
        setHeaderHeight(headerExpanded);
      }
    }
  }
  setHeaderHeight(headerExpanded);

  // Hamburger menu toggle.
  $(".hamburger").on("click", function () {
    $(".nav-links").toggleClass("active");
  });
  updateOpenStatus();
  setInterval(updateOpenStatus, 60000);

  // FAQ closing animation for details elements.
  document.querySelectorAll(".faq-item").forEach((item) => {
    const summary = item.querySelector("summary");
    if (!summary) {
      return;
    }

    summary.addEventListener("click", (event) => {
      if (!item.hasAttribute("open")) {
        return;
      }

      if (item.classList.contains("is-closing")) {
        event.preventDefault();
        item.classList.remove("is-closing");
        return;
      }

      event.preventDefault();
      item.classList.add("is-closing");

      window.setTimeout(() => {
        item.removeAttribute("open");
        item.classList.remove("is-closing");
      }, 550);
    });
  });

  /* Highlight active nav link on scroll */
  const navLinks = $(".nav-link");
  const sections = $("section[id]");

  function handleActiveLink() {
    let currentSectionId = "";
    const headerHeight = parseInt(window.getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || headerExpanded;
    const tolerance = 10;

    sections.each(function () {
      const sectionTop = $(this).offset().top - headerHeight - tolerance;
      const sectionHeight = $(this).outerHeight();
      if ($(window).scrollTop() >= sectionTop && $(window).scrollTop() < sectionTop + sectionHeight) {
        currentSectionId = $(this).attr("id");
      }
    });

    navLinks.removeClass("active").each(function () {
      if ($(this).attr("href").includes(currentSectionId)) {
        $(this).addClass("active");
      }
    });
  }

  $(window).on("scroll", function () {
    handleHeader();
    handleActiveLink();
  });

  handleHeader();
  handleActiveLink();
});
