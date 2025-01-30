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

// Logo scroll animation
window.addEventListener('scroll', () => {
  const header = document.querySelector('.header');
  const logo = document.querySelector('.logo img');
  const scrollPos = window.scrollY;

  if (scrollPos > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Active section detection
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.getAttribute('id');
      const navLink = document.querySelector(`a[href="#${id}"]`);
      if (entry.isIntersecting) {
        navLink.classList.add('active');
      } else {
        navLink.classList.remove('active');
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('section[id]').forEach(section => {
    observer.observe(section);
  });
});

// Updated script.js
function smoothScrollTo(target) {
  const header = document.querySelector('.header');
  const targetElement = document.querySelector(target);
  if (!targetElement) return;

  const headerHeight = header.offsetHeight;
  const targetPosition = targetElement.offsetTop - headerHeight - 20;
  
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// Update navigation link click handlers
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = this.getAttribute('href');
    smoothScrollTo(target);
  });
});

// Update scroll padding when header changes
function updateScrollSettings() {
  const header = document.querySelector('.header');
  const headerHeight = header.offsetHeight;
  document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
}

// Event listeners
window.addEventListener('load', updateScrollSettings);
window.addEventListener('resize', updateScrollSettings);
window.addEventListener('scroll', updateScrollSettings); // Add scroll listener