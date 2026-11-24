# Kids Adventure Arcade

**Big Adventures for Little Heroes.** A safe, ad-free, installable game arcade (PWA) for children aged 4–10.

Everything runs in the browser. Profiles, settings and (later) imported game files and saves stay on the device in IndexedDB. There are no accounts, ads, trackers, chat or purchases.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5000
npm test           # unit + integration tests (Vitest)
npm run build      # type-check + production build into dist/
npm run test:e2e   # browser tests (Playwright) against the production build
```

The first time the app opens, a grown-up creates a **parent PIN** (there is no default) and is shown a one-time **recovery code**, then adds players (or the demo players Afa & Terdoo).

## Project layout

| Path | What |
|---|---|
| `src/data/` | Local data layer (IndexedDB via `idb`): profiles, settings, export, avatars, achievements |
| `src/auth/` | Parent PIN (PBKDF2 hash, lockout, recovery) and Parent Zone session |
| `src/games/` | Game registry (`catalog.ts`), lifecycle types (`types.ts`), original thumbnails |
| `src/pages/` | Screens: setup, player picker, home, categories, My Games, trophies, Parent Zone |
| `src/components/` | Shared UI: layout and navigation, game cards, PIN pad, dialogs |
| `tests/e2e/` | Playwright browser tests |
| `docs/` | Architecture, data, security and phase reports |

## Adding a game

1. Implement a `GameModule` (see `src/games/types.ts`): `mount()` returns an instance with `start / pause / resume / restart / save / load / destroy`. `destroy` must stop loops, audio and listeners.
2. Register it in `src/games/catalog.ts` with `load: () => import('./your-game')` so it is lazy-loaded.
3. Only set `status: 'available'` once it is genuinely playable. A unit test enforces that available games have code.

## Retro games and legal notes

The arcade **does not include or download any commercial games, ROMs or BIOS files**. From Phase 3, a parent can import game files they lawfully own; files stay on the device and are never uploaded. Nintendo, Mario and other trademarks belong to their owners and are not used as this app's identity.

## Replit

GitHub is the source of truth. Replit imports this repo and only mirrors it (`.replit` runs the dev server on port 5000 and defines a static deployment). Nothing is published without the owner's approval.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/phase-reports/](docs/phase-reports/).
