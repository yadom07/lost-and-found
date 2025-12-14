import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { KMUTT_FACULTIES } from "./kmutttcas.js";

/* ---------------- helpers ---------------- */

function $(id) {
  return document.getElementById(id);
}

function setErr(inputId, errId, msg) {
  const input = $(inputId);
  const err = $(errId);
  if (input) input.classList.add("invalid");
  if (err) {
    err.textContent = msg || "";
    err.style.color = "var(--lost)";
  }
}

function clearErr(inputId, errId) {
  const input = $(inputId);
  const err = $(errId);
  if (input) input.classList.remove("invalid");
  if (err) err.textContent = "";
}

function clearAll() {
  clearErr("firstName", "firstNameError");
  clearErr("lastName", "lastNameError");
  clearErr("email", "emailError");
  clearErr("phone", "phoneError");
  clearErr("password", "passwordError");
  clearErr("confirmPassword", "confirmPasswordError");
}

function pickInputValue(id) {
  return String($(id)?.value || "").trim();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\s|-/g, "").trim();
}

function isValidPhoneTHRequired(phone) {
  const p = normalizePhone(phone);
  if (!p) return false;
  return /^[0-9]{9,10}$/.test(p);
}

function mapFirebaseError(err) {
  const code = err?.code || "";
  if (code === "auth/email-already-in-use") return "This email is already registered.";
  if (code === "auth/invalid-email") return "Invalid email format.";
  if (code === "auth/weak-password") return "Password is too weak.";
  return "Register failed. Please try again.";
}

/* ---------------- dropdown: faculty + major ---------------- */

function resetMajors() {
  const dep = $("department");
  if (!dep) return;

  dep.innerHTML = `<option value="">Select major</option>`;
  dep.disabled = true;
}

function fillFaculties() {
  const fac = $("faculty");
  if (!fac) return;

  // กันซ้ำ: เคลียร์ แล้วใส่ใหม่
  fac.innerHTML = `<option value="">Select faculty</option>`;

  KMUTT_FACULTIES.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.nameTH; // ชื่ออังกฤษที่คุณตั้งไว้ใน kmutttcas.js
    fac.appendChild(opt);
  });
}

function fillMajorsByFacultyId(facultyId) {
  const dep = $("department");
  if (!dep) return;

  dep.innerHTML = `<option value="">Select major</option>`;

  const f = KMUTT_FACULTIES.find((x) => x.id === facultyId);
  if (!f) {
    dep.disabled = true;
    return;
  }

  f.majors.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nameTH; // ชื่ออังกฤษที่คุณตั้งไว้
    dep.appendChild(opt);
  });

  dep.disabled = false;
}

// init dropdowns
(function initFacultyMajorDropdowns() {
  fillFaculties();
  resetMajors();

  const fac = $("faculty");
  if (!fac) return;

  fac.addEventListener("change", () => {
    const v = fac.value;
    if (!v) {
      resetMajors();
      return;
    }
    fillMajorsByFacultyId(v);
  });
})();

/* ---------------- password policy (8 + upper + lower + number) ---------------- */

function hasUpper(s) { return /[A-Z]/.test(s); }
function hasLower(s) { return /[a-z]/.test(s); }
function hasNum(s) { return /[0-9]/.test(s); }

function setPolicyItem(id, ok) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle("good", !!ok);
  el.classList.toggle("bad", !ok);
}

function syncPolicyUI(pw) {
  const lenOk = (pw || "").length >= 8;
  const upperOk = hasUpper(pw);
  const lowerOk = hasLower(pw);
  const numOk = hasNum(pw);

  setPolicyItem("pLen", lenOk);
  setPolicyItem("pUpper", upperOk);
  setPolicyItem("pLower", lowerOk);
  setPolicyItem("pNum", numOk);

  return { lenOk, upperOk, lowerOk, numOk };
}

const pwEl = $("password");
if (pwEl) {
  syncPolicyUI(pwEl.value || "");
  pwEl.addEventListener("input", () => {
    syncPolicyUI(pwEl.value || "");
    clearErr("password", "passwordError");
  });
}

/* ---------------- clear while typing ---------------- */
["firstName","lastName","email","phone","confirmPassword"].forEach((id) => {
  const el = $(id);
  if (!el) return;
  el.addEventListener("input", () => {
    if (id === "firstName") clearErr("firstName","firstNameError");
    if (id === "lastName") clearErr("lastName","lastNameError");
    if (id === "email") clearErr("email","emailError");
    if (id === "phone") clearErr("phone","phoneError");
    if (id === "confirmPassword") clearErr("confirmPassword","confirmPasswordError");
  });
});

/* ---------- Email / Password Register ---------- */
$("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAll();

  const firstName = pickInputValue("firstName");
  const lastName = pickInputValue("lastName");
  const email = pickInputValue("email");

  const phoneRaw = pickInputValue("phone");
  const phone = normalizePhone(phoneRaw);

  const password = String($("password")?.value || "");
  const confirmPassword = String($("confirmPassword")?.value || "");

  // optional fields
  const faculty = pickInputValue("faculty");
  const department = pickInputValue("department");
  const year = pickInputValue("year");
  const contactPreference = pickInputValue("contactPreference");

  const facebook = pickInputValue("facebook");
  const instagram = pickInputValue("instagram");
  const lineId = pickInputValue("lineId");

  let ok = true;

  if (!firstName) { setErr("firstName","firstNameError","First name is required."); ok = false; }
  if (!lastName)  { setErr("lastName","lastNameError","Last name is required."); ok = false; }
  if (!email)     { setErr("email","emailError","Email is required."); ok = false; }

  if (!isValidPhoneTHRequired(phone)) {
    setErr("phone","phoneError","Phone is required (9-10 digits).");
    ok = false;
  }

  // password policy
  const pol = syncPolicyUI(password);
  if (!password) {
    setErr("password","passwordError","Password is required.");
    ok = false;
  } else {
    if (!pol.lenOk || !pol.upperOk || !pol.lowerOk || !pol.numOk) {
      setErr("password","passwordError","Password does not meet the requirements.");
      ok = false;
    }
  }

  if (!confirmPassword) {
    setErr("confirmPassword","confirmPasswordError","Please confirm your password.");
    ok = false;
  } else if (password !== confirmPassword) {
    setErr("confirmPassword","confirmPasswordError","Passwords do not match.");
    setErr("password","passwordError","Passwords do not match.");
    ok = false;
  }

  if (!ok) return;

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    const fullName = `${firstName} ${lastName}`.trim();
    await updateProfile(user, { displayName: fullName });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      fullName,
      firstName,
      lastName,
      email,

      phone, // required

      // optional
      faculty: faculty || "",
      department: department || "",
      year: year || "",
      contactPreference: contactPreference || "",

      facebook: facebook || "",
      instagram: instagram || "",
      lineId: lineId || "",

      provider: "password",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    window.location.href = "index.html";
  } catch (err) {
    const msg = mapFirebaseError(err);
    setErr("email", "emailError", msg);
  }
});

/* ---------- Google Register ---------- */
$("googleRegister").onclick = async () => {
  clearAll();

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        fullName: user.displayName || "",
        email: user.email || "",

        phone: "",

        faculty: "",
        department: "",
        year: "",
        contactPreference: "",

        facebook: "",
        instagram: "",
        lineId: "",

        provider: "google",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    window.location.href = "index.html";
  } catch (err) {
    setErr("email", "emailError", "Google sign-in failed. Please try again.");
  }
};