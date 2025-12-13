import { auth, db } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* Email / Password Login */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = email.value;
  const password = password.value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
});

/* Google Login */
document.getElementById("googleLogin").onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // create user doc if not exists
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(ref, {
        fullName: user.displayName,
        email: user.email,
        provider: "google",
        createdAt: serverTimestamp()
      });
    }

    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
};
