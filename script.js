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
  var $logo = $("#logo-img");

  // Helper function to initialize header/logo resizing.
  function initHeader() {
    var initialLogoHeight = $logo.height();
    var minLogoHeight = 80;
    var initialHeaderHeight = $header.outerHeight();
    var headerPadding = initialHeaderHeight - initialLogoHeight;
    var maxScroll = 200;

    $(window).on("scroll", function () {
      var scrollTop = $(this).scrollTop();
      var factor = Math.min(scrollTop / maxScroll, 1);
      var newLogoHeight = initialLogoHeight - factor * (initialLogoHeight - minLogoHeight);
      var newHeaderHeight = newLogoHeight + headerPadding;

      $logo.css("height", newLogoHeight + "px");
      $header.css("height", newHeaderHeight + "px");
      document.documentElement.style.setProperty("--header-height", newHeaderHeight + "px");
    });
  }

  // Initialize header resize once logo is loaded.
  if ($logo[0].complete) {
    initHeader();
  } else {
    $logo.on("load", initHeader);
  }

  // Hamburger menu toggle.
  $(".hamburger").on("click", function () {
    $(".nav-links").toggleClass("active");
  });

  /* Highlight active nav link on scroll */
  const navLinks = $(".nav-link");
  const sections = $("section[id]");

  $(window).on("scroll", function () {
    let currentSectionId = "";
    // Retrieve the dynamic header height from the CSS variable.
    const headerHeight = parseInt(window.getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
    const tolerance = 10; // Tolerance offset in pixels
    
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
  });
});