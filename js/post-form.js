import { db, storage } from "./firebase.js";  
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";  

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value;
  const description = document.getElementById("description").value;
  const fileInput = document.getElementById("image");
  const file = fileInput.files[0];  

  let imageUrl = "";  

  if (file) {
    const imageRef = ref(storage, "images/" + Date.now() + "_" + file.name);  
    await uploadBytes(imageRef, file);  
    imageUrl = await getDownloadURL(imageRef);  
  }

  await addDoc(collection(db, "posts"), {
    title,
    type,
    location,
    description,
    imageUrl,  
    createdAt: serverTimestamp()  
  });

  alert("โพสต์สำเร็จ!");
  window.location.href = "index.html";  
});
