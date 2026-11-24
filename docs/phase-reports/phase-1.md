# Phase 1 report: Arcade foundation

Date: 2026-11-24

## 1. Features completed
- App shell with React 18 + TypeScript + Vite 8 + Tailwind 4, playful self-hosted font (Fredoka), dark/light/system theme, per-player high contrast and reduced motion.
- Home dashboard: greeting with the player's avatar, featured carousel, Recently Played and Favorites (shown once there is data), a row per category, trophy summary.
- Game catalog registry with standard lifecycle types and original SVG thumbnails. All 7 planned games are listed and clearly marked **Coming soon**; none can be launched yet (a test enforces this until real game code exists).
- Navigation: desktop side bar; mobile bottom bar (Home, Adventure, Retro, Learn, More) with a More sheet for the rest.
- First-run setup: parent creates PIN (no default), confirms it, gets a one-time recovery code, then adds demo players Afa & Terdoo or a custom player.
- Player picker and profiles (nickname, avatar, optional age range, difficulty, accessibility, assigned games, favorites).
- Parent Zone (PIN-gated): dashboard, players (add/edit/delete), show/hide games, theme and volume settings, storage usage + "protect my data", JSON backup export, delete everything, change PIN, forgot-PIN recovery.
- PWA: manifest, original icons (incl. maskable and Apple touch), service worker precaching the app shell, offline badge, safe update prompt.

## 2. Features verified
Verified in automated tests and headless Chromium at 1366×768 and a Pixel 7 / iPhone 13 viewport: setup flow, persistence across reload, navigation to every section, no horizontal overflow, parent lock and wrong-PIN handling, Parent Zone relocks on reload, manifest + icons served, service worker registers.

## 3. Tests executed and results
- Unit + integration (Vitest): 54/54 passed (PIN rules, hashing, lockout escalation, recovery, PIN change, profile CRUD and validation, profile cap, favorites, export excludes secrets, catalog invariants, game visibility, setup flow, parent gate, add/delete player, hiding a game).
- Browser (Playwright, desktop + mobile projects): 8/8 passed.
- Type check and production build: pass.

## 4. Known issues and limitations
- No playable games yet (by design for Phase 1).
- Parent PIN and all data are local to one browser on one device; clearing site data removes them.
- Not tested on physical iPhone/Android devices, Safari or Firefox yet (only Chromium emulation).
- Playtime tracking/limits arrive in Phase 5; the dashboard shows "—" rather than fake numbers.

## 5. Next recommended milestone
Phase 2 (Afa & Terdoo platformer, 3 levels) and Phase 3 (NES emulator + parent import). Since the main goal is retro play, doing Phase 3 first is a reasonable swap.
