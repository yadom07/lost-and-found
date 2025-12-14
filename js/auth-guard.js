import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const PUBLIC_PAGES = ["login.html", "register.html", "reset.html"];
const currentPage = window.location.pathname.split("/").pop() || "index.html";

function goLogin() {
  const next = encodeURIComponent(currentPage);
  window.location.replace(`login.html?next=${next}`);
}

onAuthStateChanged(auth, (user) => {
  if (!user && !PUBLIC_PAGES.includes(currentPage)) {
    goLogin();
  }
});