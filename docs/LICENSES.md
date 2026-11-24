# Third-party licenses

| Package | License |
|---|---|
| React, React DOM | MIT |
| React Router | MIT |
| idb | ISC |
| Fredoka font (@fontsource/fredoka) | SIL Open Font License 1.1 |
| vite-plugin-pwa / Workbox | MIT |
| EmulatorJS 4.2.3 (`public/emulatorjs/data`, incl. nipplejs and socket.io client it ships) | GPL-3.0 ([source](https://github.com/EmulatorJS/EmulatorJS), license in `public/emulatorjs/LICENSE-EmulatorJS.txt`) |
| FCEUmm libretro NES core (`public/emulatorjs/data/cores/fceumm-*.data`) | GPL-2.0 ([source](https://github.com/EmulatorJS/libretro-fceumm)) |
| RetroArch (inside the core build) | GPL-3.0 ([source](https://github.com/libretro/RetroArch)) |

EmulatorJS and its cores are unmodified copies from the `@emulatorjs/emulatorjs` and `@emulatorjs/core-fceumm` npm packages (see `scripts/vendor-emulatorjs.mjs`). They run as a separate page (`public/emulatorjs/player.html`) that the arcade embeds; their source is available at the links above.

All artwork (icons, thumbnails) is original to this project. No commercial game assets, ROMs or BIOS files are included.

`tests/fixtures/color-test.nes` is an original test program written for this project (`scripts/make-test-rom.py`) and is released under CC0.
