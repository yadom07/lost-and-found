import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");

async function loadPosts(filter = "lost") {
  const querySnapshot = await getDocs(collection(db, "posts"));
  grid.innerHTML = "";

  querySnapshot.forEach((doc) => {
    const post = doc.data();
    if (post.type !== filter) return;

    const createdTime = post.createdAt?.seconds
      ? timeAgo(post.createdAt.seconds * 1000)
      : "Unknown";

    const card = document.createElement("a");
    card.className = "item-card";
    card.href = "post-detail.html?id=" + doc.id;

    const img = post.imageUrl
      ? `<div class="item-image" style="
            background-image: url('${post.imageUrl}');
            background-size: cover;
            background-position: center;
            width: 100%;
            height: 180px;
            border-radius: 12px;
          "></div>`
      : `<div class="item-image placeholder" style="height:180px;"></div>`;

    card.innerHTML = `
      ${img}
      <div class="item-content">
        <div class="item-badge ${post.type}">
          ${post.type === "lost" ? "Lost" : "Found"}
        </div>
        <h3 class="item-title">${post.title}</h3>
        <p class="item-meta">${post.location} • ${createdTime}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

function timeAgo(time) {
  const diff = Date.now() - time;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + " mins ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + " hrs ago";
  return Math.floor(diff / 86400000) + " days ago";
}

filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadPosts(btn.dataset.filter);
  });
});

loadPosts("lost");
