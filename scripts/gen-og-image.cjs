// One-off generator for the social-share (Open Graph / Twitter) image.
// Builds a 1200x630 branded card around the JobSwiper logo glyph and
// rasterizes it to PNG with sharp. Re-run if the brand or tagline changes.
const sharp = require("sharp");
const path = require("node:path");

const W = 1200;
const H = 630;

// Re-uses the exact logo from public/jobswiper-logo-icon.svg (512 viewBox):
// the rounded brand tile + the white flame glyph. Scaled/translated so the
// 200px-ish tile sits centered above the wordmark.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#faf7ff"/>
      <stop offset="1" stop-color="#f3fffb"/>
    </linearGradient>
    <linearGradient id="brand" x1="56" y1="96" x2="456" y2="416" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6C4AF1"/>
      <stop offset="1" stop-color="#C33DBD"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="1080" cy="90" r="220" fill="#6C4AF1" opacity="0.05"/>
  <circle cx="120" cy="560" r="200" fill="#C33DBD" opacity="0.05"/>

  <!-- Logo tile (the original 512 design scaled to ~190px, centered on x=600) -->
  <g transform="translate(490,78) scale(0.44)">
    <rect x="40" y="40" width="432" height="432" rx="136" fill="url(#brand)"/>
    <g transform="translate(156 132) scale(8.3333)" fill="rgba(255,255,255,0.30)" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>
    </g>
  </g>

  <text x="600" y="395" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="100" font-weight="800" fill="#17121f" letter-spacing="-1">JobSwiper</text>
  <text x="600" y="462" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="44" font-weight="600" fill="#5b4b6e">ИИ-подбор вакансий по резюме</text>
  <text x="600" y="528" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="30" font-weight="500" fill="#8a7b9e">Оценка совпадения и сопроводительное письмо от ИИ</text>
</svg>`;

const out = path.join(__dirname, "..", "src", "app", "opengraph-image.png");

sharp(Buffer.from(svg), { density: 144 })
  .resize(W, H)
  .png()
  .toFile(out)
  .then(() => console.log("wrote", out))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
