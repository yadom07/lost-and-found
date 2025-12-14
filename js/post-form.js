// ./js/post-form.js (REPLACE WHOLE FILE)
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ใส่ API Key ของคุณ
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

/* ---------------- helpers: redirect login (no alert) ---------------- */
function redirectToLogin() {
  const next = encodeURIComponent("post-form.html");
  window.location.replace(`login.html?next=${next}`);
}

/* ---------------- DOM ---------------- */
const posterNameInput = document.getElementById("posterName");
const posterNameError = document.getElementById("posterNameError");

const contactMethodEl = document.getElementById("contactMethod");
const contactMethodError = document.getElementById("contactMethodError");

const contactValueWrap = document.getElementById("contactValueWrap");
const contactValueLabel = document.getElementById("contactValueLabel");
const contactValueEl = document.getElementById("contactValue");
const contactValueError = document.getElementById("contactValueError");

/* ---------------- STATE ---------------- */
let currentUser = null;
let cachedPosterName = "";
let cachedProfile = {
  fullName: "",
  phone: "",
  facebook: "",
  instagram: "",
  lineId: "",
  email: ""
};

/* ---------------- helpers ---------------- */
function pickNameFromEmail(email) {
  if (!email) return "User";
  return String(email).split("@")[0] || "User";
}

function setErr(inputEl, errEl, msg) {
  if (inputEl) inputEl.classList.add("invalid");
  if (errEl) {
    errEl.textContent = msg || "";
    errEl.style.display = msg ? "block" : "none";
  }
}

function clearErr(inputEl, errEl) {
  if (inputEl) inputEl.classList.remove("invalid");
  if (errEl) {
    errEl.textContent = "";
    errEl.style.display = "none";
  }
}

function showContactValue() {
  if (contactValueWrap) contactValueWrap.classList.add("show");
}

function hideContactValue() {
  if (contactValueWrap) contactValueWrap.classList.remove("show");
  if (contactValueEl) contactValueEl.value = "";
}

/* ---------------- ensure + load profile from Firestore ---------------- */
async function ensureAndLoadUserDoc(user) {
  const ref = doc(db, "users", user.uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() || {};

    // ถ้าไม่มี doc → สร้างขั้นต่ำให้
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
  } catch (e) {
    console.warn("ensureAndLoadUserDoc failed:", e?.code, e?.message, e);

    if (String(e?.code || "") === "permission-denied") {
      setErr(
        posterNameInput,
        posterNameError,
        "Permission denied: Firestore rules block reading users/{uid}. Please publish correct Firestore Rules."
      );
    } else {
      setErr(
        posterNameInput,
        posterNameError,
        "Cannot load profile from database. Check console for details."
      );
    }
    return null;
  }
}

async function syncProfile(user) {
  cachedProfile.email = user?.email || "";

  // reset UI errors
  clearErr(posterNameInput, posterNameError);

  const u = await ensureAndLoadUserDoc(user);

  const fullName =
    user?.displayName ||
    u?.fullName ||
    u?.displayName ||
    u?.name ||
    pickNameFromEmail(user?.email);

  cachedPosterName = String(fullName || "").trim() || "User";

  cachedProfile.fullName = cachedPosterName;
  cachedProfile.phone = String(u?.phone || "").trim();
  cachedProfile.facebook = String(u?.facebook || "").trim();
  cachedProfile.instagram = String(u?.instagram || "").trim();
  cachedProfile.lineId = String(u?.lineId || u?.line || "").trim();

  if (posterNameInput) posterNameInput.value = cachedPosterName;

  if (contactMethodEl && contactMethodEl.value) {
    applyContactMethod(contactMethodEl.value);
  }
}

/* ---------------- contact method behavior ---------------- */
function methodMeta(method) {
  if (method === "facebook") return { label: "Facebook", placeholder: "Your Facebook (from profile)", key: "facebook" };
  if (method === "instagram") return { label: "Instagram", placeholder: "Your Instagram (from profile)", key: "instagram" };
  if (method === "line") return { label: "LINE", placeholder: "Your LINE ID (from profile)", key: "lineId" };
  if (method === "email") return { label: "Email", placeholder: "Your Email (from login)", key: "email" };
  if (method === "phone") return { label: "Phone", placeholder: "Your Phone (from profile)", key: "phone" };
  return null;
}

