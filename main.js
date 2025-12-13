import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

/* ---------------- DOM ---------------- */
const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

const welcomeNameEl = document.getElementById("welcomeName");
const userNameTopEl = document.getElementById("userNameTop");

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const logoutMenuBtn = document.getElementById("logoutMenuBtn");

/* ---------------- AUTH STATE ---------------- */

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    // 🔥 ดึงข้อมูล user จาก Firestore
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const u = snap.data();
        setUserName(u.displayName || pickNameFromEmail(user.email));
      } else {
        setUserName(pickNameFromEmail(user.email));
      }
    } catch (err) {
      console.error("Load user failed", err);
      setUserName(pickNameFromEmail(user.email));
    }

  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
    setUserName("User");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

if (logoutMenuBtn) {
  logoutMenuBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}

/* ---------------- STATE ---------------- */
let activeFilter = "all";
let activeQuery = "";
let cachedPosts = [];

/* ---------------- helpers ---------------- */

function normalizeText(s) {
  return String(s || "").toLowerCase().trim();
}

function matchesSearch(post, q) {
  if (!q) return true;
  return (
    normalizeText(post.title).includes(q) ||
    normalizeText(post.description).includes(q) ||
    normalizeText(post.location).includes(q)
  );
}

function renderEmpty(msg) {
  grid.innerHTML = `<div class="card pad">${msg}</div>`;
}

/* ---------------- render ---------------- */

function renderPosts(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    renderEmpty("No posts found.");
    return;
  }

  for (const item of list) {
    const { id, data: post } = item;

    const card = document.createElement("div");
    card.className = "item-card";
    card.onclick = () => {
      window.location.href = `post-detail.html?id=${id}`;
    };

    const img = document.createElement("div");
    img.className = "item-image";
    if (post.imageUrl) {
      img.style.backgroundImage = `url('${post.imageUrl}')`;
    } else {
      img.classList.add("placeholder");
    }

    const content = document.createElement("div");
    content.className = "item-content";

    const badge = document.createElement("span");
    badge.className = `item-badge ${post.type || "lost"}`;
    badge.textContent = post.type || "lost";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = post.title || "Untitled";

    const score = post.importanceScore ?? 0;
    const priority = document.createElement("div");
    priority.className = "priority-wrapper";

    if (score >= 0.64) priority.innerHTML = "🔥 High Priority";
    else if (score >= 0.3) priority.innerHTML = "⚠️ Medium Priority";
    else priority.innerHTML = "Low Priority";

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = post.location || "";

    content.append(badge, title, priority, meta);
    card.append(img, content);
    grid.appendChild(card);
  }
}

/* ---------------- filter + search ---------------- */

function applyFilterAndSearch() {
  const q = normalizeText(activeQuery);

  const filtered = cachedPosts.filter(({ data }) => {
    const typeOk =
      activeFilter === "all" || data.type === activeFilter;
    return typeOk && matchesSearch(data, q);
  });

  renderPosts(filtered);
}

/* ---------------- user name ---------------- */

function pickNameFromEmail(email) {
  if (!email) return "";
  return email.split("@")[0];
}

function setUserName(name) {
  const safe = name?.trim() || "User";
  if (welcomeNameEl) welcomeNameEl.textContent = safe;
  if (userNameTopEl) userNameTopEl.textContent = safe;
}

/* ---------------- data ---------------- */

function applyAIPriority(posts) {
  return posts.sort(
    (a, b) => (b.data.importanceScore ?? 0) - (a.data.importanceScore ?? 0)
  );
}

async function loadPostsOnce() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  cachedPosts = snap.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));

  cachedPosts = applyAIPriority(cachedPosts);
  applyFilterAndSearch();
}

/* ---------------- events ---------------- */

filterButtons.forEach((btn) => {
  btn.onclick = () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    applyFilterAndSearch();
  };
});

let t;
searchInput.oninput = (e) => {
  clearTimeout(t);
  t = setTimeout(() => {
    activeQuery = e.target.value;
    applyFilterAndSearch();
  }, 120);
};

clearSearchBtn.onclick = () => {
  searchInput.value = "";
  activeQuery = "";
  applyFilterAndSearch();
};

/* ---------------- start ---------------- */
loadPostsOnce().catch(() => renderEmpty("Failed to load posts."));
