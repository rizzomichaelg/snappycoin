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
