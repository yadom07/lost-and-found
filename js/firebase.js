import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDjLN15lvKDEQRnGlL4pbYQmNNwq2wKlLc",
  authDomain: "campus-lost-found-af315.firebaseapp.com",
  projectId: "campus-lost-found-af315",
  storageBucket: "campus-lost-found-af315.appspot.com", 
  messagingSenderId: "258087214040",
  appId: "1:258087214040:web:d2e611ef2abdcc367cf0ad",
  measurementId: "G-97TCJ0G4WY"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);  
