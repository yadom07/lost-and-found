// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

import { 
  getAuth, 
  GoogleAuthProvider,
  OAuthProvider 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDjLN15lvKDEQRnGlL4pbYQmNNwq2wKlLc",
  authDomain: "campus-lost-found-af315.firebaseapp.com",
  projectId: "campus-lost-found-af315",
  storageBucket: "campus-lost-found-af315.appspot.com",
  messagingSenderId: "258087214040",
  appId: "1:258087214040:web:d2e611ef2abdcc367cf0ad",
  measurementId: "G-97TCJ0G4WY"
};

// Init app
const app = initializeApp(firebaseConfig);

// Export Firestore / Storage
export const db = getFirestore(app);
export const storage = getStorage(app);

// Export Auth
export const auth = getAuth(app);

// Google Provider
export const googleProvider = new GoogleAuthProvider();

// Microsoft Provider
export const microsoftProvider = new OAuthProvider("microsoft.com");
microsoftProvider.setCustomParameters({
  prompt: "select_account" // บังคับให้เลือกบัญชีใหม่ทุกครั้ง
});