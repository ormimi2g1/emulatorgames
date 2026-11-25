import type { Difficulty } from '../../data/types';

export interface Vec {
  x: number;
  y: number;
}

/** A looping track: center line points, built from a smooth closed curve. */
export function makeTrack(n = 120): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: 1100 * Math.cos(t), y: 620 * Math.sin(t) + 200 * Math.sin(2 * t) };
  });
}

export const TRACK = makeTrack();
export const TRACK_WIDTH = 220;
/** Waypoint indices with a boost pad. */
export const BOOSTS = [18, 52, 86, 108];

export const RULES: Record<Difficulty, { laps: number; rivalSpeed: number; assist: number }> = {
  'little-explorer': { laps: 2, rivalSpeed: 0.72, assist: 1.6 },
  adventurer: { laps: 3, rivalSpeed: 0.86, assist: 0.6 },
  'super-hero': { laps: 3, rivalSpeed: 0.97, assist: 0 },
};

export const MAX_SPEED = 430;
const SEG = (() => {
  const lens = TRACK.map((p, i) => Math.hypot(TRACK[(i + 1) % TRACK.length].x - p.x, TRACK[(i + 1) % TRACK.length].y - p.y));
  return { lens, total: lens.reduce((a, b) => a + b, 0) };
})();

export function nearestIndex(p: Vec): { index: number; dist: number } {
  let index = 0;
  let dist = Infinity;
  TRACK.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < dist) {
      dist = d;
      index = i;
    }
  });
  return { index, dist };
}

/** Position and heading at a distance along the center line, with a sideways offset. */
export function pointAt(s: number, offset = 0): { p: Vec; angle: number } {
  let d = ((s % SEG.total) + SEG.total) % SEG.total;
  let i = 0;
  while (d > SEG.lens[i]) d -= SEG.lens[i++];
  const a = TRACK[i];
  const b = TRACK[(i + 1) % TRACK.length];
  const f = d / SEG.lens[i];
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return { p: { x: a.x + (b.x - a.x) * f - Math.sin(angle) * offset, y: a.y + (b.y - a.y) * f + Math.cos(angle) * offset }, angle };
}

export interface Racer {
  name: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  /** Waypoints passed in total, including laps (monotonic for fair ranking). */
  progress: number;
  finishedAt?: number;
}

export type KartEvent = { type: 'boost' } | { type: 'lap'; lap: number } | { type: 'finish'; place: number } | { type: 'bump' };

export class Race {
  player: Racer;
  rivals: Racer[];
  private rivalS: number[];
  t = 0;
  boostUntil = 0;
  lastIndex = 0;
  offTrack = false;
  laps: number;
  readonly rules: (typeof RULES)[Difficulty];

  constructor(difficulty: Difficulty) {
    this.rules = RULES[difficulty];
    this.laps = this.rules.laps;
    const start = pointAt(-70);
    this.player = { name: 'You', color: '#ffd54a', x: start.p.x, y: start.p.y, angle: start.angle, speed: 0, progress: 0 };
    this.rivalS = [-40, -110];
    this.rivals = [
      { name: 'Bubbles', color: '#ff686b', x: 0, y: 0, angle: 0, speed: 0, progress: 0 },
      { name: 'Zippy', color: '#38bdf8', x: 0, y: 0, angle: 0, speed: 0, progress: 0 },
    ];
    this.placeRivals();
    this.lastIndex = nearestIndex(this.player).index;
  }

  get lap() {
    return Math.min(this.laps, Math.floor(this.player.progress / TRACK.length) + 1);
  }

  get finished() {
    return this.player.finishedAt !== undefined;
  }

  place(): number {
    return 1 + this.rivals.filter((r) => (r.finishedAt ?? Infinity) < (this.player.finishedAt ?? Infinity) || (!this.finished && r.progress > this.player.progress)).length;
  }

  private placeRivals() {
    this.rivals.forEach((r, i) => {
      const { p, angle } = pointAt(this.rivalS[i], i === 0 ? -50 : 50);
      r.x = p.x;
      r.y = p.y;
      r.angle = angle;
      r.progress = (this.rivalS[i] / SEG.total) * TRACK.length;
    });
  }

  /** steer: -1 left, 1 right. */
  step(dt: number, steer: number): KartEvent[] {
    const ev: KartEvent[] = [];
    this.t += dt;
    const p = this.player;
    const total = this.laps * TRACK.length;
    if (!this.finished) {
      // Gentle steering assist toward the road for younger players.
      const near = nearestIndex(p);
      const ahead = TRACK[(near.index + 4) % TRACK.length];
      const want = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      let diff = want - p.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      p.angle += (steer * 2.6 + diff * this.rules.assist) * dt;
      this.offTrack = near.dist > TRACK_WIDTH / 2;
      const boosting = this.boostUntil > this.t;
      const cap = (this.offTrack ? 0.45 : 1) * MAX_SPEED * (boosting ? 1.45 : 1);
      p.speed += (cap - p.speed) * Math.min(1, dt * (p.speed > cap ? 4 : 1.2));
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      // Progress along the loop
      const idx = nearestIndex(p).index;
      let delta = idx - this.lastIndex;
      if (delta > TRACK.length / 2) delta -= TRACK.length;
      if (delta < -TRACK.length / 2) delta += TRACK.length;
      const lapBefore = this.lap;
      p.progress = Math.max(0, p.progress + delta);
      this.lastIndex = idx;
      if (this.lap > lapBefore) ev.push({ type: 'lap', lap: this.lap });
      if (!boosting && BOOSTS.some((b) => Math.abs(b - idx) <= 1) && !this.offTrack) {
        this.boostUntil = this.t + 1.2;
        ev.push({ type: 'boost' });
      }
      if (p.progress >= total) {
        p.finishedAt = this.t;
        ev.push({ type: 'finish', place: this.place() });
      }
    }
    this.rivals.forEach((r, i) => {
      if (r.finishedAt !== undefined) return;
      const wobble = 1 + 0.06 * Math.sin(this.t * 0.7 + i * 2);
      this.rivalS[i] += MAX_SPEED * this.rules.rivalSpeed * wobble * dt * Math.min(1, this.t / 2);
      this.placeRivals();
      if (r.progress >= total) r.finishedAt = this.t;
    });
    return ev;
  }
}

export function rateRace(place: number): number {
  return place === 1 ? 3 : place === 2 ? 2 : 1;
}
