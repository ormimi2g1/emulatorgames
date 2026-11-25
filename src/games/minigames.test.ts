import { describe, expect, it } from 'vitest';
import type { Difficulty } from '../data/types';
import { makeQuest, makeQuestion, rateQuest } from './math-quest/questions';
import { PAIRS, makeDeck, rateMemory } from './memory-magic/logic';
import { BOOSTS, Race, TRACK, nearestIndex, pointAt, rateRace } from './rainbow-kart/engine';
import { seededRandom, shuffle } from './shared/MiniGame';
import { PLANETS, SpaceGame, rateTrip } from './space-explorer/engine';
import { WORDS, makeRounds, rateWords } from './word-adventure/words';

const LEVELS: Difficulty[] = ['little-explorer', 'adventurer', 'super-hero'];

describe('shared helpers', () => {
  it('seeded random is repeatable and in range', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });
  it('shuffle keeps every item', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRandom(1)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('Memory Magic', () => {
  it('deals exactly two of each picture', () => {
    for (const d of LEVELS) {
      const deck = makeDeck(PAIRS[d], seededRandom(7));
      expect(deck).toHaveLength(PAIRS[d] * 2);
      const counts = new Map<string, number>();
      deck.forEach((c) => counts.set(c.symbol.id, (counts.get(c.symbol.id) ?? 0) + 1));
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
      expect(new Set(deck.map((c) => c.key)).size).toBe(deck.length);
    }
  });
  it('rates kindly', () => {
    expect(rateMemory(4, 4)).toBe(3);
    expect(rateMemory(9, 4)).toBe(2);
    expect(rateMemory(40, 4)).toBe(1);
  });
});

describe('Math Quest', () => {
  it('always offers three different choices including the right answer, never negative', () => {
    for (const d of LEVELS) {
      const rand = seededRandom(3);
      for (let i = 0; i < 300; i++) {
        const q = makeQuestion(d, rand);
        expect(q.choices).toHaveLength(3);
        expect(new Set(q.choices).size).toBe(3);
        expect(q.choices).toContain(q.answer);
        expect(q.choices.every((c) => c >= 0)).toBe(true);
        const expected = { count: q.a, add: q.a + q.b, subtract: q.a - q.b, multiply: q.a * q.b }[q.kind];
        expect(q.answer).toBe(expected);
      }
    }
  });
  it('keeps numbers small for little explorers', () => {
    const rand = seededRandom(9);
    for (let i = 0; i < 200; i++) {
      const q = makeQuestion('little-explorer', rand);
      expect(q.answer).toBeLessThanOrEqual(6);
      expect(['count', 'add']).toContain(q.kind);
    }
  });
  it('makes a quest of 8 doors and rates it', () => {
    expect(makeQuest('adventurer', seededRandom(1))).toHaveLength(8);
    expect(rateQuest(8)).toBe(3);
    expect(rateQuest(4)).toBe(2);
    expect(rateQuest(0)).toBe(1);
  });
});

describe('Word Adventure', () => {
  it('little explorers pick the first letter from three', () => {
    for (const r of makeRounds('little-explorer', seededRandom(5))) {
      expect(r.kind).toBe('letter');
      if (r.kind !== 'letter') continue;
      expect(r.letter).toBe(r.word.word[0]);
      expect(new Set(r.choices).size).toBe(3);
      expect(r.choices).toContain(r.letter);
    }
  });
  it('adventurers get every letter of the word plus one extra', () => {
    for (const r of makeRounds('adventurer', seededRandom(5))) {
      if (r.kind !== 'spell') throw new Error('expected spelling');
      expect(r.tiles).toHaveLength(r.word.word.length + 1);
      const rest = [...r.tiles];
      for (const ch of r.word.word) rest.splice(rest.indexOf(ch), 1);
      expect(rest).toHaveLength(1);
    }
  });
  it('uses simple words with a picture', () => {
    expect(WORDS.every((w) => /^[A-Z]{3,4}$/.test(w.word) && w.emoji)).toBe(true);
    expect(rateWords(8)).toBe(3);
  });
});

describe('Space Explorer', () => {
  it('flies up and down within the screen', () => {
    const g = new SpaceGame('adventurer', seededRandom(2));
    const y0 = g.y;
    for (let i = 0; i < 30; i++) g.step(1 / 60, -1);
    expect(g.y).toBeLessThan(y0);
    for (let i = 0; i < 600; i++) g.step(1 / 60, 1);
    expect(g.y).toBeLessThanOrEqual(450 - 30);
  });
  it('collects stars, reaches a planet and finishes after three', () => {
    const g = new SpaceGame('little-explorer', seededRandom(4));
    const events: string[] = [];
    // Steer toward the nearest star each frame.
    for (let i = 0; i < 60 * 240 && !g.done; i++) {
      const target = g.things.filter((t) => t.kind !== 'rock' && !t.hit).sort((a, b) => a.x - b.x)[0];
      g.step(1 / 60, 0, target?.y);
      if (g.things.some((t) => t.kind === 'planet')) events.push('planet-out');
      const ev = g.step(0, 0);
      ev.forEach((e) => events.push(e.type));
    }
    expect(g.stars).toBeGreaterThanOrEqual(6);
    expect(g.planetsVisited).toBeGreaterThanOrEqual(1);
    while (!g.done) g.visitPlanet();
    expect(g.planetsVisited).toBe(PLANETS.length);
  });
  it('rates bumps gently', () => {
    expect(rateTrip(0)).toBe(3);
    expect(rateTrip(5)).toBe(2);
    expect(rateTrip(20)).toBe(1);
  });
});

describe('Rainbow Kart', () => {
  it('builds a closed track with boost pads on it', () => {
    expect(TRACK.length).toBeGreaterThan(60);
    BOOSTS.forEach((b) => expect(b).toBeLessThan(TRACK.length));
    expect(nearestIndex(pointAt(0).p).index).toBe(0);
  });
  it('a kart that holds straight with the steering assist goes around and finishes', () => {
    const race = new Race('little-explorer');
    let finished: number | undefined;
    for (let i = 0; i < 60 * 180 && finished === undefined; i++) {
      for (const e of race.step(1 / 60, 0)) if (e.type === 'finish') finished = e.place;
    }
    expect(finished).toBeDefined();
    expect(race.lap).toBe(race.laps);
  });
  it('slows down off the road and counts no progress backwards past zero', () => {
    const race = new Race('adventurer');
    race.player.x += 2000;
    race.player.speed = 400;
    for (let i = 0; i < 120; i++) race.step(1 / 60, 0);
    expect(race.offTrack || race.player.speed < 400).toBe(true);
    expect(race.player.progress).toBeGreaterThanOrEqual(0);
  });
  it('awards stars by place', () => {
    expect([1, 2, 3].map(rateRace)).toEqual([3, 2, 1]);
  });
});
