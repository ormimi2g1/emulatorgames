// Renders public/icons/icon.svg into the PNG sizes the PWA manifest needs.
// Usage: node scripts/make-icons.mjs
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname;
const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
const page = await browser.newPage();
const shots = [
  ['icon-192.png', 192, 0, 'transparent'],
  ['icon-512.png', 512, 0, 'transparent'],
  ['icon-maskable-512.png', 512, 0.12, '#101936'],
  ['apple-touch-icon.png', 180, 0.06, '#101936'],
];
for (const [name, size, pad, bg] of shots) {
  const inner = Math.round(size * (1 - pad * 2));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  );
  await page.screenshot({ path: out(name), omitBackground: bg === 'transparent' });
}
await browser.close();
console.log('icons written');
