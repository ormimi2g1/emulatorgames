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
| `src/games/` | Game registry (`catalog.ts`), lifecycle types (`types.ts`), original thumbnails, shared game host/input, and the Afa & Terdoo platformer |
| `src/pages/` | Screens: setup, player picker, home, categories, My Games, trophies, Parent Zone |
| `src/components/` | Shared UI: layout and navigation, game cards, PIN pad, dialogs |
| `tests/e2e/` | Playwright browser tests |
| `docs/` | Architecture, data, security and phase reports |

## Adding a game

1. Build the game's screen as a default-exported React component. Simple games can use `useMiniGame`, `MiniGameFrame` and `ResultCard` from `src/games/shared/MiniGame.tsx`; action games can use `GameHost` with a `GameModule` (see `src/games/types.ts`), whose `destroy` must stop loops, audio and listeners.
2. Register it in `src/games/catalog.ts` with `screen: () => import('./your-game/Screen')` so it is lazy-loaded.
3. Only set `status: 'available'` once it is genuinely playable. A unit test enforces that available games have a screen.

## Afa & Terdoo: The Lost Rainbow Kingdom

An original platformer with three worlds (Sunshine Meadows, Magical Forest, Crystal Caverns). Pick Afa (high jump, double jump, rainbow shield) or Terdoo (fast, small enough for tiny tunnels, turbo dash). Collect stars, find the rainbow crystal and the secret place in every world, and cheer up the Gloomy Cloud at the end.

Keys: arrows or A/D to move, Space/Z/up to jump, X or Shift for the special move, Esc or P to pause. Phones and tablets get big on-screen buttons; controllers work too. The difficulty set for each player (Little Explorer, Adventurer, Super Hero) changes hearts, enemy speed and double jumping.

## Mini-games

Memory Magic (1 or 2 players), Math Quest, Word Adventure, Space Explorer and Rainbow Kart Racing. Each adapts to the player's difficulty, saves its best result per player and works offline.

## Retro games (NES and SNES)

1. Parent Zone → **Retro Games** → choose the system (NES or SNES) and a `.nes`, `.sfc` or `.smc` file you own.
2. Check the title, ages, difficulty, picture and which players can see it, then **Add game**.
3. Tap **Test**. Once the game starts, switch on **Kids can play**.

Keyboard: arrows, Z = A, X = B, Enter = Start, V = Select; on SNES also A key = X, S = Y, Q = L, E = R. Phones and tablets get on-screen buttons. Controllers work through the browser's Gamepad API; buttons and player 2 can be changed in the console's own menu.

The arcade **does not include or download any commercial games, ROMs or BIOS files**. Game files stay on the device and are never uploaded. Nintendo, Mario and other trademarks belong to their owners and are not used as this app's identity.

## Replit

GitHub is the source of truth. Replit imports this repo and only mirrors it (`.replit` runs the dev server on port 5000 and defines a static deployment). Nothing is published without the owner's approval.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/phase-reports/](docs/phase-reports/).
