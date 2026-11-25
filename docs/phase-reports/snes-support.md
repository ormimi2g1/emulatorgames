# Report: Super Nintendo (SNES) support

Date: 2026-11-25. Added at the owner's request between Phase 4 and Phase 5.

## 1. Features completed
- The Retro Console now plays Super Nintendo games with the Snes9x core, which is self-hosted just like the NES core. It is downloaded only the first time a SNES game runs, then cached for offline play.
- In Parent Zone → Retro Games, **Super Nintendo** can now be chosen as the system. It accepts `.sfc` and `.smc` files up to 8 MB.
- Import checks:
  - accepts files with or without the 512-byte copier header
  - checks for a real SNES header (LoROM, HiROM or ExHiROM)
  - rejects files that are too small, damaged or not SNES games
- Everything else works the same as NES: the parent test run before kids can play, save slots, auto-save, continue, pause, mute, full screen, touch buttons and controllers.
- Keyboard: arrows, Z = A, X = B, A key = X, S = Y, Q = L, E = R, Enter = Start, V = Select. Buttons can be changed in the console's own menu.

## 2. Features verified
Checked in headless Chromium (desktop and Pixel 7 sizes) with an original test program (`tests/fixtures/color-test.sfc`). It shows a blue screen that turns green while A is held. The full flow worked: import, parent test, switch on for kids, child plays, keyboard input changes the picture, and a save to slot 1.

## 3. Tests executed and results
- Vitest: 114 of 114 passed. New tests: SNES file checks, with and without a copier header, plus files that are too small, have no header, are damaged or have the wrong extension.
- Playwright: 30 of 30 passed (new: the SNES journey on desktop and mobile).
- Type check and build pass.

## 4. Known issues and limitations
- **License:** Snes9x may be used free of charge for non-commercial purposes only. That fits a free family app. If the app were ever sold or monetized, the SNES core would have to be replaced. The license text is in `docs/LICENSE-Snes9x.txt`.
- **Untested with real game files:** not tried yet with real cartridge dumps, because none are bundled. Games that use special chips (for example Super FX) are supported by Snes9x but are slower on old devices.
- **Offline:** the SNES core is cached after the first SNES game is played, not when the app is installed.

## 5. Next
Phase 5: playtime limits and break reminders, plus touch and controller settings in the Parent Zone.
