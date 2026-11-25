# Third-party licenses

| Package | License |
|---|---|
| React, React DOM | MIT |
| React Router | MIT |
| idb | ISC |
| Fredoka font (@fontsource/fredoka) | SIL Open Font License 1.1 |
| vite-plugin-pwa / Workbox | MIT |
| Phaser 3.90 (Afa & Terdoo game engine) | MIT |
| EmulatorJS 4.2.3 (`public/emulatorjs/data`, incl. nipplejs and socket.io client it ships) | GPL-3.0 ([source](https://github.com/EmulatorJS/EmulatorJS), license in `public/emulatorjs/LICENSE-EmulatorJS.txt`) |
| FCEUmm libretro NES core (`public/emulatorjs/data/cores/fceumm-*.data`) | GPL-2.0 ([source](https://github.com/EmulatorJS/libretro-fceumm)) |
| Snes9x libretro SNES core (`public/emulatorjs/data/cores/snes9x-*.data`) | Snes9x license: free for non-commercial use ([source](https://github.com/libretro/snes9x), license in `docs/LICENSE-Snes9x.txt`) |
| RetroArch (inside the core build) | GPL-3.0 ([source](https://github.com/libretro/RetroArch)) |

EmulatorJS and its cores are unmodified copies from the `@emulatorjs/emulatorjs`, `@emulatorjs/core-fceumm` and `@emulatorjs/core-snes9x` npm packages (see `scripts/vendor-emulatorjs.mjs`). They run as a separate page (`public/emulatorjs/player.html`) that the arcade embeds; their source is available at the links above.

All artwork (icons, thumbnails, and every character, tile and background in Afa & Terdoo, drawn in code) and all game sounds and music (synthesized with the Web Audio API) are original to this project. No commercial game assets, ROMs or BIOS files are included.

`tests/fixtures/color-test.nes` and `tests/fixtures/color-test.sfc` are original test programs written for this project (`scripts/make-test-rom.py`, `scripts/make-snes-test-rom.py`) and are released under CC0.

**Note on Snes9x:** its license allows free use and distribution for non-commercial purposes only. This arcade is a free family app, so that fits; if the app were ever sold or monetized, the SNES core would need to be replaced.
