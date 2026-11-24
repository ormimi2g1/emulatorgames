/**
 * Original level layouts for "Afa & Terdoo: The Lost Rainbow Kingdom".
 * Levels are built with a tiny builder so the layout stays readable and testable.
 *
 * Tiles: '#' ground, '=' solid block, 'B' breakable block, '?' surprise block,
 *        '^' spring, 'K' checkpoint, 'G' rainbow gate (goal), 'P' start,
 *        'o' star, 'C' crystal, 'S' secret zone, 'e' walking critter, 'f' flying critter,
 *        'M' sideways moving platform, 'N' up-and-down moving platform, 'X' boss.
 */
export const TILE = 32;
export const ROWS = 15;
export const GROUND_TOP = 12;

export type PowerUpKind = 'shield' | 'boots' | 'superjump' | 'magnet' | 'heart' | 'flight';

export interface LevelTheme {
  skyTop: number;
  skyBottom: number;
  hill: number;
  hillDark: number;
  ground: number;
  groundTop: number;
  block: number;
  decor: 'flowers' | 'trees' | 'crystals';
  cave?: boolean;
}

export interface LevelData {
  id: string;
  world: number;
  name: string;
  intro: string;
  rows: string[];
  /** Contents of '?' blocks, in reading order (left to right). */
  surprises: PowerUpKind[];
  theme: LevelTheme;
}

class Builder {
  grid: string[][];
  constructor(public width: number) {
    this.grid = Array.from({ length: ROWS }, () => Array.from({ length: width }, () => '.'));
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && x < this.width && y >= 0 && y < ROWS) this.grid[y][x] = ch;
    return this;
  }
  fill(x0: number, x1: number, y0: number, y1: number, ch: string) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, ch);
    return this;
  }
  ground(x0: number, x1: number, top = GROUND_TOP) {
    return this.fill(x0, x1, top, ROWS - 1, '#');
  }
  row(x: number, y: number, s: string) {
    [...s].forEach((ch, i) => ch !== ' ' && this.set(x + i, y, ch));
    return this;
  }
  build(): string[] {
    return this.grid.map((r) => r.join(''));
  }
}

function sunshineMeadows(): string[] {
  const b = new Builder(140);
  b.ground(0, 30).ground(34, 55).ground(61, 95).ground(99, 139);
  b.set(2, 11, 'P');
  b.row(6, 10, 'oooo');
  b.set(12, 8, '?');
  b.ground(18, 24, 10).row(19, 9, 'ooo');
  b.set(27, 11, 'e');
  b.row(31, 9, 'ooo'); // stars over the first gap
  b.row(37, 8, 'BBB').row(37, 7, 'ooo');
  b.set(44, 11, '^');
  b.row(46, 5, '======').row(47, 4, 'oooo');
  // Secret ledge above the meadow, reached from the spring platform.
  b.row(56, 3, '===').set(56, 2, 'S').set(57, 2, 'C').set(58, 2, 'o');
  b.set(53, 11, 'K');
  b.set(57, 10, 'M');
  b.set(66, 8, '?');
  b.set(70, 11, 'e').set(80, 11, 'e');
  b.row(74, 8, 'ooooo');
  b.row(84, 9, '===').row(88, 7, '===').row(84, 8, 'ooo').row(88, 6, 'ooo');
  b.set(92, 11, 'K');
  b.row(96, 9, 'ooo');
  b.set(104, 11, 'e');
  b.set(106, 8, '?');
  b.row(110, 10, 'oo').row(114, 9, 'oo').row(118, 10, 'oo');
  b.set(122, 11, 'e');
  b.row(126, 11, '=').row(127, 10, '==').row(129, 9, '===');
  b.set(134, 11, 'G');
  return b.build();
}

function magicalForest(): string[] {
  const b = new Builder(150);
  b.ground(0, 22).ground(26, 70).ground(76, 104).ground(110, 149);
  b.set(2, 11, 'P');
  b.row(5, 10, 'ooo');
  b.set(10, 8, '?');
  b.set(15, 11, 'e');
  b.row(18, 9, '===').row(18, 8, 'ooo');
  b.row(23, 9, 'ooo');
  b.set(30, 7, 'f');
  b.set(34, 11, 'K');
  // The Tunnel Tree: a hill with a tiny tunnel only Terdoo fits through.
  b.set(38, 10, '=');
  b.ground(40, 52, 9);
  b.fill(40, 51, 11, 11, '.');
  b.set(44, 11, 'S').set(47, 11, 'C').row(49, 11, 'oo');
  b.row(42, 8, 'ooooo');
  b.set(56, 11, 'e');
  b.set(60, 8, '?');
  b.set(64, 11, '^');
  b.row(66, 5, '=====').row(66, 4, 'ooooo');
  b.set(68, 11, 'K');
  b.set(73, 10, 'N');
  b.set(80, 7, 'f').set(88, 11, 'e');
  b.row(84, 9, '==B==').row(84, 8, 'o o o');
  b.set(92, 8, '?');
  b.row(96, 10, 'oooo');
  b.set(100, 11, 'K');
  b.set(106, 10, 'M');
  b.set(114, 6, 'f').set(118, 11, 'e').set(126, 11, 'e');
  b.row(120, 9, '====').row(120, 8, 'oooo');
  b.row(130, 8, '???');
  b.row(136, 10, 'ooo');
  b.set(144, 11, 'G');
  return b.build();
}

