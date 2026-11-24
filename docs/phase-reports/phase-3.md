# Phase 3 report: Retro Console (NES)

Date: 2026-11-24. Done before Phase 2 at the owner's request, because retro play is the main goal.

## 1. Features completed
- NES emulation with EmulatorJS 4.2.3 + FCEUmm core, self-hosted (no CDN), sandboxed in an iframe with a strict Content Security Policy.
- Parent-only import (Parent Zone → Retro Games): system picker (NES supported; SNES, Game Boy, GBC, GBA, Genesis shown as "coming later"), `.nes` file with extension, size (≤ 4 MB) and header checks, friendly title from the file name, ages, difficulty, optional picture (PNG/JPEG/WebP/GIF checked by content), which players can see it, duplicate detection.
- Test launch: games stay hidden until a parent's test run starts the game; then "Kids can play" can be switched on. Edit, change picture, remove (with its saves), and manage save slots per game.
- Game screen: exit with friendly confirmation, pause/resume, restart (confirm), 3 save slots + automatic save (every minute, on background, on exit), continue where you left off, mute, fullscreen. Pauses when the app goes to the background.
- Controls: keyboard, on-screen touch controls on phones/tablets, Gamepad API controllers; remapping, player 2 and CRT shader are in the console's built-in settings menu.
- Retro games appear on Home (featured + Retro row), the Retro page and My Games; recently played is recorded.
- Storage: database upgraded to version 2 with an additive migration (existing players and settings kept); games and saves count toward the storage screen.
- Bug fixes: React Router v7 warnings silenced (future flags); stray `tsconfig.tsbuildinfo` removed from git.

## 2. Features verified
In headless Chromium (desktop 1366×768 and Pixel 7 emulation), with an original test ROM (`tests/fixtures/color-test.nes`) that shows blue and turns green while A is held:
import → test → enable → child plays → keyboard input changes the picture → pause/resume → save slot 1 → exit (auto-save) → relaunch shows "Welcome back" → load slot 1. On the phone viewport the on-screen D-pad and A/B/Start/Select buttons appear.

## 3. Tests executed and results
- Vitest: 65/65 passed (new: file validation incl. fake/oversized/truncated files and malicious names, picture sniffing, import/duplicates, test-before-enable, player assignment, save slots per player, cascade deletes, v1 → v2 upgrade keeps data).
- Playwright: 12/12 passed (desktop + mobile).
- Type check and production build: pass.

## 4. Known issues and limitations
- Not yet tried with real commercial NES cartridge dumps (none are bundled); FCEUmm is a mature core, but please report any game that does not start.
- Not verified on a physical iPhone/Android, Safari or Firefox, or with a real Bluetooth/USB controller (browser emulation only).
- Fullscreen of the whole page is not available on iPhone Safari (Apple limitation); the game already fills the screen.
- Touch control size/position settings from the spec use the console's own menu for now; parent-level control settings arrive in Phase 5.
- Offline: the console is cached after its first use, not at install.

## 5. Next recommended milestone
Phase 2: the Afa & Terdoo platformer (three levels).
