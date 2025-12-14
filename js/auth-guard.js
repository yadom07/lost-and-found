import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const PUBLIC_PAGES = ["login.html", "register.html"];
const currentPage = window.location.pathname.split("/").pop() || "index.html";

onAuthStateChanged(auth, (user) => {
  // ถ้ายังไม่ login และไม่ใช่หน้า public → เด้งไป login
  if (!user && !PUBLIC_PAGES.includes(currentPage)) {
    window.location.replace("login.html");
    return;
  }

  // ถ้า login แล้ว แต่ยังอยู่หน้า login / register → ส่งเข้า index
  if (user && PUBLIC_PAGES.includes(currentPage)) {
    window.location.replace("index.html");
  }
});