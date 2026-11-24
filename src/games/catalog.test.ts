import { describe, expect, it } from 'vitest';
import { CATEGORIES, GAMES, isPlayable, visibleGames } from './catalog';

describe('game catalog', () => {
  it('has unique ids and complete metadata', () => {
    const ids = GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GAMES) {
      expect(g.title).toBeTruthy();
      expect(g.ageMin).toBeLessThanOrEqual(g.ageMax);
      expect(g.controls.length).toBeGreaterThan(0);
      expect(g.difficulties.length).toBeGreaterThan(0);
      expect(CATEGORIES.map((c) => c.id)).toContain(g.category);
    }
  });

  it('never marks a game available without loadable game code', () => {
    for (const g of GAMES) {
      if (g.status === 'available') expect(typeof g.load).toBe('function');
      expect(isPlayable(g)).toBe(g.status === 'available' && !!g.load);
    }
  });

  it('filters by parent-disabled games and per-profile assignments', () => {
    expect(visibleGames(null, [])).toHaveLength(GAMES.length);
    expect(visibleGames(null, ['memory-magic']).map((g) => g.id)).not.toContain('memory-magic');
    expect(visibleGames({ assignedGames: ['math-quest'] }, []).map((g) => g.id)).toEqual(['math-quest']);
    expect(visibleGames({ assignedGames: ['math-quest'] }, ['math-quest'])).toEqual([]);
  });
});
