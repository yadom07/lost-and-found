import "./bg-rotator.js";

const LOGOS = [
  "https://kmuttworks.com/assets/kmuttworks/kmutt-logo.png",
  "https://www.cpe.kmutt.ac.th/static/images/logo.svg",
  "https://img5.pic.in.th/file/secure-sv1/CPE101_I16_LOST__FOUND.png",
];

const INTERVAL_MS = 5000;
const FADE_MS = 600;

const img = document.getElementById("brandLogo");
if (img) {
  let idx = 0;

  img.style.transition = `opacity ${FADE_MS}ms ease`;

  // preload
  LOGOS.forEach((src) => (new Image().src = src));

  img.src = LOGOS[idx];

  setInterval(() => {
    img.style.opacity = "0";

    setTimeout(() => {
      idx = (idx + 1) % LOGOS.length;
      img.src = LOGOS[idx];
      img.style.opacity = "1";
    }, FADE_MS);
  }, INTERVAL_MS);
}