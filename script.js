/**
 * Simple form validation for the contact form.
 * Ensures that all required fields are filled out before submission.
 * The action is set to mailto: so it will open a user's email client.
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

const header = document.querySelector(".header");
const logoImg = document.getElementById("logo-img");

window.addEventListener("scroll", function () {
  if (window.scrollY > 50) {
    header.classList.add("shrunk");
    logoImg.classList.add("shrunk");
  } else {
    header.classList.remove("shrunk");
    logoImg.classList.remove("shrunk");
  }
});

/* 2. HIGHLIGHT ACTIVE NAV LINK ON SCROLL */
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section[id]");

window.addEventListener("scroll", function() {
  let currentSectionId = "";

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 80;  // offset for sticky header
    const sectionHeight = section.offsetHeight;
    if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
      currentSectionId = section.getAttribute("id");
    }
  });

  navLinks.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href").includes(currentSectionId)) {
      link.classList.add("active");
    }
  });
});