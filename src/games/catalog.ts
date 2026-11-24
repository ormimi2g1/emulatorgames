import type { ChildProfile } from '../data/types';
import type { GameCategory, GameDefinition } from './types';

/**
 * The game registry. To add a game: implement a GameModule, add an entry
 * here with `load: () => import('./my-game').then(m => m.default)` and set
 * status to 'available' only once it is genuinely playable.
 */
export const GAMES: GameDefinition[] = [
  {
    id: 'afa-terdoo',
    title: 'Afa & Terdoo: The Lost Rainbow Kingdom',
    description: 'Run, jump and team up to bring the rainbow crystals home.',
    category: 'adventure',
    ageMin: 4,
    ageMax: 10,
    difficulties: ['little-explorer', 'adventurer', 'super-hero'],
    controls: ['keyboard', 'touch', 'gamepad'],
    players: { min: 1, max: 1 },
    offline: true,
    saves: true,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 2,
  },
  {
    id: 'rainbow-kart',
    title: 'Rainbow Kart Racing',
    description: 'Zoom around a candy-colored track and grab boosts.',
    category: 'racing',
    ageMin: 4,
    ageMax: 10,
    difficulties: ['little-explorer', 'adventurer', 'super-hero'],
    controls: ['keyboard', 'touch', 'gamepad'],
    players: { min: 1, max: 2 },
    offline: true,
    saves: false,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 4,
  },
  {
    id: 'memory-magic',
    title: 'Memory Magic',
    description: 'Flip the cards and find the matching pairs.',
    category: 'puzzles',
    ageMin: 3,
    ageMax: 10,
    difficulties: ['little-explorer', 'adventurer', 'super-hero'],
    controls: ['touch', 'keyboard'],
    players: { min: 1, max: 2 },
    offline: true,
    saves: false,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 4,
  },
  {
    id: 'math-quest',
    title: 'Math Quest',
    description: 'Count, add and solve puzzles to open magic doors.',
    category: 'learn',
    ageMin: 4,
    ageMax: 9,
    difficulties: ['little-explorer', 'adventurer', 'super-hero'],
    controls: ['touch', 'keyboard'],
    players: { min: 1, max: 1 },
    offline: true,
    saves: true,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 4,
  },
  {
    id: 'space-explorer',
    title: 'Space Explorer',
    description: 'Fly your rocket, collect stars and visit planets.',
    category: 'adventure',
    ageMin: 4,
    ageMax: 10,
    difficulties: ['little-explorer', 'adventurer', 'super-hero'],
    controls: ['keyboard', 'touch', 'gamepad'],
    players: { min: 1, max: 1 },
    offline: true,
    saves: false,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 4,
  },
  {
    id: 'word-adventure',
    title: 'Word Adventure',
    description: 'Find letters, match words and learn to spell.',
    category: 'learn',
    ageMin: 3,
    ageMax: 8,
    difficulties: ['little-explorer', 'adventurer'],
    controls: ['touch', 'keyboard'],
    players: { min: 1, max: 1 },
    offline: true,
    saves: true,
    status: 'coming-soon',
    version: '0.0.0',
    plannedPhase: 4,
  },
];

export const CATEGORIES: { id: GameCategory; label: string; path: string; emoji: string }[] = [
  { id: 'adventure', label: 'Adventure', path: '/adventure', emoji: '🗺️' },
  { id: 'retro', label: 'Retro', path: '/retro', emoji: '🕹️' },
  { id: 'racing', label: 'Racing', path: '/racing', emoji: '🏎️' },
  { id: 'puzzles', label: 'Puzzles', path: '/puzzles', emoji: '🧩' },
  { id: 'learn', label: 'Learn & Play', path: '/learn', emoji: '🎓' },
];

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id);
}

export function isPlayable(game: GameDefinition): boolean {
  return game.status === 'available' && (typeof game.load === 'function' || !!game.retroId);
}

/** Games this profile may see: not disabled by the parent and assigned to the profile. */
export function visibleGames(
  profile: Pick<ChildProfile, 'assignedGames'> | null,
  disabledGames: string[],
  games: GameDefinition[] = GAMES,
): GameDefinition[] {
  return games.filter((g) => {
    if (disabledGames.includes(g.id)) return false;
    if (!profile || profile.assignedGames === 'all') return true;
    return profile.assignedGames.includes(g.id);
  });
}

export function ageLabel(g: GameDefinition): string {
  return `${g.ageMin}–${g.ageMax}`;
}
