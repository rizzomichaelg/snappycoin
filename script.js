/**
 * Simple form validation for the contact form.
 * Ensures that all required fields are filled out before submission.
 */

function validateForm() {
  const nameField = document.getElementById("name");
  const emailField = document.getElementById("email");
  const messageField = document.getElementById("message");

  // Basic validations
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

  // If all checks pass, allow form submission
  return true;
}