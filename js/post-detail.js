import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

async function load() {
  const snap = await getDoc(doc(db, "posts", id));
  if (!snap.exists()) return;

  const post = snap.data();

  document.getElementById("itemTitle").innerText = post.title;
  document.getElementById("itemMeta").innerText =
    post.location + " • " + new Date(post.createdAt.seconds * 1000).toLocaleString();
  document.getElementById("itemDescription").innerText = post.description;

  if (post.imageUrl) {
    const imgDiv = document.getElementById("itemImage");
    imgDiv.style.backgroundImage = `url('${post.imageUrl}')`;
    imgDiv.style.backgroundSize = "cover";
    imgDiv.style.backgroundPosition = "center";
    imgDiv.style.width = "100%";
    imgDiv.style.height = "300px";
    imgDiv.classList.remove("placeholder");
  }

  // แสดงแผนที่
  const DEFAULT_LAT = 13.651021207238946;
  const DEFAULT_LNG = 100.49538731575014;

  let lat = DEFAULT_LAT;
  let lng = DEFAULT_LNG;

  if (post.location) {
    const parts = post.location.split(",").map(Number);
    if (!isNaN(parts[0]) && !isNaN(parts[1])) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  // สร้างแผนที่ด้วยค่า lat/lng ที่ได้ (ถ้าไม่มี location ก็จะเป็นค่า default)
  const map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // ถ้ามีพิกัดที่มาจาก post.location ให้ปักหมุด
  if (post.location) {
    L.marker([lat, lng]).addTo(map);
  }
}

load();