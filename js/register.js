import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

/* ---------- Email / Password Register ---------- */
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!firstName || !lastName) {
    alert("Please enter your full name");
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    const fullName = `${firstName} ${lastName}`;

    // set display name
    await updateProfile(user, {
      displayName: fullName,
    });

    // save user to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      fullName,
      firstName,
      lastName,
      email,
      provider: "password",
      createdAt: serverTimestamp(),
    });

    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
});

/* ---------- Google Register ---------- */
document.getElementById("googleRegister").onclick = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    await setDoc(
      doc(db, "users", user.uid),
      {
        uid: user.uid,
        fullName: user.displayName,
        email: user.email,
        provider: "google",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
};
