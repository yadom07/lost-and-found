import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

function safeText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value ?? "";
}

async function load() {
  if (!id) return;

  const snap = await getDoc(doc(db, "posts", id));
  if (!snap.exists()) return;

  const post = snap.data();

  safeText("itemTitle", post.title || "Untitled");
  safeText(
    "itemMeta",
    `${post.location || ""} • ${
      post.createdAt?.seconds ? new Date(post.createdAt.seconds * 1000).toLocaleString() : ""
    }`
  );
  safeText("itemDescription", post.description || "");

  const badgeEl = document.getElementById("itemBadge");
  if (badgeEl) {
    const t = post.type || "lost";
    badgeEl.className = `item-badge ${t}`;
    badgeEl.innerText = t.toUpperCase();
  }

  const imgDiv = document.getElementById("itemImage");
  if (imgDiv) {
    if (post.imageUrl) {
      imgDiv.style.backgroundImage = `url('${post.imageUrl}')`;
      imgDiv.classList.remove("placeholder");
    } else {
      imgDiv.classList.add("placeholder");
    }
  }

  // Map
  const DEFAULT_LAT = 13.651021207238946;
  const DEFAULT_LNG = 100.49538731575014;

  let lat = DEFAULT_LAT;
  let lng = DEFAULT_LNG;

  // คาดหวังรูปแบบ "lat, lng"
  if (typeof post.location === "string" && post.location.includes(",")) {
    const parts = post.location.split(",").map((x) => Number(String(x).trim()));
    if (!Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  const map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // ถ้ามีพิกัดจริง ค่อยปักหมุด
  if (lat !== DEFAULT_LAT || lng !== DEFAULT_LNG) {
    L.marker([lat, lng]).addTo(map);
  }

  setTimeout(() => map.invalidateSize(), 200);
}

load();