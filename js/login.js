import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ---------------- helpers ---------------- */

function setFieldError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(errorId);

  if (input) input.classList.add("invalid");
  if (err) {
    err.textContent = message || "";
    err.style.color = "var(--lost)";
  }
}

function setFieldSuccess(errorId, message) {
  const err = document.getElementById(errorId);
  if (err) {
    err.textContent = message;
    err.style.color = "var(--found)";
  }
}

function clearFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(errorId);

  if (input) input.classList.remove("invalid");
  if (err) {
    err.textContent = "";
    err.style.color = "var(--lost)";
  }
}

function clearAllErrors() {
  clearFieldError("email", "emailError");
  clearFieldError("password", "passwordError");
}

function isInvalidCredential(err) {
  const code = err?.code || "";
  return (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  );
}

/* ---------------- clear error while typing ---------------- */
["email", "password"].forEach((id) => {
  const el = document.getElementById(id);
  if (!el) return;

  el.addEventListener("input", () => {
    if (id === "email") clearFieldError("email", "emailError");
    if (id === "password") clearFieldError("password", "passwordError");
  });
});

/* ---------------- Login ---------------- */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  let ok = true;

  if (!email) {
    setFieldError("email", "emailError", "Email is required.");
    ok = false;
  }

  if (!password) {
    setFieldError("password", "passwordError", "Password is required.");
    ok = false;
  }

  if (!ok) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (err) {
    if (isInvalidCredential(err)) {
      setFieldError("email", "emailError", "Invalid email or password.");
      setFieldError("password", "passwordError", "Invalid email or password.");
      return;
    }

    setFieldError("password", "passwordError", "Login failed. Please try again.");
  }
});

/* ---------------- Forgot Password ----------------
   ✅ กัน error: หน้า login ตอนนี้เป็น <a href="reset.html"> เลยอาจไม่มี #forgotPassword
   ถ้ามี id นี้ → จะ prefill email แล้วพาไป reset.html ให้
*/
const forgotEl = document.getElementById("forgotPassword");
if (forgotEl) {
  forgotEl.addEventListener("click", (e) => {
    e.preventDefault();
    clearAllErrors();

    const email = (document.getElementById("email")?.value || "").trim();
    const url = email ? `reset.html?email=${encodeURIComponent(email)}` : "reset.html";
    window.location.href = url;
  });
}

/* ---------------- Google Login ---------------- */
const googleBtn = document.getElementById("googleLogin");
if (googleBtn) {
  googleBtn.onclick = async () => {
    clearAllErrors();

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          fullName: user.displayName || "",
          email: user.email || "",
          provider: "google",
          createdAt: serverTimestamp()
        });
      }

      window.location.href = "index.html";
    } catch (err) {
      setFieldError(
        "password",
        "passwordError",
        "Google sign-in failed. Please try again."
      );
    }
  };
}