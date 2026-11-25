// Copies EmulatorJS (GPL-3.0), the NES core and the SNES core into public/emulatorjs/data so the
// emulator is served by this app (no CDN). Run after updating the @emulatorjs packages:
//   node scripts/vendor-emulatorjs.mjs
import { cpSync, mkdirSync, rmSync, copyFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ejs = join(root, 'node_modules/@emulatorjs/emulatorjs');
const nes = join(root, 'node_modules/@emulatorjs/core-fceumm');
const snes = join(root, 'node_modules/@emulatorjs/core-snes9x');
const out = join(root, 'public/emulatorjs/data');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'cores/reports'), { recursive: true });
for (const f of ['loader.js', 'emulator.css', 'version.json']) copyFileSync(join(ejs, 'data', f), join(out, f));
cpSync(join(ejs, 'data/src'), join(out, 'src'), { recursive: true });
cpSync(join(ejs, 'data/compression'), join(out, 'compression'), { recursive: true });
mkdirSync(join(out, 'localization'));
copyFileSync(join(ejs, 'data/localization/en-US.json'), join(out, 'localization/en-US.json'));
// Single-threaded builds only (threads need cross-origin isolation headers).
for (const f of readdirSync(nes)) if (/^fceumm-(legacy-)?wasm\.data$/.test(f)) copyFileSync(join(nes, f), join(out, 'cores', f));
copyFileSync(join(nes, 'reports/fceumm.json'), join(out, 'cores/reports/fceumm.json'));
for (const f of readdirSync(snes)) if (/^snes9x-(legacy-)?wasm\.data$/.test(f)) copyFileSync(join(snes, f), join(out, 'cores', f));
copyFileSync(join(snes, 'reports/snes9x.json'), join(out, 'cores/reports/snes9x.json'));
copyFileSync(join(ejs, 'LICENSE'), join(root, 'public/emulatorjs/LICENSE-EmulatorJS.txt'));
console.log('EmulatorJS vendored into', out);
