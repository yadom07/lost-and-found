import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ✅ optional: if firebase.js exports auth we can use it
// If not present, the try/catch will fallback safely.
let auth = null;
try {
  const mod = await import("./firebase.js");
  auth = mod.auth || null;
} catch (_) {}

/* ---------------- DOM ---------------- */
const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

const welcomeNameEl = document.getElementById("welcomeName");
const userNameTopEl = document.getElementById("userNameTop");

let activeFilter = "all";
let activeQuery = "";
let cachedPosts = []; // { id, data }

/* ---------------- helpers ---------------- */

function getCreatedAtMs(post) {
  if (post?.createdAt?.seconds) return post.createdAt.seconds * 1000;
  if (typeof post?.createdAt?.toMillis === "function") return post.createdAt.toMillis();
  return 0;
}

function timeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return Math.floor(diff / 1000) + " secs ago";
  if (diff < 3600000) return Math.floor(diff / 60000) + " mins ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " hrs ago";
  return Math.floor(diff / 86400000) + " days ago";
}

function normalizeText(s) {
  return String(s || "").toLowerCase().trim();
}

function matchesSearch(post, q) {
  if (!q) return true;

  const title = normalizeText(post.title);
  const desc = normalizeText(post.description);
  const loc = normalizeText(post.location);

  return title.includes(q) || desc.includes(q) || loc.includes(q);
}

function renderEmpty(msg) {
  grid.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "card pad";
  empty.textContent = msg;
  grid.appendChild(empty);
}

function renderPosts(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    renderEmpty("No posts found.");
    return;
  }

  for (const item of list) {
  const { id, data: post } = item;
  const type = post.type || "lost";

  const card = document.createElement("div");
  card.className = "item-card";
  card.addEventListener("click", () => {
    window.location.href = `post-detail.html?id=${id}`;
  });

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
  badge.className = `item-badge ${type}`;
  badge.textContent = type === "lost" ? "Lost" : "Found";

  const title = document.createElement("div");
  title.className = "item-title";
  title.textContent = post.title || "Untitled";

  // 🔥 YOUR AI PRIORITY LOGIC (SAFE)
  const score = post.importanceScore ?? 0;
  const priority = document.createElement("div");
  priority.className = "priority-wrapper";

  if (score >= 0.64) {
    priority.innerHTML = `<span class="priority-badge high">🔥 High Priority</span>`;
  } else if (score >= 0.3) {
    priority.innerHTML = `<span class="priority-badge med">⚠️ Medium Priority</span>`;
  } else {
    priority.innerHTML = `<span class="priority-badge low">Low Priority</span>`;
  }

  const meta = document.createElement("div");
  meta.className = "item-meta";
  meta.textContent = post.location || "";

  content.appendChild(badge);
  content.appendChild(title);
  content.appendChild(priority); // ✅ here
  content.appendChild(meta);

  card.appendChild(img);
  card.appendChild(content);

  grid.appendChild(card);
}
}


function applyFilterAndSearch() {
  const q = normalizeText(activeQuery);

  const filtered = cachedPosts.filter(({ data }) => {
    const type = data.type || "lost";
    const typeOk = activeFilter === "all" ? true : type === activeFilter;
    const searchOk = matchesSearch(data, q);
    return typeOk && searchOk;
  });

  renderPosts(filtered);
}

/* ---------------- user name ---------------- */

function pickNameFromEmail(email) {
  if (!email) return "";
  const at = String(email).indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function setUserName(name) {
  const safe = (name && String(name).trim()) ? String(name).trim() : "User";
  if (welcomeNameEl) welcomeNameEl.textContent = safe;
  if (userNameTopEl) userNameTopEl.textContent = safe;
}

function loadUserName() {
  // 1) Firebase Auth (if available)
  try {
    const u = auth?.currentUser;
    if (u) {
      setUserName(u.displayName || pickNameFromEmail(u.email) || "User");
      return;
    }
  } catch (_) {}

  // 2) localStorage fallback (ให้คุณตั้งค่าไว้เองได้)
  const ls = localStorage.getItem("userName");
  if (ls) {
    setUserName(ls);
    return;
  }

  // 3) default
  setUserName("User");
}

/* ---------------- init data ---------------- */

function applyAIPriority(posts) {
  return posts.sort((a, b) => {
    const scoreA = a.data.importanceScore ?? 0;
    const scoreB = b.data.importanceScore ?? 0;
    return scoreB - scoreA;
  });
}

async function loadPostsOnce() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  cachedPosts = snapshot.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));
  cachedPosts = applyAIPriority(cachedPosts);

  applyFilterAndSearch();
}

/* ---------------- events ---------------- */

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    activeFilter = btn.dataset.filter || "all";
    applyFilterAndSearch();
  });
});

