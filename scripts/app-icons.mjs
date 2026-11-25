// Draws the app icon, the splash logo and the web's startup images from the
// Logo.tsx shapes, and renders them as PNG with Microsoft Edge (headless).
// The colours are copied from src/theme (metal, metalText, hero, background).
// Needs playwright-core, installed only for this, without touching
// package.json:
//
//   npm i --no-save playwright-core
//   node scripts/app-icons.mjs build dark public            # web icons (rename favicon/1024)
//   node scripts/app-icons.mjs glyph assets/images/splash-icon.png 600
//   node scripts/app-icons.mjs splash public/splash         # prints the <link> tags
//   node scripts/app-icons.mjs preview icon-options.png     # compare the colour options
//
// The icon chosen (Nov 2026) is 'dark': the steel logo on charcoal.
import { chromium } from 'playwright-core';

const METAL = { angle: 145, colors: ['#A9C6DC', '#7FA6C4', '#4A7192', '#96B8D2'], stops: [0, 0.4, 0.62, 1] };
const LIGHT_METAL = { angle: 170, colors: ['#A9C6DC', '#E4EEF5', '#7FA6C4'], stops: [0, 0.55, 1] };
const HERO = { angle: 150, colors: ['#5B7189', '#2E5573', '#35607F', '#6E93B3'], stops: [0, 0.38, 0.7, 1] };

const VARIANTS = {
  light: { bg: { solid: '#FAFAF9' }, logo: METAL, label: 'A · steel on white' },
  steel: { bg: { gradient: HERO }, logo: LIGHT_METAL, label: 'B · light steel on deep steel' },
  dark: { bg: { solid: '#121416' }, logo: METAL, label: 'C · steel on charcoal' },
};

const HEART =
  'M50 62.46 C41.04 56.06 35.92 50.94 35.92 45.18 C35.92 40.7 39.12 37.5 43.28 37.5 ' +
  'C46.16 37.5 48.4 39.1 50 41.66 C51.6 39.1 53.84 37.5 56.72 37.5 ' +
  'C60.88 37.5 64.08 40.7 64.08 45.18 C64.08 50.94 58.96 56.06 50 62.46 Z';

// Same maths as src/theme/gradient.ts (CSS angle → start/end in a box).
function points(angle, x, y, w, h) {
  const r = (angle * Math.PI) / 180;
  const dx = Math.sin(r);
  const dy = -Math.cos(r);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  return { x1: x + w / 2 - dx * half, y1: y + h / 2 - dy * half, x2: x + w / 2 + dx * half, y2: y + h / 2 + dy * half };
}

function gradient(id, g, x, y, w, h) {
  const p = points(g.angle, x, y, w, h);
  const stops = g.colors.map((c, i) => `<stop offset="${g.stops[i]}" stop-color="${c}"/>`).join('');
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p.x1}" y1="${p.y1}" x2="${p.x2}" y2="${p.y2}">${stops}</linearGradient>`;
}

// A square icon of `size` px; the logo is `scale` of its width, centred.
export function iconSvg(variant, size, scale = 0.72) {
  const v = VARIANTS[variant];
  const logoW = 100;
  const k = (size * scale) / logoW;
  const tx = (size - logoW * k) / 2;
  const ty = (size - 60 * k) / 2 - 20 * k;
  const bg = v.bg.solid
    ? `<rect width="${size}" height="${size}" fill="${v.bg.solid}"/>`
    : `<rect width="${size}" height="${size}" fill="url(#bg)"/>`;
  const defs = [
    v.bg.gradient ? gradient('bg', v.bg.gradient, 0, 0, size, size) : '',
    gradient('metal', v.logo, 0, 20, 100, 60),
  ].join('');
  const f = 'url(#metal)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>${defs}</defs>${bg}
<g transform="translate(${tx} ${ty}) scale(${k})">
<rect x="6" y="34" width="10" height="32" rx="5" fill="${f}"/>
<rect x="18" y="23" width="12" height="54" rx="6" fill="${f}"/>
<rect x="29" y="45.5" width="42" height="9" rx="4.5" fill="${f}"/>
<rect x="70" y="23" width="12" height="54" rx="6" fill="${f}"/>
<rect x="84" y="34" width="10" height="32" rx="5" fill="${f}"/>
<path d="${HEART}" fill="${f}"/>
</g></svg>`;
}

// The steel logo alone, `width` px wide (60% as tall), no background.
function logoOnly(width) {
  const f = 'url(#m)';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width * 0.6}" viewBox="0 20 100 60">
<defs>${gradient('m', METAL, 0, 20, 100, 60)}</defs>
<rect x="6" y="34" width="10" height="32" rx="5" fill="${f}"/>
<rect x="18" y="23" width="12" height="54" rx="6" fill="${f}"/>
<rect x="29" y="45.5" width="42" height="9" rx="4.5" fill="${f}"/>
<rect x="70" y="23" width="12" height="54" rx="6" fill="${f}"/>
<rect x="84" y="34" width="10" height="32" rx="5" fill="${f}"/>
<path d="${HEART}" fill="${f}"/></svg>`;
}

