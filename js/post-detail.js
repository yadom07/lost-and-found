import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");

async function loadPostDetails() {
  const postRef = doc(db, "posts", postId);
  const postSnap = await getDoc(postRef);

  if (postSnap.exists()) {
    const post = postSnap.data();

    document.getElementById("itemTitle").innerText = post.title;
    document.getElementById("itemMeta").innerText = `${post.location} • ${new Date(post.createdAt.seconds * 1000).toLocaleString()}`;
    document.getElementById("itemDescription").innerText = post.description;

    if (post.imageUrl) {
      const imageRef = ref(getStorage(), post.imageUrl);  
      const imageUrl = await getDownloadURL(imageRef);  
      const imageElement = document.getElementById("itemImage");  
      imageElement.style.backgroundImage = `url(${imageUrl})`;  
      imageElement.classList.remove("placeholder");  
    }
  }
}

loadPostDetails();