function applyContactMethod(method) {
  clearErr(contactMethodEl, contactMethodError);
  clearErr(contactValueEl, contactValueError);

  const meta = methodMeta(method);
  if (!meta) {
    hideContactValue();
    return;
  }

  const value = String(cachedProfile[meta.key] || "").trim();

  if (contactValueLabel) contactValueLabel.textContent = meta.label;
  if (contactValueEl) contactValueEl.placeholder = meta.placeholder;

  showContactValue();
  if (contactValueEl) contactValueEl.value = value;

  if (!value) {
    setErr(
      contactValueEl,
      contactValueError,
      `No ${meta.label} found in your registered profile. Please go to Profile and save it.`
    );
  }
}

if (contactMethodEl) {
  contactMethodEl.addEventListener("change", () => applyContactMethod(contactMethodEl.value));
}

/* ---------------- auth guard + init (NO ALERT) ---------------- */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    redirectToLogin();
    return;
  }

  currentUser = user;

  if (posterNameInput) posterNameInput.value = "Loading...";
  hideContactValue();

  await syncProfile(user);
});

/* ---------------- AI scoring ---------------- */
function calculateImportanceScore(ai) {
  const valueWeight = {
    very_high: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.2
  }[ai.value_bucket] || 0.4;

  const categoryWeight = {
    phone: 1.0,
    smartphone: 1.0,
    electronics: 1.0,
    wallet: 0.9,
    documents: 1.0,
    bag: 0.6,
    book: 0.5,
    clothing: 0.4
  }[(ai.category || "").toLowerCase()] || 0.4;

  const docScore = ai.has_docs ? 1 : 0;
  const essentialScore = ai.is_essential ? 1 : 0;

  return Math.min(
    0.35 * valueWeight +
    0.25 * categoryWeight +
    0.20 * docScore +
    0.20 * essentialScore,
    1
  );
}

async function enrichWithAI({ title, description }) {
  try {
    const res = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    const ai = await res.json();
    const importanceScore = calculateImportanceScore(ai);

    return {
      aiCategory: ai.category,
      aiValueBucket: ai.value_bucket,
      aiDocs: ai.has_docs,
      aiEssential: ai.is_essential,
      importanceScore,
    };
  } catch {
    return { importanceScore: 0.4 };
  }
}

/* ---------------- submit ---------------- */
document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    redirectToLogin();
    return;
  }

  const posterName = String(cachedPosterName || posterNameInput?.value || "").trim();
  if (!posterName) {
    setErr(posterNameInput, posterNameError, "Cannot load your profile name. Please re-login and try again.");
    return;
  }
  clearErr(posterNameInput, posterNameError);

  const contactMethod = String(contactMethodEl?.value || "").trim();
  if (!contactMethod) {
    setErr(contactMethodEl, contactMethodError, "Please select a contact method.");
    return;
  }
  clearErr(contactMethodEl, contactMethodError);

  const contactValue = String(contactValueEl?.value || "").trim();
  if (!contactValue) {
    setErr(contactValueEl, contactValueError, "This contact value is missing in your registered profile.");
    return;
  }
  clearErr(contactValueEl, contactValueError);

  const title = document.getElementById("title").value;
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value;
  const file = document.getElementById("image").files[0];

  let imageUrl = "";

  try {
    if (file) {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64);

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (data.success) imageUrl = data.data.url;
      else throw new Error("ImgBB upload failed");
    }

    const aiFields = await enrichWithAI({ title, description });

    const now = new Date();
    const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
    const tzOffsetMinutes = -now.getTimezoneOffset();
    const createdAtClientISO = now.toISOString();
    const createdAtClientEpochMs = now.getTime();
    const createdAtClientBangkok = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Bangkok"
    }).format(now);

    await addDoc(collection(db, "posts"), {
      title,
      type,
      location,
      description,
      imageUrl,

      createdAt: serverTimestamp(),

      createdAtClientISO,
      createdAtClientEpochMs,
      createdAtClientTimeZone: clientTimeZone,
      createdAtClientTzOffsetMinutes: tzOffsetMinutes,
      createdAtClientBangkok,

      posterUid: currentUser.uid,
      posterEmail: currentUser.email || "",
      posterName,

      contactMethod,
      contactValue,

      ...aiFields
    });

    alert("Post created!");
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("Create post failed. Please check console + Firestore rules.");
  }
});