async function render(page, html, width, height, path) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
  await page.screenshot({ path, clip: { x: 0, y: 0, width, height } });
}

const [mode, ...args] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1 });

if (mode === 'preview') {
  const cell = (variant, wallpaper) => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px">
      <div style="width:180px;height:180px;border-radius:40px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.25)">${iconSvg(variant, 180)}</div>
      <div style="font:600 22px -apple-system,Segoe UI,sans-serif;color:${wallpaper === 'light' ? '#222' : '#fff'}">Pretty Strong</div>
    </div>`;
  const row = (wallpaper) => `
    <div style="display:flex;gap:70px;padding:50px 60px;background:${wallpaper === 'light' ? 'linear-gradient(135deg,#d9dfe6,#f2efe9)' : 'linear-gradient(135deg,#1b2430,#3a2f3f)'}">
      ${Object.keys(VARIANTS).map((v) => cell(v, wallpaper)).join('')}
    </div>`;
  const labels = `<div style="display:flex;gap:70px;padding:24px 60px;background:#fff">${Object.values(VARIANTS)
    .map((v) => `<div style="width:180px;text-align:center;font:600 20px Segoe UI,sans-serif;color:#222">${v.label}</div>`)
    .join('')}</div>`;
  await render(page, `${labels}${row('light')}${row('dark')}`, 780, 690, args[0]);
} else if (mode === 'build') {
  const [variant, outDir] = args;
  const out = [
    ['apple-touch-icon.png', 180, 0.72],
    ['icon-192.png', 192, 0.72],
    ['icon-512.png', 512, 0.72],
    // Android may crop this one to a circle: the logo stays in the middle 80%.
    ['icon-512-maskable.png', 512, 0.62],
    ['favicon-48.png', 48, 0.84],
    ['icon-1024.png', 1024, 0.72],
  ];
  for (const [name, size, scale] of out) {
    await render(page, iconSvg(variant, size, scale), size, size, `${outDir}/${name}`);
    console.log(name);
  }
} else if (mode === 'glyph') {
  // The logo alone on a transparent background (the native splash image).
  const [out, width] = args;
  const w = Number(width);
  const h = Math.round(w * 0.6);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${logoOnly(w)}</body></html>`,
  );
  await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  console.log(out);
} else if (mode === 'splash') {
  // iOS Home Screen startup images: the background with the logo 76 pt wide
  // in the middle, like the native splash (app.json). One per screen size.
  const [outDir] = args;
  const screens = [
    [440, 956, 3], [430, 932, 3], [428, 926, 3], [420, 912, 3], [414, 896, 3], [414, 896, 2],
    [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2], [360, 780, 3],
  ];
  const themes = { light: '#FAFAF9', dark: '#121416' };
  const links = [];
  for (const [w, h, dpr] of screens) {
    for (const [theme, bg] of Object.entries(themes)) {
      const pw = w * dpr;
      const ph = h * dpr;
      const logoW = 76 * dpr;
      const name = `splash-${pw}x${ph}-${theme}.png`;
      const html = `<div style="width:${pw}px;height:${ph}px;background:${bg};display:flex;align-items:center;justify-content:center">${logoOnly(logoW)}</div>`;
      await render(page, html, pw, ph, `${outDir}/${name}`);
      links.push(
        `<link rel="apple-touch-startup-image" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait) and (prefers-color-scheme: ${theme})" href="/splash/${name}" />`,
      );
    }
  }
  console.log(links.join('\n'));
}
await browser.close();
