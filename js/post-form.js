// post-form.js
import { db } from "./firebase.js";  
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ใส่ API Key ของคุณ
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value;
  const file = document.getElementById("image").files[0];

  console.log("Submitting with data:", { title, type, location, description });

  let imageUrl = "";

  if (file) {
    // อ่านไฟล์เป็น Base64
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });

    // ส่งไปยัง ImgBB
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      imageUrl = data.data.url; // URL ของรูป
    } else {
      console.error("ImgBB upload failed:", data);
      alert("Upload image failed!");
    }
  }

  // บันทึกข้อมูลลง Firestore
  await addDoc(collection(db, "posts"), {
    title,
    type,
    location,
    description,
    imageUrl,  // ถ้าไม่เลือกรูป = ""
    createdAt: serverTimestamp()
  });

  alert("Post created!");
  window.location.href = "index.html";
});
