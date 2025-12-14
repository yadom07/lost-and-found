const LOGOS = [
  "https://kmuttworks.com/assets/kmuttworks/kmutt-logo.png",
  "https://www.cpe.kmutt.ac.th/static/images/logo.svg",
  "https://cdn.discordapp.com/attachments/1442576170464968714/1449460316424634398/CPE101_I16_LOST__FOUND.png?ex=693efa9d&is=693da91d&hm=a76a8c31f04b169308b856f064c14cf30b90be48acab8e2f54ffb46c81dfcb7e",
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