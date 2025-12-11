// main.js

// ----- Imports -----
import { db, auth, microsoftProvider } from "./firebase.js";
import { 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ----- DOM Elements -----
const grid = document.getElementById("itemGrid");
const filterButtons = document.querySelectorAll(".chip");

const authButton = document.getElementById("authButton");
const postButton = document.getElementById("postButton");

// =======================
//   AUTH / LOGIN LOGIC
// =======================

// ปรับ UI ตามสถานะ user
function updateAuthUI(user) {
  if (user) {
    const name = user.displayName || user.email || "User";
    authButton.textContent = name.split(" ")[0]; // โชว์ชื่อสั้น ๆ เช่น Bank
    postButton.disabled = false;
    postButton.style.opacity = "1";
  } else {
    authButton.textContent = "Sign in";
    postButton.disabled = true;
    postButton.style.opacity = "0.5";
  }
}

// ฟังสถานะ auth
onAuthStateChanged(auth, (user) => {
  updateAuthUI(user);
});

// คลิกปุ่มล็อกอิน / ออกจากระบบ
authButton.addEventListener("click", async () => {
  if (auth.currentUser) {
    // ถ้าล็อกอินอยู่ → ออกจากระบบ
    const ok = confirm("ต้องการออกจากระบบหรือไม่?");
    if (!ok) return;

    try {
      await signOut(auth);
      alert("ออกจากระบบเรียบร้อย");
    } catch (err) {
      console.error(err);
      alert("ออกจากระบบไม่สำเร็จ");
    }
  } else {
    // ถ้ายังไม่ล็อกอิน → ล็อกอินด้วย Microsoft
    try {
      await signInWithPopup(auth, microsoftProvider);
      alert("เข้าสู่ระบบด้วย Microsoft สำเร็จ");
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถล็อกอินด้วย Microsoft ได้");
    }
  }
});

// =======================
//   LOAD POSTS / FILTER
// =======================

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

// เปลี่ยน filter Lost / Found
filterButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    loadPosts(btn.dataset.filter);
  });
});

// โหลด Lost เป็นค่าเริ่มต้น
loadPosts("lost");