import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const PUBLIC_PAGES = ["login.html", "register.html"];
const currentPage = window.location.pathname.split("/").pop() || "index.html";

onAuthStateChanged(auth, (user) => {
  // ยังไม่ login และไม่ใช่หน้า public → เด้งไป login
  if (!user && !PUBLIC_PAGES.includes(currentPage)) {
    window.location.replace("login.html");
    return;
  }

  // ❌ ห้าม redirect หน้า login / register อัตโนมัติ
  // ให้ login.js / register.js redirect เอง
});
