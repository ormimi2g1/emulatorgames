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
| Imported retro games, save states | IndexedDB (Phase 3) | Never uploaded. |
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
