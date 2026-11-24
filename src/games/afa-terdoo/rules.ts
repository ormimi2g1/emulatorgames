/**
 * Pure game rules for "Afa & Terdoo", kept free of Phaser so they can be unit tested.
 */
import type { Difficulty } from '../../data/types';
import { LEVELS, type PowerUpKind } from './levels';

export type HeroId = 'afa' | 'terdoo';

export interface HeroStats {
  name: string;
  speed: number;
  jump: number;
  doubleJump: boolean;
  special: 'shield' | 'dash';
  specialLabel: string;
  cooldownMs: number;
  blurb: string;
}

export const HERO_STATS: Record<HeroId, HeroStats> = {
  afa: {
    name: 'Afa',
    speed: 220,
    jump: 620,
    doubleJump: true,
    special: 'shield',
    specialLabel: 'Rainbow Shield',
    cooldownMs: 8000,
    blurb: 'Jumps high, can double jump, and makes a rainbow shield.',
  },
  terdoo: {
    name: 'Terdoo',
    speed: 280,
    jump: 540,
    doubleJump: false,
    special: 'dash',
    specialLabel: 'Turbo Dash',
    cooldownMs: 3000,
    blurb: 'Super fast, small enough for tiny tunnels, and can turbo dash.',
  },
};

export const GRAVITY = 1400;
export const SPRING_VELOCITY = 900;
export const SHIELD_MS = 3000;
export const DASH_MS = 400;
export const DASH_SPEED = 600;
export const HURT_GRACE_MS = 1500;
export const BOSS_HITS = 3;

export interface DifficultyRules {
  hearts: number;
  enemySpeed: number;
  /** Little Explorer lets both heroes double jump. */
  everyoneDoubleJumps: boolean;
  showTimer: boolean;
  bossDropMs: number;
}

export const DIFFICULTY_RULES: Record<Difficulty, DifficultyRules> = {
  'little-explorer': { hearts: 5, enemySpeed: 0.6, everyoneDoubleJumps: true, showTimer: false, bossDropMs: 2600 },
  adventurer: { hearts: 3, enemySpeed: 1, everyoneDoubleJumps: false, showTimer: false, bossDropMs: 1800 },
  'super-hero': { hearts: 3, enemySpeed: 1.3, everyoneDoubleJumps: false, showTimer: true, bossDropMs: 1200 },
};

export const POWER_UP_MS: Record<PowerUpKind, number> = {
  shield: 10_000,
  boots: 10_000,
  superjump: 10_000,
  magnet: 10_000,
  heart: 0,
  flight: 8_000,
};

export const POWER_UP_NAMES: Record<PowerUpKind, string> = {
  shield: 'Rainbow Shield',
  boots: 'Speed Boots',
  superjump: 'Super Jump',
  magnet: 'Star Magnet',
  heart: 'Extra Heart',
  flight: 'Fairy Wings',
};

export function canDoubleJump(hero: HeroId, difficulty: Difficulty): boolean {
  return HERO_STATS[hero].doubleJump || DIFFICULTY_RULES[difficulty].everyoneDoubleJumps;
}

export interface LevelOutcome {
  starsCollected: number;
  starsTotal: number;
  crystal: boolean;
  secret: boolean;
}

/** 1 star for finishing, +1 for most of the stars, +1 for the rainbow crystal. Never zero. */
export function rateLevel(o: LevelOutcome): number {
  let rating = 1;
  if (o.starsTotal === 0 || o.starsCollected / o.starsTotal >= 0.7) rating++;
  if (o.crystal) rating++;
  return rating;
}

export const CHEERS = [
  'Amazing adventure!',
  'You did it, hero!',
  'Rainbow-tastic!',
  'What a great explorer!',
  'Super job!',
];

export const GENTLE = ['Great try!', 'Almost! Let’s try again.', 'You can do it!', 'Nice going, keep exploring!'];

export function pick<T>(list: T[], seed: number): T {
  return list[Math.abs(Math.floor(seed)) % list.length];
}

/** A checkpoint run the player can resume. */
export interface ResumePoint {
  levelId: string;
  hero: HeroId;
  checkpoint: { x: number; y: number };
  collected: string[];
  crystal: boolean;
  secret: boolean;
  elapsedMs: number;
  savedAt: number;
}

export interface LevelRecord {
  rating: number;
  crystal: boolean;
  secret: boolean;
  bestTimeMs?: number;
}

/** Per-profile saved progress. */
export interface AfaProgress {
  version: 1;
  levels: Record<string, LevelRecord>;
  heroesUsed: HeroId[];
  worldsVisited: string[];
  resume?: ResumePoint;
}

export const EMPTY_PROGRESS: AfaProgress = { version: 1, levels: {}, heroesUsed: [], worldsVisited: [] };

/** World 1 is always open; each next world opens once the one before it is finished. */
export function isUnlocked(progress: AfaProgress, levelId: string): boolean {
  const i = LEVELS.findIndex((l) => l.id === levelId);
  if (i <= 0) return i === 0;
  return !!progress.levels[LEVELS[i - 1].id];
}

export interface FinishInput extends LevelOutcome {
  levelId: string;
  hero: HeroId;
  elapsedMs: number;
}

/** Merge a finished level into progress, keeping the best results. Clears the resume point. */
export function recordFinish(progress: AfaProgress, f: FinishInput): AfaProgress {
  const prev = progress.levels[f.levelId];
  const rating = rateLevel(f);
  const best: LevelRecord = {
    rating: Math.max(rating, prev?.rating ?? 0),
    crystal: f.crystal || !!prev?.crystal,
    secret: f.secret || !!prev?.secret,
    bestTimeMs: prev?.bestTimeMs ? Math.min(prev.bestTimeMs, f.elapsedMs) : f.elapsedMs,
  };
  return {
    ...progress,
    levels: { ...progress.levels, [f.levelId]: best },
    resume: progress.resume?.levelId === f.levelId ? undefined : progress.resume,
  };
}

export function recordStart(progress: AfaProgress, levelId: string, hero: HeroId): AfaProgress {
  return {
    ...progress,
    heroesUsed: progress.heroesUsed.includes(hero) ? progress.heroesUsed : [...progress.heroesUsed, hero],
    worldsVisited: progress.worldsVisited.includes(levelId) ? progress.worldsVisited : [...progress.worldsVisited, levelId],
  };
}

/** Achievements earned from saved progress (in addition to in-level ones like springs). */
export function progressAchievements(p: AfaProgress): string[] {
  const out = ['first-adventure'];
  if (p.heroesUsed.includes('afa') && p.heroesUsed.includes('terdoo')) out.push('teamwork-hero');
  if (LEVELS.every((l) => p.worldsVisited.includes(l.id))) out.push('world-explorer');
  if (Object.values(p.levels).some((l) => l.crystal)) out.push('rainbow-collector');
  if (Object.values(p.levels).some((l) => l.secret)) out.push('secret-discoverer');
  return out;
}

export function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
