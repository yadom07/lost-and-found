// post-form.js
import { db } from "./firebase.js";  
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ใส่ API Key ของคุณ
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

function calculateImportanceScore(ai) {
  const valueWeight = {
    very_high: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.2
  }[ai.value_bucket] || 0.4;

  const categoryWeight = {
    phone: 1.0,
    smartphone: 1.0,
    electronics: 1.0,
    wallet: 0.9,
    documents: 1.0,
    bag: 0.6,
    book: 0.5,
    clothing: 0.4
  }[(ai.category || "").toLowerCase()] || 0.4;

  const docScore = ai.has_docs ? 1 : 0;
  const essentialScore = ai.is_essential ? 1 : 0;

  return Math.min(
    0.35 * valueWeight +
    0.25 * categoryWeight +
    0.20 * docScore +
    0.20 * essentialScore,
    1
  );
}


async function enrichWithAI({ title, description }) {
  try {
    const res = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    const ai = await res.json();

    const importanceScore = calculateImportanceScore(ai);

    return {
      aiCategory: ai.category,
      aiValueBucket: ai.value_bucket,
      aiDocs: ai.has_docs,
      aiEssential: ai.is_essential,
      importanceScore,
    };
  } catch {
    return {
      importanceScore: 0.4, // safe default
    };
  }
}


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

  const aiFields = await enrichWithAI({ title, description });
  // บันทึกข้อมูลลง Firestore
  await addDoc(collection(db, "posts"), {
    title,
    type,
    location,
    description,
    imageUrl,  // ถ้าไม่เลือกรูป = ""
    createdAt: serverTimestamp(),

    ...aiFields
  });

  alert("Post created!");
  window.location.href = "index.html";
});





/*// post-form.js
import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ImgBB API Key
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

async function fetchAIAnalysis(title, description) {
  try {
    const res = await fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    return await res.json();
  } catch (e) {
    console.error("AI server error:", e);
    return {
      category: "other",
      value_bucket: "medium",
      has_docs: false,
      is_essential: false,
    };
  }
}


function calculateImportanceScore(ai) {
  const category = (ai.category || "").toLowerCase();

  const valueWeight = {
    very_high: 1.0,
    high: 0.8,
    medium: 0.5,
    low: 0.2
  }[ai.value_bucket] || 0.4;

  const categoryWeight = {
    phone: 1.0,
    smartphone: 1.0,
    electronics: 1.0,

    wallet: 0.9,
    documents: 1.0,
    id: 1.0,

    bag: 0.6,
    backpack: 0.6,
    schoolbag: 0.6,

    book: 0.5,
    books: 0.5,
    textbook: 0.5,
    notebook: 0.5,
    stationery: 0.5,

    clothing: 0.4,
    bottle: 0.4,
    accessory: 0.4
  }[category] || 0.4;

  const docScore = ai.has_docs ? 1.0 : 0.0;
  const essentialScore = ai.is_essential ? 1.0 : 0.0;

  const score =
    0.35 * valueWeight +
    0.25 * categoryWeight +
    0.20 * docScore +
    0.20 * essentialScore;

  return Math.min(score, 1);
}



document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value;
  const file = document.getElementById("image").files[0];

  console.log("Submitting:", { title, type, location, description });

  let imageUrl = "";


  if (file) {
    const reader = new FileReader();
    const base64 = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64);

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    const uploadResult = await res.json();
    if (uploadResult.success) {
      imageUrl = uploadResult.data.url;
    } else {
      alert("Image upload failed.");
      console.error(uploadResult);
    }
  }


  const ai = await fetchAIAnalysis(title, description);
  console.log("AI Output:", ai);

  // Calculate importance
  const importanceScore = calculateImportanceScore(ai);
  console.log("Priority:", importanceScore);

  console.log("=== GPT RAW RESPONSE ===");
  console.log(ai);



  try {
    await addDoc(collection(db, "posts"), {
      title,
      type,
      location,
      description,
      imageUrl,
      createdAt: serverTimestamp(),

      // Save AI fields
      aiCategory: ai.category,
      aiValueBucket: ai.value_bucket,
      aiDocs: ai.has_docs,
      aiEssential: ai.is_essential,
      importanceScore,
    });

    alert("Post submitted successfully!");
    document.getElementById("postForm").reset();

  } catch (error) {
    console.error("Error saving post:", error);
    alert("Error saving post. Check console for details.");
  }
});*/

/*// post-form.js
import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ⚠️ ImgBB API Key
const IMGBB_API_KEY = "b52fa7a68decc010c1835f4bb6cbd2d0";

document
  .getElementById("postForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const type = document.getElementById("type").value;
    const location = document.getElementById("location").value;
    const description = document.getElementById("description").value;
    const file = document.getElementById("image").files[0];

    console.log("Submitting with data:", {
      title,
      type,
      location,
      description,
    });

    let imageUrl = "";

    // -------- Upload image (optional) --------
    if (file) {
      const reader = new FileReader();

      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () =>
          resolve(reader.result.split(",")[1]);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const formData = new FormData();
      formData.append("key", IMGBB_API_KEY);
      formData.append("image", base64);

      const res = await fetch(
        "https://api.imgbb.com/1/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.success) {
        imageUrl = data.data.url;
      } else {
        console.error("ImgBB upload failed:", data);
        alert("Upload image failed!");
        return;
      }
    }

    // -------- Save to Firestore --------
    await addDoc(collection(db, "posts"), {
      title,
      type,
      location,
      description,
      imageUrl, // empty string if no image
      createdAt: serverTimestamp(),
    });

    alert("Post created!");
    window.location.href = "index.html";
  });*/

