import type { RetroGame } from '../data/types';
import type { GameDefinition } from '../games/types';
import { getSystem } from './systems';

export const RETRO_PREFIX = 'rom:';

export function retroGameId(romId: string): string {
  return RETRO_PREFIX + romId;
}

export function parseRetroGameId(gameId: string): string | null {
  return gameId.startsWith(RETRO_PREFIX) ? gameId.slice(RETRO_PREFIX.length) : null;
}

/** Present an imported retro game as a normal arcade game card. */
export function retroToGameDef(g: RetroGame): GameDefinition {
  const system = getSystem(g.system);
  return {
    id: retroGameId(g.id),
    retroId: g.id,
    title: g.title,
    description: `${system?.name ?? 'Retro'} game added by a grown-up.`,
    category: 'retro',
    ageMin: g.ageMin,
    ageMax: g.ageMax,
    difficulties: [g.difficulty],
    controls: ['keyboard', 'touch', 'gamepad'],
    players: { min: 1, max: 2 },
    offline: true,
    saves: true,
    status: 'available',
    version: '1',
  };
}
