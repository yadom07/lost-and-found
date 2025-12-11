// post-form.js
import { db, auth } from "./firebase.js";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// ---------- IMGBB CONFIG ----------
// ใส่ API Key ของคุณ (ของจริงจากโค้ดก่อนหน้า)
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

// ---------- AUTH GUARD ----------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("กรุณาล็อกอินด้วยบัญชี Microsoft ก่อนสร้างโพสต์");
    window.location.href = "index.html";
  } else {
    // เก็บข้อมูล user ไว้ใช้ตอนบันทึกโพสต์
    window.currentUser = {
      uid: user.uid,
      name: user.displayName || "",
      email: user.email || ""
    };
  }
});

// ---------- MAP / LOCATION (Leaflet) ----------
const DEFAULT_LAT = 13.650823117723881;
const DEFAULT_LNG = 100.49388527870178;

const map = L.map("map").setView([DEFAULT_LAT, DEFAULT_LNG], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

let marker;

function setMarker(lat, lng) {
  if (marker) {
    map.removeLayer(marker);
  }
  marker = L.marker([lat, lng]).addTo(map);
  document.getElementById("location").value = `${lat}, ${lng}`;
}

// คลิกบนแผนที่เพื่อปักหมุด
map.on("click", function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;
  setMarker(lat, lng);
});

// ปุ่มใช้ตำแหน่งปัจจุบัน
const useCurrentLocationBtn = document.getElementById("useCurrentLocation");
useCurrentLocationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("เบราว์เซอร์ของคุณไม่รองรับการขอตำแหน่งปัจจุบัน");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMarker(lat, lng);
      map.setView([lat, lng], 17);
    },
    (err) => {
      console.error(err);
      alert("ไม่สามารถดึงตำแหน่งปัจจุบันได้");
    }
  );
});

// ---------- FORM SUBMIT ----------
const form = document.getElementById("postForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value.trim();
  const description = document.getElementById("description").value.trim();
  const file = document.getElementById("image").files[0];

  console.log("Submitting with data:", { title, type, location, description });

  try {
    let imageUrl = "";

    if (file) {
      // อ่านไฟล์เป็น Base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      // ส่งไปยัง ImgBB
      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64);

      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        imageUrl = data.data.url; // URL ของรูป
      } else {
        console.error("ImgBB upload failed:", data);
        alert("Upload image failed!");
      }
    }

    const userInfo = window.currentUser || {};

    // บันทึกข้อมูลลง Firestore
    await addDoc(collection(db, "posts"), {
      title,
      type,
      location,
      description,
      imageUrl, // ถ้าไม่เลือกรูป = ""
      createdAt: serverTimestamp(),
      userId: userInfo.uid || null,
      userName: userInfo.name || null,
      userEmail: userInfo.email || null,
    });

    alert("Post created!");
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาดในการบันทึกโพสต์");
  }
});