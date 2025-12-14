import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

/* ---------------- DOM ---------------- */
const titleEl = document.getElementById("itemTitle");
const metaEl = document.getElementById("itemMeta");
const descEl = document.getElementById("itemDescription");
const badgeEl = document.getElementById("itemBadge");
const imgDiv = document.getElementById("itemImage");

const postedByVal = document.getElementById("postedByVal");
const postTimeVal = document.getElementById("postTimeVal");
const contactVal = document.getElementById("contactVal");

const coordsTextEl = document.getElementById("coordsText");
const openMapsBtn = document.getElementById("openMapsBtn");
const priorityPill = document.getElementById("priorityPill");

/* ---------------- config ---------------- */
const FALLBACK_IMAGE_URL =
  "https://img5.pic.in.th/file/secure-sv1/CPE101_I16_LOST__FOUND.png";

/* ---------------- helpers ---------------- */
function setText(el, v) {
  if (!el) return;
  el.textContent = v ?? "";
}

function setNode(el, node) {
  if (!el) return;
  el.innerHTML = "";
  if (node) el.appendChild(node);
  else el.textContent = "-";
}

function timestampToDate(v) {
  try {
    if (v?.toDate) return v.toDate();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  } catch {}
  return null;
}

function formatBangkok(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Bangkok",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function parseLatLngFromLocation(locationStr) {
  const s = String(locationStr || "");
  if (!s.includes(",")) return null;

  const parts = s.split(",").map((x) => Number(String(x).trim()));
  if (parts.length < 2) return null;

  const lat = parts[0], lng = parts[1];
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

function setPriorityPill(score) {
  if (!priorityPill) return;

  const n = typeof score === "number" ? score : Number(score);
  const val = Number.isFinite(n) ? n : 0;

  priorityPill.classList.remove("high", "mid", "low");

  if (val >= 0.64) {
    priorityPill.classList.add("high");
    priorityPill.textContent = "🔥 High Priority";
  } else if (val >= 0.3) {
    priorityPill.classList.add("mid");
    priorityPill.textContent = "⚠️ Medium Priority";
  } else {
    priorityPill.classList.add("low");
    priorityPill.textContent = "Low Priority";
  }
}

function titleCase(s) {
  return String(s || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildContactNode(method, value) {
  const m = String(method || "").trim().toLowerCase();
  const v = String(value || "").trim();
  if (!v) return null;

  if (m === "email" || v.includes("@")) {
    const a = document.createElement("a");
    a.href = `mailto:${v}`;
    a.textContent = v;
    return a;
  }

  if (m === "phone" || /^[0-9+\-\s]{7,}$/.test(v)) {
    const cleaned = v.replace(/\s|-/g, "");
    const a = document.createElement("a");
    a.href = `tel:${cleaned}`;
    a.textContent = v;
    return a;
  }

  if (m === "line") {
    const a = document.createElement("a");
    const lineId = v.startsWith("@") ? v.slice(1) : v;
    a.href = `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = v;
    return a;
  }

  if (m === "instagram") {
    const handle = v.startsWith("@") ? v.slice(1) : v;
    const a = document.createElement("a");
    a.href = `https://instagram.com/${encodeURIComponent(handle)}`;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = v;
    return a;
  }

  if (m === "facebook") {
    if (/^https?:\/\/\S+/i.test(v)) {
      const a = document.createElement("a");
      a.href = v;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.textContent = v;
      return a;
    }
    return document.createTextNode(v);
  }

  if (/^https?:\/\/\S+/i.test(v)) {
    const a = document.createElement("a");
    a.href = v;
    a.target = "_blank";
    a.rel = "noreferrer";
    a.textContent = v;
    return a;
  }

  return document.createTextNode(v);
}

/* ---------------- image (สำคัญ) ---------------- */
function applyDetailImage(url) {
  if (!imgDiv) return;

  const realUrl = String(url || "").trim();
  const useFallback = !realUrl;

  imgDiv.style.backgroundImage = `url('${useFallback ? FALLBACK_IMAGE_URL : realUrl}')`;

  // ✅ ถ้าไม่มีรูป: ใส่คลาส logo-fallback เพื่อใช้ contain + bg white
  imgDiv.classList.toggle("logo-fallback", useFallback);

  // เก็บ placeholder ไว้หรือถอดก็ได้ แต่กันสับสน: ถ้ามีรูปแล้วให้ถอด
  imgDiv.classList.toggle("placeholder", useFallback);
}

/* ---------------- map ---------------- */
function renderMap(post) {
  const DEFAULT_LAT = 13.651021207238946;
  const DEFAULT_LNG = 100.49538731575014;

  let lat = DEFAULT_LAT;
  let lng = DEFAULT_LNG;

  const parsed = parseLatLngFromLocation(post.location);
  if (parsed) {
    lat = parsed.lat;
    lng = parsed.lng;
  }

  if (coordsTextEl) coordsTextEl.textContent = parsed ? `${lat}, ${lng}` : "-";

  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  if (parsed) L.marker([lat, lng]).addTo(map);

  setTimeout(() => map.invalidateSize(), 200);

  if (openMapsBtn) {
    openMapsBtn.onclick = () => {
      const q = parsed ? `${lat},${lng}` : String(post.location || "");
      const url = `https://www.google.com/maps?q=${encodeURIComponent(q)}`;
      window.open(url, "_blank", "noreferrer");
    };
  }
}

/* ---------------- main load ---------------- */
async function load() {
  if (!id) {
    setText(titleEl, "Not found");
    setText(descEl, "Missing post id.");
    if (metaEl) metaEl.style.display = "none";
    setText(postedByVal, "-");
    setText(postTimeVal, "-");
    setText(contactVal, "-");
    applyDetailImage(""); // fallback
    return;
  }

  const snap = await getDoc(doc(db, "posts", id));
  if (!snap.exists()) {
    setText(titleEl, "Not found");
    setText(descEl, "This post does not exist.");
    if (metaEl) metaEl.style.display = "none";
    setText(postedByVal, "-");
    setText(postTimeVal, "-");
    setText(contactVal, "-");
    applyDetailImage(""); // fallback
    return;
  }

  const post = snap.data();

  // Badge
  if (badgeEl) {
    const t = post.type || "lost";
    badgeEl.className = `item-badge ${t}`;
    badgeEl.textContent = String(t).toUpperCase();
  }

  // Title + description
  setText(titleEl, post.title || "Untitled");
  setText(descEl, post.description || "");

  // meta hidden
  if (metaEl) {
    metaEl.textContent = "";
    metaEl.style.display = "none";
  }

  // ✅ Image (no crop when fallback)
  applyDetailImage(post.imageUrl);

  // Priority pill
  setPriorityPill(post.importanceScore);

  // Posted by
  setText(postedByVal, post.posterName || "User");

  // Posted time
  let d = timestampToDate(post.createdAt);
  if (!d && typeof post.createdAtClientEpochMs === "number") d = new Date(post.createdAtClientEpochMs);
  if (!d && typeof post.createdAtClientISO === "string") {
    const t = Date.parse(post.createdAtClientISO);
    if (!Number.isNaN(t)) d = new Date(t);
  }

  const timeText =
    (d ? formatBangkok(d) : "") ||
    String(post.createdAtClientBangkok || "").trim() ||
    "-";

  setText(postTimeVal, timeText);

  // Contact
  const methodLabel = titleCase(post.contactMethod || "");
  const node = buildContactNode(post.contactMethod, post.contactValue);

  if (!node) {
    setText(contactVal, "Not provided");
  } else {
    if (methodLabel) {
      const wrap = document.createElement("span");
      const b = document.createElement("span");
      b.textContent = `${methodLabel}: `;
      b.style.fontWeight = "1000";
      wrap.appendChild(b);
      wrap.appendChild(node);
      setNode(contactVal, wrap);
    } else {
      setNode(contactVal, node);
    }
  }

  // Map
  renderMap(post);
}

load().catch((e) => {
  console.error(e);
  setText(titleEl, "Error");
  setText(descEl, "Failed to load post.");
  if (metaEl) metaEl.style.display = "none";
  setText(postedByVal, "-");
  setText(postTimeVal, "-");
  setText(contactVal, "-");
  applyDetailImage(""); // fallback
});