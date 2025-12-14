// ./js/bg-rotator.js
// Random rotating background for the whole site (CSS variables)
// Works with base.css pseudo-layers (body::before / body::after)

const BG_URLS = [
  "https://iadmission.kmutt.ac.th/images/shared/kmutt.jpeg",
  "https://media.licdn.com/dms/image/v2/D4D1BAQFgmrYvlG-aaQ/company-background_10000/company-background_10000/0/1655321602795/kmutt_cover?e=2147483647&v=beta&t=-oBC43DFebWSfi26PzBXVd2M-mrynn-vsAZREoFTFBw",
  "https://admission.kmutt.ac.th/stocks/discover_banner/c690x390/oa/ej/fr2xoaej6t/kmutt.png",
  "https://ene.kmutt.ac.th/wp-content/uploads/2019/01/49708661_309802466316862_8938973613344686080_n.jpg",
];

// เปลี่ยนได้ตามใจ
const INTERVAL_MS = 60000; 
const FADE_MS = 700;       // ต้องตรงกับ CSS --bg-fade-ms (ด้านล่าง)

function pickRandom(exceptUrl = "") {
  const list = BG_URLS.filter((u) => u && u !== exceptUrl);
  if (!list.length) return BG_URLS[0] || "";
  return list[Math.floor(Math.random() * list.length)];
}

function setVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function preload(url) {
  if (!url) return;
  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.src = url;
}

// ป้องกันรันซ้ำ (ถ้า import หลายจุด)
if (!window.__BG_ROTATOR_STARTED__) {
  window.__BG_ROTATOR_STARTED__ = true;

  const first = pickRandom("");
  const second = pickRandom(first);

  // preload ทั้งหมดกันกระพริบ
  BG_URLS.forEach(preload);

  // init layers
  setVar("--app-bg-layer-a-url", `url("${first}")`);
  setVar("--app-bg-layer-b-url", `url("${second}")`);
  setVar("--app-bg-layer-a-opacity", "1");
  setVar("--app-bg-layer-b-opacity", "0");
  setVar("--bg-fade-ms", `${FADE_MS}ms`);

  let active = "a";
  let current = first;

  setInterval(() => {
    const next = pickRandom(current);
    if (!next) return;

    preload(next);

    const inactive = active === "a" ? "b" : "a";

    // ตั้งรูปให้เลเยอร์ที่ซ่อนอยู่ก่อน แล้วค่อยเฟด
    setVar(`--app-bg-layer-${inactive}-url`, `url("${next}")`);

    // trigger fade swap
    setVar("--app-bg-layer-a-opacity", inactive === "a" ? "1" : "0");
    setVar("--app-bg-layer-b-opacity", inactive === "b" ? "1" : "0");

    active = inactive;
    current = next;
  }, INTERVAL_MS);
}