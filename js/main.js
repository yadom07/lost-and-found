import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ---------------- DOM ---------------- */
const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

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
  if (!grid) return;
  grid.innerHTML = `<div class="card pad">${msg}</div>`;
}

/* ---------------- render ---------------- */

function renderPosts(list) {
  if (!grid) return;
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

    const badge = document.createElement("span");
    badge.className = `item-badge ${post.type || "lost"}`;
    badge.textContent = (post.type || "lost").toUpperCase();

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = post.title || "Untitled";

    const score = post.importanceScore ?? 0;
    const priority = document.createElement("div");
    priority.className = "priority-wrapper";
    if (score >= 0.64) priority.textContent = "🔥 High Priority";
    else if (score >= 0.3) priority.textContent = "⚠️ Medium Priority";
    else priority.textContent = "Low Priority";

    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = post.location || "";

    card.append(img, badge, title, priority, meta);
    grid.appendChild(card);
  }
}

/* ---------------- filter + search ---------------- */

function applyFilterAndSearch() {
  const q = normalizeText(activeQuery);

  const filtered = cachedPosts.filter(({ data }) => {
    const typeOk = activeFilter === "all" || data.type === activeFilter;
    return typeOk && matchesSearch(data, q);
  });

  renderPosts(filtered);
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
if (searchInput) {
  searchInput.oninput = (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      activeQuery = e.target.value;
      applyFilterAndSearch();
    }, 120);
  };
}

if (clearSearchBtn) {
  clearSearchBtn.onclick = () => {
    if (searchInput) searchInput.value = "";
    activeQuery = "";
    applyFilterAndSearch();
  };
}

/* ---------------- start ---------------- */
loadPostsOnce().catch(() => renderEmpty("Failed to load posts."));