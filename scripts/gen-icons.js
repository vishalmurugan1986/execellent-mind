// Renders Excellent Mind's icon set from SVG. Run: npm i --no-save sharp && node scripts/gen-icons.js
const path = require('path');
const sharp = require('sharp');

const out = (f) => path.join(__dirname, '..', 'assets', 'images', f);

// Brainwave + sun spark, drawn on a 1024 canvas.
const mark = (scale = 1, wave = '#FFFFFF', sun = '#FF9F1C') => `
  <g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="M150 620 C240 620 262 420 350 420 C440 420 440 700 530 700 C620 700 620 330 710 330 C760 330 780 400 830 400"
      stroke="${wave}" stroke-width="88" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="800" cy="215" r="92" fill="${sun}"/>
  </g>`;

const bg = `
  <defs>
    <linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8B6BFF"/>
      <stop offset="1" stop-color="#4F2FE0"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#tile)"/>`;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`);

(async () => {
  await sharp(svg(bg + mark(0.8))).png().toFile(out('icon.png'));
  await sharp(svg(mark(0.56))).png().toFile(out('android-icon-foreground.png'));
  await sharp(svg(bg)).png().toFile(out('android-icon-background.png'));
  await sharp(svg(mark(0.56, '#FFFFFF', '#FFFFFF'))).png().toFile(out('android-icon-monochrome.png'));
  await sharp(svg(`<rect x="112" y="112" width="800" height="800" rx="240" fill="#6C47FF"/>` + mark(0.62))).resize(512, 512).png().toFile(out('splash-icon.png'));
  await sharp(svg(bg + mark(0.8))).resize(64, 64).png().toFile(out('favicon.png'));
  console.log('icons written');
})();
