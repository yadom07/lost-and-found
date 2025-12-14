// ./js/ui.js — shared topbar + user menu + username + avatar + logout + menu nav
import "./bg-rotator.js";

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

function pickNameFromEmail(email) {
  if (!email) return "User";
  return String(email).split("@")[0] || "User";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ✅ avatar */
function setAvatar(user) {
  const els = document.querySelectorAll(".user-avatar");
  const url = String(user?.photoURL || "").trim();

  els.forEach((el) => {
    if (!el) return;

    if (url) {
      el.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Avatar";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => { el.textContent = "👤"; };
      el.appendChild(img);
    } else {
      el.innerHTML = "👤";
    }
  });
}

function wireUserMenu() {
  const userBtn = document.getElementById("userBtn");
  const userMenu = document.getElementById("userMenu");
  if (!userBtn || !userMenu) return;

  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = userMenu.classList.toggle("open");
    userBtn.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", () => {
    userMenu.classList.remove("open");
    userBtn.setAttribute("aria-expanded", "false");
  });
}

function wireMenuNav() {
  document.querySelectorAll('[data-action="profile"]').forEach((btn) => {
    btn.addEventListener("click", () => (window.location.href = "profile.html"));
  });

  document.querySelectorAll('[data-action="my-posts"]').forEach((btn) => {
    btn.addEventListener("click", () => (window.location.href = "my-posts.html"));
  });
}

async function doLogout() {
  try { await signOut(auth); }
  catch (e) { console.warn("signOut failed:", e); }
  finally { window.location.replace("login.html"); }
}

function wireLogoutButtons() {
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutMenuBtn = document.getElementById("logoutMenuBtn");

  if (logoutBtn) logoutBtn.addEventListener("click", doLogout);
  if (logoutMenuBtn) logoutMenuBtn.addEventListener("click", doLogout);

  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener("click", doLogout);
  });
}

function toggleAuthButtons(isLoggedIn) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
}

/* ✅ Firestore health check: ถ้า rules บล็อก จะเห็น permission-denied ชัด */
async function healthCheckUserDoc(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    // ถ้าไม่มี doc → สร้างขั้นต่ำ (ช่วยกรณีสมัครด้วย Google แล้ว doc ว่าง)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email || "",
        fullName: user.displayName || "",
        photoURL: user.photoURL || "",
        provider: (user.providerData?.[0]?.providerId || "password"),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    return true;
  } catch (e) {
    console.warn("❌ Firestore users/{uid} access failed:", e?.code, e?.message, e);
    // ถ้าขึ้น permission-denied = Rules ยังไม่อนุญาต
    return false;
  }
}

async function loadDisplayName(user) {
  if (user?.displayName) return user.displayName;

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const u = snap.data();
      return u.fullName || u.displayName || u.name || pickNameFromEmail(user.email);
    }
  } catch (e) {
    console.warn("loadDisplayName failed:", e?.code, e?.message);
  }

  return pickNameFromEmail(user?.email);
}

wireUserMenu();
wireLogoutButtons();
wireMenuNav();

onAuthStateChanged(auth, async (user) => {
  toggleAuthButtons(!!user);

  if (!user) {
    setText("welcomeName", "User");
    setText("userNameTop", "User");
    setText("userName", "User");
    setAvatar(null);
    return;
  }

  // ✅ เช็คสิทธิ์อ่าน/เขียน users/{uid} ก่อน
  const ok = await healthCheckUserDoc(user);

  const name = await loadDisplayName(user);

  setText("welcomeName", name);
  setText("userNameTop", name);
  setText("userName", name);

  setAvatar(user);

  if (!ok) {
    // ไม่มี UI กลาง ๆ ให้โชว์ทุกหน้า เลยแจ้งใน console
    console.warn("⚠️ Please fix Firestore Rules: allow read/write users/{uid} for the signed-in user.");
  }
});