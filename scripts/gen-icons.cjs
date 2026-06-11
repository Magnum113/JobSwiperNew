// Generates the PNG app icons from the brand logo glyph:
//   - src/app/apple-icon.png   (180x180, Next adds <link rel="apple-touch-icon">)
//   - public/icon-192.png      (PWA manifest)
//   - public/icon-512.png      (PWA manifest, maskable)
// Full-bleed brand gradient background (iOS/Android mask the corners themselves),
// white flame glyph centered. Re-run after a brand change: node scripts/gen-icons.cjs
const sharp = require("sharp");
const path = require("node:path");

// 512 master design: full-bleed brand square + the white flame glyph,
// reusing the exact glyph path/transform from public/jobswiper-logo-icon.svg.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="brand" x1="56" y1="96" x2="456" y2="416" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6C4AF1"/>
      <stop offset="1" stop-color="#C33DBD"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#brand)"/>
  <g transform="translate(156 132) scale(8.3333)" fill="rgba(255,255,255,0.30)" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>
  </g>
</svg>`;

const root = path.join(__dirname, "..");
const targets = [
  { size: 180, out: path.join(root, "src", "app", "apple-icon.png") },
  { size: 192, out: path.join(root, "public", "icon-192.png") },
  { size: 512, out: path.join(root, "public", "icon-512.png") },
];

Promise.all(
  targets.map(({ size, out }) =>
    sharp(Buffer.from(svg), { density: 144 })
      .resize(size, size)
      .png()
      .toFile(out)
      .then(() => console.log("wrote", out)),
  ),
).catch((err) => {
  console.error(err);
  process.exit(1);
});
