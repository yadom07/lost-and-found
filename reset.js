import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from
  "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const emailInput = document.getElementById("email");
const emailError = document.getElementById("emailError");
const goRegisterBtn = document.getElementById("goRegisterBtn");

function setError(message) {
  if (emailInput) emailInput.classList.add("invalid");
  if (emailError) {
    emailError.textContent = message || "";
    emailError.style.color = "var(--lost)";
  }
}

function setSuccess(message) {
  if (emailInput) emailInput.classList.remove("invalid");
  if (emailError) {
    emailError.textContent = message || "";
    emailError.style.color = "var(--found)";
  }
}

function hideRegisterCTA() {
  if (goRegisterBtn) goRegisterBtn.style.display = "none";
}

function showRegisterCTA() {
  if (goRegisterBtn) goRegisterBtn.style.display = "block";
}

if (goRegisterBtn) {
  goRegisterBtn.addEventListener("click", () => {
    window.location.href = "register.html";
  });
}

if (emailInput) {
  emailInput.addEventListener("input", () => {
    // พอพิมพ์ใหม่ ล้าง error + ซ่อนปุ่มไป register
    if (emailInput) emailInput.classList.remove("invalid");
    if (emailError) emailError.textContent = "";
    hideRegisterCTA();
  });
}

document.getElementById("resetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideRegisterCTA();

  const email = (emailInput?.value || "").trim();

  if (!email) {
    setError("Please enter your email.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    setSuccess("Password reset email sent. Please check your inbox.");
  } catch (err) {
    const code = err?.code || "";

    // ✅ ถ้ายังไม่เคยลงทะเบียน: แจ้งเตือน + โชว์ปุ่มไป register
    if (code === "auth/user-not-found") {
      setError("This email is not registered yet.");
      showRegisterCTA();
      return;
    }

    // อีเมลรูปแบบไม่ถูกต้อง
    if (code === "auth/invalid-email") {
      setError("Invalid email format.");
      return;
    }

    setError("Failed to send reset email. Please try again.");
  }
});