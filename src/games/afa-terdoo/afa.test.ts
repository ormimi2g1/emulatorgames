import { describe, expect, it } from 'vitest';
import { GAMES, isPlayable } from '../catalog';
import { HEROES } from './art.meta';
import { LEVELS, ROWS, TILE, countOf, levelObjects } from './levels';
import {
  EMPTY_PROGRESS,
  GRAVITY,
  HERO_STATS,
  canDoubleJump,
  isUnlocked,
  progressAchievements,
  rateLevel,
  recordFinish,
  recordStart,
} from './rules';

const SOLID = '#=B?^';
const at = (rows: string[], x: number, y: number) => rows[y]?.[x] ?? '.';

describe('Afa & Terdoo levels', () => {
  it('has three worlds with unique ids, in order', () => {
    expect(LEVELS.map((l) => l.world)).toEqual([1, 2, 3]);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(3);
  });

  for (const level of LEVELS) {
    describe(level.name, () => {
      it('is a rectangular grid of known tiles', () => {
        expect(level.rows).toHaveLength(ROWS);
        const w = level.rows[0].length;
        for (const r of level.rows) {
          expect(r).toHaveLength(w);
          expect(r).toMatch(/^[.#=B?^KGPoCSefMNX]+$/);
        }
      });

      it('has one start, one gate, a crystal, a secret and checkpoints', () => {
        expect(countOf(level, 'P')).toBe(1);
        expect(countOf(level, 'G')).toBe(1);
        expect(countOf(level, 'C')).toBe(1);
        expect(countOf(level, 'S')).toBeGreaterThanOrEqual(1);
        expect(countOf(level, 'K')).toBeGreaterThanOrEqual(1);
        expect(countOf(level, 'o')).toBeGreaterThan(15);
      });

      it('has a power-up for every surprise block', () => {
        expect(level.surprises).toHaveLength(countOf(level, '?'));
      });

      it('puts the start, gate, checkpoints and walking critters on solid ground', () => {
        for (const o of levelObjects(level).filter((o) => 'PGKe'.includes(o.ch))) {
          expect(SOLID, `${o.ch} at ${o.x},${o.y}`).toContain(at(level.rows, o.x, o.y + 1));
        }
      });

      it('keeps every pit narrow enough to jump (or bridged by a moving platform)', () => {
        const ground = level.rows[ROWS - 1];
        let gap = 0;
        for (let x = 0; x < ground.length; x++) {
          if (ground[x] === '#') gap = 0;
          else if (++gap > 3) {
            const bridged = levelObjects(level).some((o) => (o.ch === 'M' || o.ch === 'N') && Math.abs(o.x - x) <= 4);
            expect(bridged, `pit at x=${x}`).toBe(true);
          }
        }
      });
    });
  }

  it('the Tunnel Tree tunnel fits Terdoo but not Afa', () => {
    const forest = LEVELS[1];
    // One-tile-high tunnel at row 11, ceiling at row 10.
    expect(at(forest.rows, 44, 11)).toBe('S');
    expect(at(forest.rows, 44, 10)).toBe('#');
    expect(HEROES.terdoo.h).toBeLessThan(TILE);
    expect(HEROES.afa.h).toBeGreaterThan(TILE);
  });

  it('the World 3 boss cave has springs so both heroes can reach the cloud', () => {
    const caves = LEVELS[2];
    expect(countOf(caves, 'X')).toBe(1);
    const boss = levelObjects(caves).find((o) => o.ch === 'X')!;
    const springs = levelObjects(caves).filter((o) => o.ch === '^' && Math.abs(o.x - boss.x) < 10);
    expect(springs.length).toBeGreaterThanOrEqual(1);
  });

  it('both heroes can jump onto the first raised ledge (3 tiles)', () => {
    for (const h of Object.values(HERO_STATS)) {
      const height = (h.jump * h.jump) / (2 * GRAVITY);
      expect(height).toBeGreaterThan(3 * TILE);
    }
  });
});

describe('Afa & Terdoo rules', () => {
  it('rates every finish at least one star', () => {
    expect(rateLevel({ starsCollected: 0, starsTotal: 30, crystal: false, secret: false })).toBe(1);
    expect(rateLevel({ starsCollected: 21, starsTotal: 30, crystal: false, secret: false })).toBe(2);
    expect(rateLevel({ starsCollected: 30, starsTotal: 30, crystal: true, secret: true })).toBe(3);
  });

  it('gives both heroes a double jump on Little Explorer', () => {
    expect(canDoubleJump('terdoo', 'adventurer')).toBe(false);
    expect(canDoubleJump('terdoo', 'little-explorer')).toBe(true);
    expect(canDoubleJump('afa', 'super-hero')).toBe(true);
  });

  it('unlocks worlds in order and keeps best results', () => {
    let p = EMPTY_PROGRESS;
    expect(isUnlocked(p, LEVELS[0].id)).toBe(true);
    expect(isUnlocked(p, LEVELS[1].id)).toBe(false);
    const base = { levelId: LEVELS[0].id, hero: 'afa' as const, starsTotal: 30, secret: false };
    p = recordFinish(p, { ...base, starsCollected: 30, crystal: true, elapsedMs: 90_000 });
    expect(isUnlocked(p, LEVELS[1].id)).toBe(true);
    expect(isUnlocked(p, LEVELS[2].id)).toBe(false);
    p = recordFinish(p, { ...base, starsCollected: 0, crystal: false, elapsedMs: 60_000 });
    expect(p.levels[LEVELS[0].id]).toEqual({ rating: 3, crystal: true, secret: false, bestTimeMs: 60_000 });
  });

  it('clears the resume point when that level is finished', () => {
    const resume = { levelId: LEVELS[0].id, hero: 'afa' as const, checkpoint: { x: 1, y: 1 }, collected: [], crystal: false, secret: false, elapsedMs: 0, savedAt: 0 };
    const p = recordFinish({ ...EMPTY_PROGRESS, resume }, { levelId: LEVELS[0].id, hero: 'afa', starsCollected: 0, starsTotal: 1, crystal: false, secret: false, elapsedMs: 1 });
    expect(p.resume).toBeUndefined();
  });

  it('earns teamwork and explorer badges from progress', () => {
    let p = EMPTY_PROGRESS;
    p = recordStart(p, LEVELS[0].id, 'afa');
    expect(progressAchievements(p)).toEqual(['first-adventure']);
    p = recordStart(p, LEVELS[1].id, 'terdoo');
    p = recordStart(p, LEVELS[2].id, 'terdoo');
    expect(progressAchievements(p)).toEqual(expect.arrayContaining(['teamwork-hero', 'world-explorer']));
  });
});

describe('catalog', () => {
  it('lists Afa & Terdoo as a real, playable game', () => {
    const g = GAMES.find((x) => x.id === 'afa-terdoo')!;
    expect(isPlayable(g)).toBe(true);
    expect(typeof g.load).toBe('function');
  });
});
