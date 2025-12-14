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

/* ✅ Sort icon menu */
const sortBtn = document.getElementById("sortBtn");
const sortMenu = document.getElementById("sortMenu");

const sortHintEl = document.getElementById("sortHint");

const sortByButtons = Array.from(document.querySelectorAll("[data-sortby]"));
const sortDirButtons = Array.from(document.querySelectorAll("[data-sortdir]"));

const orderDescLabel = document.getElementById("orderDescLabel");
const orderAscLabel = document.getElementById("orderAscLabel");

/* ---------------- STATE ---------------- */
/* ✅ default: priority high -> low */
let activeFilter = "all";
let activeQuery = "";

let sortBy = "priority"; // priority | time
let sortDir = "desc";    // desc | asc

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

function getPostTimeMs(post) {
  if (post?.createdAt?.seconds) return post.createdAt.seconds * 1000;
  if (typeof post?.createdAtClientEpochMs === "number") return post.createdAtClientEpochMs;
  if (typeof post?.createdAtClientISO === "string") {
    const t = Date.parse(post.createdAtClientISO);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function getPriorityScore(post) {
  const s = post?.importanceScore;
  if (typeof s === "number") return s;
  return 0;
}

function updateOrderLabels() {
  if (!orderDescLabel || !orderAscLabel) return;

  if (sortBy === "time") {
    orderDescLabel.textContent = "Newest → Oldest";
    orderAscLabel.textContent = "Oldest → Newest";
    if (sortHintEl) sortHintEl.textContent = "Post time: newest → oldest";
  } else {
    orderDescLabel.textContent = "High → Low";
    orderAscLabel.textContent = "Low → High";
    if (sortHintEl) sortHintEl.textContent = "Priority: high → low";
  }
}

function comparePosts(a, b) {
  const A = a.data;
  const B = b.data;

  const dir = sortDir === "asc" ? 1 : -1;

  if (sortBy === "time") {
    const ta = getPostTimeMs(A);
    const tb = getPostTimeMs(B);
    if (ta !== tb) return (ta - tb) * dir;

    // tie-breaker: priority
    const pa = getPriorityScore(A);
    const pb = getPriorityScore(B);
    if (pa !== pb) return (pa - pb) * -1;

    return String(a.id).localeCompare(String(b.id));
  }

  // sortBy === "priority"
  const pa = getPriorityScore(A);
  const pb = getPriorityScore(B);
  if (pa !== pb) return (pa - pb) * dir;

  // tie-breaker: newest first when priority ties
  const ta = getPostTimeMs(A);
  const tb = getPostTimeMs(B);
  if (ta !== tb) return (ta - tb) * -1;

  return String(a.id).localeCompare(String(b.id));
}

/* ---------------- UI sync (✓ selected) ---------------- */

function syncSortUI() {
  // sortBy
  sortByButtons.forEach((btn) => {
    const v = btn.dataset.sortby;
    const selected = v === sortBy;
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-checked", String(selected));
  });

  // sortDir
  sortDirButtons.forEach((btn) => {
    const v = btn.dataset.sortdir;
    const selected = v === sortDir;
    btn.classList.toggle("selected", selected);
    btn.setAttribute("aria-checked", String(selected));
  });

  updateOrderLabels();
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

/* ---------------- filter + search + sort ---------------- */

function applyFilterSearchSort() {
  const q = normalizeText(activeQuery);

  const filtered = cachedPosts.filter(({ data }) => {
    const typeOk = activeFilter === "all" || data.type === activeFilter;
    return typeOk && matchesSearch(data, q);
  });

  filtered.sort(comparePosts);
  renderPosts(filtered);
}

/* ---------------- data ---------------- */

async function loadPostsOnce() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  cachedPosts = snap.docs.map((d) => ({
    id: d.id,
    data: d.data(),
  }));

  applyFilterSearchSort();
}

/* ---------------- events ---------------- */

filterButtons.forEach((btn) => {
  btn.onclick = () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    applyFilterSearchSort();
  };
});

let t;
if (searchInput) {
  searchInput.oninput = (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      activeQuery = e.target.value;
      applyFilterSearchSort();
    }, 120);
  };
}

if (clearSearchBtn) {
  clearSearchBtn.onclick = () => {
    if (searchInput) searchInput.value = "";
    activeQuery = "";
    applyFilterSearchSort();
  };
}

/* ✅ Sort dropdown open/close */
function closeSortMenu() {
  if (!sortMenu || !sortBtn) return;
  sortMenu.classList.remove("open");
  sortBtn.setAttribute("aria-expanded", "false");
}

function toggleSortMenu() {
  if (!sortMenu || !sortBtn) return;
  const open = sortMenu.classList.toggle("open");
  sortBtn.setAttribute("aria-expanded", String(open));
}

if (sortBtn && sortMenu) {
  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleSortMenu();
  });

  sortMenu.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => closeSortMenu());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSortMenu();
  });
}

/* ✅ Clickable color options */
sortByButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.sortby || "priority";
    sortBy = v;

    // keep current sortDir as-is, just update labels + UI
    syncSortUI();
    applyFilterSearchSort();
  });
});

sortDirButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.sortdir || "desc";
    sortDir = v;

    syncSortUI();
    applyFilterSearchSort();
  });
});

/* init UI */
syncSortUI();

/* ---------------- start ---------------- */
loadPostsOnce().catch(() => renderEmpty("Failed to load posts."));