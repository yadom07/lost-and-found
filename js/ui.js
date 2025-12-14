// js/ui.js — shared topbar + user menu + username + logout
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

function pickNameFromEmail(email) {
  if (!email) return "User";
  return String(email).split("@")[0] || "User";
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
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

async function loadDisplayName(user) {
  // 1) Prefer auth displayName
  if (user?.displayName) return user.displayName;

  // 2) Try Firestore users/{uid}
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const u = snap.data();
      return (
        u.fullName ||
        u.displayName ||
        u.name ||
        pickNameFromEmail(user.email)
      );
    }
  } catch (e) {
    console.warn("loadDisplayName failed:", e);
  }

  // 3) fallback
  return pickNameFromEmail(user?.email);
}

function wireLogoutButtons() {
  // ปุ่มที่มี id เดิม
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutMenuBtn = document.getElementById("logoutMenuBtn");

  if (logoutBtn) logoutBtn.addEventListener("click", () => signOut(auth));
  if (logoutMenuBtn) logoutMenuBtn.addEventListener("click", () => signOut(auth));

  // ปุ่มอื่น ๆ ที่อยากให้ logout เพิ่มได้ด้วย data-action="logout"
  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener("click", () => signOut(auth));
  });
}

function toggleAuthButtons(isLoggedIn) {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) loginBtn.style.display = isLoggedIn ? "none" : "inline-flex";
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-flex" : "none";
}

wireUserMenu();
wireLogoutButtons();

onAuthStateChanged(auth, async (user) => {
  toggleAuthButtons(!!user);

  if (!user) {
    setText("welcomeName", "User");
    setText("userNameTop", "User");
    setText("userName", "User");
    return;
  }

  const name = await loadDisplayName(user);
  setText("welcomeName", name);
  setText("userNameTop", name);
  setText("userName", name);
});