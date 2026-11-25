# Architecture

## Decisions

- **Local-first, no backend (for now).** Chosen by the owner on 2026-11-24: parent login is a PIN stored on the device; there is no server or database. The data layer (`src/data/`) is the only code that touches storage, so an optional sync server can be added later without rewriting screens.
- **Static hosting.** The production build is plain files (`dist/`), so it can be hosted on the cheapest static tier.
- **Client-side games.** Original games (Phaser, from Phase 2) and the retro emulator (EmulatorJS, from Phase 3) run in the browser and are lazy-loaded per game.

## What is stored where

| Data | Where | Notes |
|---|---|---|
| Parent PIN | IndexedDB `kv.parentAuth` | Salted PBKDF2-SHA256 hash only (210k iterations). Recovery code stored the same way. |
| PIN lockout counter | IndexedDB `kv.lockout` | Persists across reloads. |
| Settings (theme, volume, hidden games) | IndexedDB `kv.settings` | |
| Child profiles | IndexedDB `profiles` | Nickname, avatar, optional age range, difficulty, favorites, assigned games, accessibility, trophies. No real names, emails, birthdays, photos or locations. |
| Active player | IndexedDB `kv.activeProfileId` | |
| Imported retro games | IndexedDB `romMeta` (details), `romData` (file bytes), `romArt` (picture) | Never uploaded. SHA-256 used to spot duplicates. |
| Original game progress | IndexedDB `progress`, one record per game × player | Afa & Terdoo: best stars per world, crystals, secrets, heroes used, last checkpoint. Deleted with the player. |
| Retro save states | IndexedDB `saves`, one per game × player × slot (0 = auto, 1–3 manual) | Deleted with the game or the player. |
| Server-side data | none | |

Schema changes are additive migrations in `src/data/db.ts` (`upgrade(oldVersion)`), so app updates keep existing data. The service worker only caches app files; it never touches IndexedDB.

## Parent Zone security (local)

- No default PIN; trivial PINs (repeated digits, straight sequences) are rejected.
- 5 free attempts, then an escalating wait (30 s doubling, max 15 min), persisted.
- Parent session is memory-only, auto-locks after 10 idle minutes and on reload.
- Forgot PIN: one-time recovery code shown at setup (rotated after each use or PIN change).
- Export never includes PIN or recovery hashes.

**Limitations:** this keeps children out of settings on a shared device. It cannot stop an adult who clears site data or uses developer tools, and nothing syncs between devices. Time limits (Phase 5) will have the same local-only limitation.

## PWA

`vite-plugin-pwa` generates the manifest and a Workbox service worker that precaches the app shell (works offline after first load). Updates wait for the user to tap **Update**.

## Retro Console

- EmulatorJS (NES core FCEUmm, SNES core Snes9x) is served from `public/emulatorjs/`; nothing loads from a CDN. Each core (about 1 MB) is downloaded only when a game for that system first runs.
- It runs in a same-origin iframe (`player.html`) with a strict Content Security Policy that only allows this app's own origin, so the emulator cannot contact netplay, update or tracking servers. Leaving the game removes the iframe, which stops its audio, loops and listeners.
- The arcade sends the ROM bytes to the iframe with `postMessage`; save states come back the same way (`src/retro/emulatorBridge.ts`).
- Import checks: supported system, file extension, size limit, and the game's own header: iNES for NES; for SNES an optional 512-byte copier header, then a LoROM/HiROM/ExHiROM header with a valid checksum or map mode (`src/retro/systems.ts`). Pictures are checked by their bytes (PNG/JPEG/WebP/GIF only, never SVG). Imported games start hidden; a parent must run **Test** successfully before switching a game on for kids.
- Auto-save every 60 s, when the app goes to the background (it also pauses), and on exit. Next launch continues from the auto-save.
- The service worker caches the console on first use (`retro-console` cache), so a game that has been played once also works offline.
- NES and SNES are supported. Game Boy (Color/Advance) and Genesis are listed as "coming later" until their cores are added and tested.

## Original games (Afa & Terdoo)

- `src/games/shared/`: `GameInput` merges keyboard, Gamepad API and on-screen touch buttons into one per-frame state; `GameHost` lazy-loads a `GameModule`, owns the pause menu, full screen and touch controls, pauses when the app goes to the background, and destroys the game on exit.
- `src/games/afa-terdoo/`: menus in React (`AfaTerdooScreen`), the level in Phaser (`LevelScene`, loaded only when a level starts, about 330 KB gzipped, precached for offline play). Levels are text grids in `levels.ts`; scoring, unlocks and badges are plain functions in `rules.ts` with unit tests. Art is drawn in code (`art.ts`), sounds are synthesized (`sfx.ts`).
- No game over: losing every heart says "Great try!" and returns the player to the last checkpoint. Bouncing on critters cheers them up rather than defeating them.
- `?testhooks=1` exposes `window.__afa` (state and teleport) for the browser tests only; it changes nothing else.

## Mini-games

Memory Magic, Math Quest and Word Adventure are plain React (big buttons, screen-reader friendly). Space Explorer and Rainbow Kart draw on a `<canvas>` with a small engine class each (`engine.ts`) that has no drawing code, so it is unit tested. All of them share `src/games/shared/MiniGame.tsx` (frame, results, best scores in the `progress` store, badges) and `tones.ts` (synthesized sounds). Rounds can be replayed with `?seed=N`, which the browser tests use.