// debounce search
let t = null;
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const val = e.target.value || "";
    clearTimeout(t);
    t = setTimeout(() => {
      activeQuery = val;
      applyFilterAndSearch();
    }, 120);
  });
}

if (clearSearchBtn && searchInput) {
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    applyFilterAndSearch();
    searchInput.focus();
  });
}

/* ---------------- start ---------------- */
loadUserName();
loadPostsOnce().catch((err) => {
  console.error(err);
  renderEmpty("Failed to load posts.");

});
/*import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ✅ optional auth import (safe fallback)
let auth = null;
try {
  const mod = await import("./firebase.js");
  auth = mod.auth || null;
} catch (_) {}

// ---------------- DOM ---------------- 
const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const welcomeNameEl = document.getElementById("welcomeName");
const userNameTopEl = document.getElementById("userNameTop");

let activeFilter = "all";
let activeQuery = "";
let cachedPosts = []; // { id, data }

// ---------------- helpers ---------------- 
function getCreatedAtMs(post) {
  if (post?.createdAt?.seconds) return post.createdAt.seconds * 1000;
  if (typeof post?.createdAt?.toMillis === "function")
    return post.createdAt.toMillis();
  return 0;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return Math.floor(diff / 1000) + " secs ago";
  if (diff < 3600000) return Math.floor(diff / 60000) + " mins ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " hrs ago";
  return Math.floor(diff / 86400000) + " days ago";
}

function normalizeText(s) {
  return String(s || "").toLowerCase().trim();
}

function matchesSearch(post, q) {
  if (!q) return true;
  const title = normalizeText(post.title);
  const desc = normalizeText(post.description);
  const loc = normalizeText(post.location);
  return title.includes(q) || desc.includes(q) || loc.includes(q);
}

// ---------------- render ---------------- 
function renderEmpty(msg) {
  grid.innerHTML = "";
  const empty = document.createElement("div");
  empty.className = "card pad";
  empty.textContent = msg;
  grid.appendChild(empty);
}

function renderPosts(list) {
  grid.innerHTML = "";

  if (list.length === 0) {
    renderEmpty("No posts found.");
    return;
  }

  for (const item of list) {
    const { id, data: post } = item;
    const type = post.type || "lost";
    const createdAtMs = getCreatedAtMs(post);
    const createdTime = createdAtMs ? timeAgo(createdAtMs) : "";

    const card = document.createElement("div");
    card.className = "item-card";
    card.addEventListener("click", () => {
      window.location.href = `post-detail.html?id=${id}`;
    });

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
    badge.className = `item-badge ${type}`;
    badge.textContent = type === "lost" ? "Lost" : "Found";

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = post.title || "Untitled";

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${post.location || ""}${
      createdTime ? " • " + createdTime : ""
    }`;

    content.appendChild(badge);
    content.appendChild(title);
    content.appendChild(meta);

    card.appendChild(img);
    card.appendChild(content);
    grid.appendChild(card);
  }
}

function applyFilterAndSearch() {
  const q = normalizeText(activeQuery);

  const filtered = cachedPosts.filter(({ data }) => {
    const type = data.type || "lost";
    const typeOk =
      activeFilter === "all" ? true : type === activeFilter;
    const searchOk = matchesSearch(data, q);
    return typeOk && searchOk;
  });

  renderPosts(filtered);
}

// ---------------- user name ---------------- 
function pickNameFromEmail(email) {
  if (!email) return "";
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function setUserName(name) {
  const safe = name?.trim() || "User";
  if (welcomeNameEl) welcomeNameEl.textContent = safe;
  if (userNameTopEl) userNameTopEl.textContent = safe;
}

function loadUserName() {
  // 1) Firebase Auth
  try {
    const u = auth?.currentUser;
    if (u) {
      setUserName(
        u.displayName || pickNameFromEmail(u.email)
      );
      return;
    }
  } catch (_) {}

  // 2) localStorage fallback
  const ls = localStorage.getItem("userName");
  if (ls) {
    setUserName(ls);
    return;
  }

  // 3) default
  setUserName("User");
}

// ---------------- data ---------------- 
async function loadPostsOnce() {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  cachedPosts = snapshot.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));
  applyFilterAndSearch();
}

// ---------------- events ---------------- 
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) =>
      b.classList.remove("active")
    );
    btn.classList.add("active");
    activeFilter = btn.dataset.filter || "all";
    applyFilterAndSearch();
  });
});

// debounce search
let t = null;
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      activeQuery = e.target.value || "";
      applyFilterAndSearch();
    }, 120);
  });
}

if (clearSearchBtn && searchInput) {
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    activeQuery = "";
    applyFilterAndSearch();
    searchInput.focus();
  });
}

// ---------------- start ---------------- 
loadUserName();
loadPostsOnce().catch((err) => {
  console.error(err);
  renderEmpty("Failed to load posts.");
});*/


