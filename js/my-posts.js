import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const grid = document.getElementById("myPostGrid");

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

function renderPosts(list) {
  if (!grid) return;
  grid.innerHTML = "";

  if (!list.length) {
    renderEmpty("You have no posts yet.");
    return;
  }

  for (const item of list) {
    const { id, data: post } = item;

    const card = document.createElement("div");
    card.className = "item-card";
    card.onclick = () => { window.location.href = `post-detail.html?id=${id}`; };

    const img = document.createElement("div");
    img.className = "item-image";
    if (post.imageUrl) img.style.backgroundImage = `url('${post.imageUrl}')`;
    else img.classList.add("placeholder");

    const badge = document.createElement("span");
    badge.className = `item-badge ${post.type || "lost"}`;
    badge.textContent = (post.type || "lost").toUpperCase();

    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = post.title || "Untitled";

    const score = getPriorityScore(post);
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

async function loadMyPosts(uid) {
  try {
    const q = query(collection(db, "posts"), where("posterUid", "==", uid));
    const snap = await getDocs(q);

    const items = snap.docs.map((d) => ({ id: d.id, data: d.data() }));

    // client-side sort (กัน Firestore ต้องสร้าง index)
    items.sort((a, b) => getPostTimeMs(b.data) - getPostTimeMs(a.data));

    renderPosts(items);
  } catch (e) {
    console.error(e);
    renderEmpty("Failed to load posts.");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  await loadMyPosts(user.uid);
});