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
  let defaultLat = 13.6517;
  let defaultLng = 100.4940;
  
  if (post.location) {
    const [lat, lng] = post.location.split(",").map(Number);
    const map = L.map('map').setView([lat, lng], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.marker([lat, lng]).addTo(map);
  }
}

load();

