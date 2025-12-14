// ./js/profile.js (REPLACE WHOLE FILE)
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

function $(id) { return document.getElementById(id); }

function normalizePhone(phone) {
  return String(phone || "").replace(/\s|-/g, "").trim();
}
function isValidPhoneTHOptional(phone) {
  const p = normalizePhone(phone);
  if (!p) return true;
  return /^[0-9]{9,10}$/.test(p);
}

function setAvatarLarge(user) {
  const box = $("avatarLg");
  if (!box) return;

  const url = String(user?.photoURL || "").trim();
  if (!url) { box.textContent = "👤"; return; }

  box.innerHTML = "";
  const img = document.createElement("img");
  img.src = url;
  img.alt = "Avatar";
  img.referrerPolicy = "no-referrer";
  img.onerror = () => { box.textContent = "👤"; };
  box.appendChild(img);
}

function setMsg(text, ok = false) {
  const el = $("saveMsg");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("ok", !!ok);
  el.classList.toggle("field-error", !ok);
}

async function getUserDoc(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return { ref, snap };
}

// ✅ ถ้า doc ไม่เคยมี → สร้างให้เลย (กันกรณี register เขียนไม่สำเร็จ/คนสมัครแบบ google แล้ว doc ไม่ครบ)
async function ensureUserDoc(user) {
  const { ref, snap } = await getUserDoc(user.uid);

  if (snap.exists()) return snap.data() || {};

  const base = {
    uid: user.uid,
    email: user.email || "",
    fullName: user.displayName || "",
    phone: "",
    lineId: "",
    instagram: "",
    facebook: "",
    contactPreference: "",
    photoURL: user.photoURL || "",
    provider: (user.providerData?.[0]?.providerId || "password"),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, base, { merge: true });
  const snap2 = await getDoc(ref);
  return snap2.exists() ? (snap2.data() || {}) : base;
}

async function loadProfile(user) {
  $("profileName").textContent = user.displayName || "User";
  $("profileEmail").textContent = user.email || "-";
  setAvatarLarge(user);

  let u = {};
  try {
    // ✅ ดึงจาก Firestore (และสร้าง doc ถ้าหาย)
    u = await ensureUserDoc(user);
  } catch (e) {
    console.warn("load/ensure user doc failed:", e);
    setMsg("Cannot load profile from database. Please check Firestore rules.", false);
    u = {};
  }

  // ✅ map ค่า (เผื่อ doc เก่าชื่อ field ไม่เหมือน)
  const fullName = (u.fullName || user.displayName || "").trim();
  const phone = (u.phone || "").trim();
  const lineId = (u.lineId || u.line || "").trim();
  const instagram = (u.instagram || u.ig || "").trim();
  const facebook = (u.facebook || u.fb || "").trim();
  const contactPreference = (u.contactPreference || "").trim();

  $("fullName").value = fullName;
  $("phone").value = phone;
  $("lineId").value = lineId;
  $("instagram").value = instagram;
  $("facebook").value = facebook;
  $("contactPreference").value = contactPreference;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  await loadProfile(user);

  const form = $("profileForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setMsg("");

    const fullName = String($("fullName")?.value || "").trim();
    const phone = normalizePhone($("phone")?.value || "");
    const lineId = String($("lineId")?.value || "").trim();
    const instagram = String($("instagram")?.value || "").trim();
    const facebook = String($("facebook")?.value || "").trim();
    const contactPreference = String($("contactPreference")?.value || "").trim();

    if (phone && !isValidPhoneTHOptional(phone)) {
      setMsg("Phone must be 9-10 digits.");
      return;
    }

    try {
      if (fullName && fullName !== (user.displayName || "")) {
        await updateProfile(user, { displayName: fullName });
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          email: user.email || "",
          fullName: fullName || (user.displayName || ""),
          phone: phone || "",
          lineId: lineId || "",
          instagram: instagram || "",
          facebook: facebook || "",
          contactPreference: contactPreference || "",
          photoURL: user.photoURL || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      $("profileName").textContent = fullName || user.displayName || "User";
      setMsg("Saved successfully ✅", true);
    } catch (err) {
      console.error(err);
      setMsg("Save failed. Please check Firestore rules.", false);
    }
  });
});