function crystalCaverns(): string[] {
  const b = new Builder(150);
  b.fill(0, 149, 0, 1, '=');
  b.ground(0, 24).ground(28, 58).ground(60, 92).ground(97, 149);
  b.set(2, 11, 'P');
  b.row(6, 10, 'ooo');
  b.set(11, 8, '?');
  b.set(16, 11, 'e');
  b.row(20, 9, 'BBBB').row(20, 8, 'oooo');
  b.row(25, 9, 'ooo');
  b.set(32, 6, 'f');
  b.set(36, 11, 'K');
  b.set(42, 11, '^');
  b.row(44, 5, '====').row(44, 4, 'oooo');
  b.set(50, 11, 'e');
  b.row(55, 10, '==');
  // Hidden cave room behind a breakable wall (dash or shield through it).
  b.fill(59, 68, 8, 8, '=');
  b.fill(59, 59, 9, 11, 'B');
  b.fill(68, 68, 9, 11, '=');
  b.set(61, 11, 'S').set(64, 11, 'C').row(62, 10, 'ooo');
  b.ground(59, 68);
  b.set(72, 11, 'K');
  b.set(76, 8, '?');
  b.set(80, 11, 'e').set(86, 7, 'f');
  b.set(94, 10, 'M');
  b.row(93, 8, 'ooo');
  b.set(101, 11, 'K');
  b.set(104, 8, '?');
  b.row(108, 9, '===').row(108, 8, 'ooo');
  b.set(112, 11, 'e');
  // Boss cave: the Gloomy Cloud. The gate appears once it cheers up.
  b.set(120, 11, 'K');
  b.row(124, 9, '==').row(140, 9, '==');
  b.set(128, 11, '^').set(136, 11, '^');
  b.set(132, 5, 'X');
  b.set(145, 11, 'G');
  return b.build();
}

export const LEVELS: LevelData[] = [
  {
    id: 'w1-sunshine-meadows',
    world: 1,
    name: 'Sunshine Meadows',
    intro: 'Hop over the flower hills and find the hidden crystal!',
    rows: sunshineMeadows(),
    surprises: ['heart', 'boots', 'shield'],
    theme: { skyTop: 0x7dd3fc, skyBottom: 0xe0f2fe, hill: 0x86efac, hillDark: 0x4ade80, ground: 0x9a6b3f, groundTop: 0x49d17d, block: 0xffd54a, decor: 'flowers' },
  },
  {
    id: 'w2-magical-forest',
    world: 2,
    name: 'Magical Forest',
    intro: 'The Tunnel Tree hides a secret only a small hero can reach.',
    rows: magicalForest(),
    surprises: ['superjump', 'magnet', 'heart', 'flight', 'shield', 'heart'],
    theme: { skyTop: 0x22c55e, skyBottom: 0xbbf7d0, hill: 0x15803d, hillDark: 0x166534, ground: 0x7c4a2d, groundTop: 0x65a30d, block: 0xa16207, decor: 'trees' },
  },
  {
    id: 'w3-crystal-caverns',
    world: 3,
    name: 'Crystal Caverns',
    intro: 'Glowing caves, a secret room, and a gloomy cloud who needs cheering up.',
    rows: crystalCaverns(),
    surprises: ['heart', 'flight', 'magnet'],
    theme: { skyTop: 0x1e1b4b, skyBottom: 0x4c1d95, hill: 0x6d28d9, hillDark: 0x4c1d95, ground: 0x3f3f6e, groundTop: 0x8b5cf6, block: 0x38bdf8, decor: 'crystals', cave: true },
  },
];

export interface LevelObject {
  ch: string;
  x: number;
  y: number;
}

export function levelObjects(level: LevelData): LevelObject[] {
  const out: LevelObject[] = [];
  level.rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && out.push({ ch, x, y })));
  return out;
}

export function countOf(level: LevelData, ch: string): number {
  return level.rows.reduce((n, r) => n + [...r].filter((c) => c === ch).length, 0);
}
